import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

/*
 * Derives the pen path for a signature drawing and writes it back into the
 * file, replacing whatever is there.
 *
 *   node scripts/trace-signature.mjs [file.svg] [mask width]
 *   node scripts/trace-signature.mjs src/content/signature-typeset.svg 30
 *
 * Run it when the signature artwork changes, including after
 * `scripts/set-signature.mjs` has set a name in a new font. Nothing in
 * `npm run build` calls it: the path it produces is committed, and deriving it
 * needs a browser.
 *
 * Why it exists. The glyphs are filled outlines — closed shapes traced from
 * handwriting — so they cannot be drawn stroke-wise: a dash animation on one
 * would trace around the letter's contour rather than through it. What can be
 * drawn is a centreline, and `Signature.tsx` uses one as a mask, revealing the
 * filled letters along the line a hand would take.
 *
 * There is no centreline in the artwork, so this makes one: each glyph is
 * rasterised, thinned to a one-pixel skeleton, and walked. The result is a
 * `<mask>` of one path per stroke, which the component animates in order.
 *
 * It is a derivation from a drawing, not a transcription of one. The order
 * within a letter is the walk's, not a hand's, and a mask wide enough to cover
 * the thickest stroke will uncover a neighbouring stroke that passes close to
 * it. Look at the result before committing it.
 */

/** Pixels per user unit while thinning. Higher is slower and no more faithful. */
const SCALE = 6;

/**
 * How wide the mask has to be stroked to cover the letters it reveals. It
 * belongs to the artwork, not to this script: the right value is the narrowest
 * that leaves no ink behind, and a face with thicker strokes needs more. Pass
 * it as the second argument when tracing something new.
 */
const MASK_WIDTH = Number(process.argv[3]) || 26;

/** How far a simplified curve may stray from the traced one, in user units. */
const TOLERANCE = 0.5;

const FILE = process.argv[2] || 'src/content/signature.svg';

/** Ramer–Douglas–Peucker: drops points the curve does not need. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

const round = (n) => Number(n.toFixed(2));

/** Catmull-Rom through the points, written as cubic beziers. */
function toBezier(points) {
  if (points.length < 2) return '';
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
  }
  return d;
}

const svg = await readFile(FILE, 'utf8');
const view = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number);
const glyphs = [...svg.matchAll(/<path[^>]*class="ks-glyph"[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
if (glyphs.length === 0) throw new Error(`no .ks-glyph paths in ${FILE}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const strokes = [];
for (const [index, d] of glyphs.entries()) {
  const result = await trace(page, d, view);
  for (const stroke of result.strokes) strokes.push(stroke);
  console.log(
    `glyph ${index}: ${result.pixelCount} skeleton pixels → ${result.strokes.length} run(s), ` +
      `${result.strokes.filter((stroke) => stroke.retrace).length} of them retracing`,
  );
}
await browser.close();

const parts = strokes.map((stroke) => {
  // A short closed loop — the dot on an `i` — is the one thing RDP will flatten
  // to a single point, and a path of no length is drawn instantly and so is on
  // screen before the pen reaches it. Anything it empties out is decimated
  // evenly instead, which keeps a length to travel.
  let thinned = simplify(stroke.points, TOLERANCE);
  if (thinned.length < 4 && stroke.points.length >= 8) {
    const step = Math.max(1, Math.floor(stroke.points.length / 8));
    thinned = stroke.points.filter((_, i) => i % step === 0);
  }
  return { d: toBezier(thinned), retrace: stroke.retrace };
});

/*
 * One element per run, not one path of many subpaths: an SVG dash pattern
 * restarts at every subpath, so a single path would uncover all of them at once.
 *
 * Consecutive runs share an endpoint, so the reveal hands over from one to the
 * next without moving — the whole letter is one journey, split only so that the
 * retraces can be spent faster than the writing. `data-retrace` is how
 * `Signature.tsx` tells them apart.
 */
const pens = parts
  .map(
    ({ d, retrace }) =>
      `<path class="ks-pen"${retrace ? ' data-retrace="true"' : ''} fill="none" ` +
      `stroke="#fff" stroke-width="${MASK_WIDTH}" ` +
      `stroke-linecap="round" stroke-linejoin="round" d="${d}"></path>`,
  )
  .join('');

/*
 * The region is spelled out rather than left to default to it.
 *
 * A mask with no x/y/width/height gets -10%,-10%,120%,120%, and under
 * `userSpaceOnUse` those percentages are of the viewport but measured from user
 * space's own origin — not from the viewBox's. A drawing whose viewBox starts
 * at a negative y therefore has everything above the default region masked
 * away: a name set from a font, whose baseline is y=0 and whose letters are all
 * above it, loses two thirds of itself. The viewBox is the region that is
 * always right.
 */
const [vx, vy, vw, vh] = view;
let next = svg.replace(/<mask id="ks-write".*?<\/mask>/s, '');
next = next.replace(
  '</defs>',
  `<mask id="ks-write" maskUnits="userSpaceOnUse" x="${vx}" y="${vy}" ` +
    `width="${vw}" height="${vh}">${pens}</mask></defs>`,
);
next = next.replace(/\smask="url\(#ks-write\)"/g, '');
next = next.replace(/(<path class="ks-glyph")/g, '$1 mask="url(#ks-write)"');
await writeFile(FILE, next);

const writing = parts.filter((part) => !part.retrace).length;
console.log(
  `\n${parts.length} runs written to ${FILE}: ${writing} writing, ${parts.length - writing} retracing`,
);

/** Rasterises one glyph, thins it, and returns its strokes in user units. */
function trace(page, d, view) {
  return page.evaluate(
    async ({ d, view, SCALE }) => {
      const [vx, vy, vw, vh] = view;
      const W = Math.ceil(vw * SCALE);
      const H = Math.ceil(vh * SCALE);

      // Draw the glyph exactly as the page draws it: filled, plus its 1.4 stroke.
      const canvas = document.getElementById('c');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(SCALE, 0, 0, SCALE, -vx * SCALE, -vy * SCALE);
      const path = new Path2D(d);
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.4;
      ctx.fill(path);
      ctx.stroke(path);

      const data = ctx.getImageData(0, 0, W, H).data;
      let on = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i += 1) on[i] = data[i * 4 + 3] > 128 ? 1 : 0;

      // Zhang-Suen thinning, to a skeleton one pixel wide.
      const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : on[y * W + x]);
      const pass = (step) => {
        const doomed = [];
        for (let y = 1; y < H - 1; y += 1) {
          for (let x = 1; x < W - 1; x += 1) {
            if (!at(x, y)) continue;
            const p = [
              at(x, y - 1),
              at(x + 1, y - 1),
              at(x + 1, y),
              at(x + 1, y + 1),
              at(x, y + 1),
              at(x - 1, y + 1),
              at(x - 1, y),
              at(x - 1, y - 1),
            ];
            const b = p.reduce((s, v) => s + v, 0);
            if (b < 2 || b > 6) continue;
            let a = 0;
            for (let i = 0; i < 8; i += 1) if (p[i] === 0 && p[(i + 1) % 8] === 1) a += 1;
            if (a !== 1) continue;
            const [n, , e, , s2, , w] = p; // the four orthogonal neighbours
            if (
              step === 0
                ? n * e * s2 !== 0 || e * s2 * w !== 0
                : n * e * w !== 0 || n * s2 * w !== 0
            )
              continue;
            doomed.push(y * W + x);
          }
        }
        for (const i of doomed) on[i] = 0;
        return doomed.length;
      };
      for (let i = 0; i < 200; i += 1) {
        const removed = pass(0) + pass(1);
        if (removed === 0) break;
      }

      // The skeleton as a graph, 8-connected.
      const pixels = [];
      for (let y = 0; y < H; y += 1)
        for (let x = 0; x < W; x += 1) if (on[y * W + x]) pixels.push([x, y]);
      const key = (x, y) => y * W + x;
      const set = new Set(pixels.map(([x, y]) => key(x, y)));
      /**
       * Neighbours of a skeleton pixel, minus the diagonals two orthogonal
       * steps already cover.
       *
       * A thinned curve running at an angle is a staircase, and taking all
       * eight neighbours makes every step of it a little triangle — three
       * mutually adjacent pixels. To the walk below each triangle is a
       * junction, which is why one letter came out as five hundred subpaths.
       * Dropping the redundant diagonal leaves a graph that is actually a
       * curve.
       */
      const neighbours = (k) => {
        const x = k % W,
          y = (k - (k % W)) / W;
        const out = [];
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            if (!set.has(key(x + dx, y + dy))) continue;
            if (dx && dy && (set.has(key(x + dx, y)) || set.has(key(x, y + dy)))) continue;
            out.push(key(x + dx, y + dy));
          }
        return out;
      };

      /**
       * Thinning leaves whiskers: two or three pixels hanging off the skeleton
       * wherever the outline had a bump. Each one is a branch to the walk
       * below, which turned one letter into hundreds of subpaths. A branch
       * shorter than a few user units is noise and is cut back, repeatedly,
       * because cutting one can expose another.
       */
      const prune = (minimum) => {
        for (let round = 0; round < 40; round += 1) {
          const ends = [...set].filter((k) => neighbours(k).length === 1);
          let cut = 0;
          for (const end of ends) {
            if (!set.has(end)) continue;
            const branch = [end];
            let node = end;
            let previous = -1;
            for (;;) {
              const next = neighbours(node).filter((n) => n !== previous);
              if (next.length !== 1) break; // a junction, or the end
              previous = node;
              node = next[0];
              branch.push(node);
              if (branch.length > minimum) break;
            }
            if (branch.length <= minimum && neighbours(node).length > 2) {
              for (const k of branch.slice(0, -1)) set.delete(k);
              cut += 1;
            }
          }
          if (cut === 0) break;
        }
      };
      prune(Math.round(4 * SCALE));

      const reach = (from) => {
        const seen = new Set([from]);
        const queue = [from];
        for (let i = 0; i < queue.length; i += 1) {
          for (const n of neighbours(queue[i]))
            if (!seen.has(n)) {
              seen.add(n);
              queue.push(n);
            }
        }
        return seen;
      };

      /** A skeleton key back to its x,y. */
      const pixel = (k) => [k % W, (k - (k % W)) / W];

      /** How far ahead to look when judging a direction, in skeleton pixels. */
      const LOOK = Math.round(5 * SCALE);

      /**
       * The direction the skeleton takes if the pen steps from `from` to `node`
       * and keeps going, as a unit vector.
       *
       * Judged LOOK pixels out rather than from the step itself: a step to one
       * of eight neighbours can only point eight ways, which is far too coarse
       * to tell two branches of a crossing apart. The frontier is averaged
       * because a branch that itself forks within the lookahead should read as
       * the direction of the fan, not of whichever twig was found first.
       */
      const heading = (from, node, within) => {
        const seen = new Set([from, node]);
        let frontier = [node];
        for (let step = 0; step < LOOK && frontier.length > 0; step += 1) {
          const next = [];
          for (const k of frontier)
            for (const n of neighbours(k)) {
              if (!within.has(n) || seen.has(n)) continue;
              seen.add(n);
              next.push(n);
            }
          if (next.length > 0) frontier = next;
          else break;
        }
        const [ox, oy] = pixel(from);
        let sx = 0;
        let sy = 0;
        for (const k of frontier) {
          const [x, y] = pixel(k);
          sx += x - ox;
          sy += y - oy;
        }
        const length = Math.hypot(sx, sy) || 1;
        return [sx / length, sy / length];
      };

      /**
       * Every edge of the piece, once each, as one unbroken journey.
       *
       * The pen is never picked up and put down somewhere else. That is the
       * whole point: a letter is a hand moving, and a mask that jumps to a
       * fresh place mid-letter reads as a letter assembling out of parts rather
       * than being written. The previous walk dropped its backtracks, which is
       * exactly such a jump — a capital came out as four pieces landing in four
       * places.
       *
       * So the backtracks are kept and marked. Going back over a stroke already
       * on the page uncovers nothing, so it is travel rather than writing, and
       * `Signature.tsx` spends proportionally less time on it — which is also
       * what a hand does, moving faster over a line it has already laid down
       * than over one it is drawing.
       *
       * At a junction the walk carries straight on rather than turning. Where a
       * letter crosses itself the two strokes are separate motions of the hand,
       * and turning the corner there is what a pen never does.
       */
      const tour = (from, within) => {
        const used = new Set();
        const edge = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

        const runs = [];
        let run = { points: [from], retrace: false };
        const emit = (node, retrace) => {
          if (retrace !== run.retrace) {
            if (run.points.length > 1) runs.push(run);
            run = { points: [run.points[run.points.length - 1]], retrace };
          }
          run.points.push(node);
        };

        // The pen's recent trail, which is where its current direction comes
        // from. The DFS stack is the route back to the start, not the route the
        // pen took, so it is the wrong thing to measure a direction against
        // once the walk has backtracked even once.
        const trail = [from];
        const direction = () => {
          if (trail.length < 2) return null;
          const [ax, ay] = pixel(trail[0]);
          const [bx, by] = pixel(trail[trail.length - 1]);
          const dx = bx - ax;
          const dy = by - ay;
          const length = Math.hypot(dx, dy);
          return length > 0 ? [dx / length, dy / length] : null;
        };
        const advance = (node) => {
          trail.push(node);
          if (trail.length > LOOK) trail.shift();
        };

        const stack = [from];
        while (stack.length > 0) {
          const node = stack[stack.length - 1];
          const open = neighbours(node).filter((n) => within.has(n) && !used.has(edge(node, n)));

          if (open.length === 0) {
            stack.pop();
            if (stack.length === 0) break;
            const back = stack[stack.length - 1];
            advance(back);
            emit(back, true);
            continue;
          }

          let next = open[0];
          const came = direction();
          if (open.length > 1 && came) {
            let best = -Infinity;
            for (const candidate of open) {
              const [dx, dy] = heading(node, candidate, within);
              const score = dx * came[0] + dy * came[1];
              if (score > best) {
                best = score;
                next = candidate;
              }
            }
          }

          used.add(edge(node, next));
          advance(next);
          emit(next, false);
          stack.push(next);
        }

        if (run.points.length > 1) runs.push(run);
        return runs;
      };

      /**
       * Runs too short to see, folded into the one after them.
       *
       * A backtrack of two pixels between two branches of the same junction is
       * a run of its own out of the walk above, and as an element of its own it
       * would be handed a few milliseconds and flash. Runs are contiguous — each
       * begins where the last ended — so folding one forward is just dropping
       * the boundary.
       */
      const MIN_RUN = Math.round(14 * SCALE);
      const settle = (runs) => {
        const out = [];
        for (const current of runs) {
          const previous = out[out.length - 1];
          if (previous && previous.points.length < MIN_RUN) {
            previous.points.push(...current.points.slice(1));
            /*
             * A merged run counts as retracing only if both halves did, so that
             * no edge the pen actually wrote ever ends up inside a run marked
             * as a retrace. The trim below drops trailing retraces outright,
             * and it may only do that safely because every retraced edge is
             * guaranteed to appear in some earlier writing run. Labelling a
             * short write as a retrace because it was folded into one broke
             * that: the trim took the ink with it, and 3,201 pixels of the name
             * stopped being revealed at all.
             */
            previous.retrace = previous.retrace && current.retrace;
            continue;
          }
          out.push({ points: [...current.points], retrace: current.retrace });
        }
        // A short tail has nothing after it to fold into, so it folds backwards.
        if (out.length > 1 && out[out.length - 1].points.length < MIN_RUN) {
          const tail = out.pop();
          out[out.length - 1].points.push(...tail.points.slice(1));
        }

        /*
         * Nothing after the last of the writing.
         *
         * A depth-first walk ends by unwinding its stack all the way back to
         * where it started, and every one of those steps is a retrace over
         * finished work. Left in, each letter spends its last moments walking
         * home — and the word as a whole finishes writing and then carries on
         * running with nothing to show. The pen stops where it stopped writing.
         */
        while (out.length > 0 && out[out.length - 1].retrace) out.pop();
        return out;
      };

      const unvisited = new Set(set);
      const pieces = [];
      while (unvisited.size > 0) {
        const seed = unvisited.values().next().value;
        const component = reach(seed);
        for (const k of component) unvisited.delete(k);
        if (component.size < 12) continue; // a speck, not a stroke

        // Start where a hand would: the leftmost loose end, or the leftmost
        // pixel if the piece is a closed loop like the dot on an i.
        const ends = [...component].filter(
          (k) => neighbours(k).filter((n) => component.has(n)).length === 1,
        );
        const candidates = ends.length > 0 ? ends : [...component];
        const start = candidates.reduce((best, k) => (k % W < best % W ? k : best));

        pieces.push({
          size: component.size,
          runs: settle(tour(start, component)).map((run) => ({
            retrace: run.retrace,
            points: run.points.map((k) => {
              const [x, y] = pixel(k);
              return [vx + x / SCALE, vy + y / SCALE];
            }),
          })),
        });
      }

      // The body of the letter before the marks that finish it: the stem of an
      // `i` is written and then dotted, and the dot arriving first — which is
      // what the order they were found in gave — looks like neither.
      pieces.sort((a, b) => b.size - a.size);
      const strokes = pieces.flatMap((piece) => piece.runs);

      return { strokes, pixelCount: pixels.length };
    },
    { d, view, SCALE },
  );
}
