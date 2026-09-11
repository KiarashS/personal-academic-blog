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
    `glyph ${index}: ${result.pixelCount} skeleton pixels → ${result.strokes.length} stroke(s)`,
  );
}
await browser.close();

const parts = strokes.map((stroke) => {
  // A short closed loop — the dot on an `i` — is the one thing RDP will flatten
  // to a single point, and a path of no length is drawn instantly and so is on
  // screen before the pen reaches it. Anything it empties out is decimated
  // evenly instead, which keeps a length to travel.
  let thinned = simplify(stroke, TOLERANCE);
  if (thinned.length < 4 && stroke.length >= 8) {
    const step = Math.max(1, Math.floor(stroke.length / 8));
    thinned = stroke.filter((_, i) => i % step === 0);
  }
  return toBezier(thinned);
});

// One element per stroke, not one path of many subpaths: an SVG dash pattern
// restarts at every subpath, so a single path would uncover all of them at once.
const pens = parts
  .map(
    (d) =>
      `<path class="ks-pen" fill="none" stroke="#fff" stroke-width="${MASK_WIDTH}" ` +
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

console.log(`\n${parts.length} strokes written to ${FILE}`);

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

      /** How far the skeleton runs beyond this step, for ordering branches. */
      const depth = (node, from, within, budget = 400) => {
        const seen = new Set([from, node]);
        const queue = [node];
        let count = 0;
        for (let i = 0; i < queue.length && count < budget; i += 1) {
          count += 1;
          for (const n of neighbours(queue[i])) {
            if (!within.has(n) || seen.has(n)) continue;
            seen.add(n);
            queue.push(n);
          }
        }
        return count;
      };

      /**
       * Every edge of the piece, once each, as a list of forward runs.
       *
       * The longest path through the skeleton is not enough: the K is a tree
       * with several long limbs, and taking the two farthest apart left its
       * descender and its upper swash untraced — which for a mask means those
       * parts of the letter are never revealed at all.
       *
       * Walking every edge covers the letter but retraces, and a pen that
       * retraces reveals nothing while it does, which reads as a stall. So each
       * forward run becomes a subpath of its own and the backtracks are simply
       * dropped: a dash animation crossing from one subpath to the next uncovers
       * nothing in between, which is exactly what a jump should look like.
       *
       */
      const cover = (from, within) => {
        const used = new Set();
        const edge = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
        const runs = [];
        let run = [from];

        /*
         * The depth-first walk, with its own stack rather than the engine's.
         *
         * Written as a recursive function it goes one frame deep per skeleton
         * pixel, and a glyph with a long swash is tens of thousands of pixels
         * in a single component: a capital whose flourish sweeps under the
         * whole word overflowed the stack outright. A frame here is a node, the
         * edges leaving it in the order they will be taken, and how far through
         * them the walk is.
         */
        const step = (start) => {
          const stack = [{ node: start, edges: null, taken: 0, first: true }];
          while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            if (frame.edges === null) {
              // Short limbs before long ones, so the walk ends at the far end
              // of the longest, which in a signature is where the next letter
              // starts. Measured when the node is reached, not before.
              frame.edges = neighbours(frame.node)
                .filter((n) => within.has(n) && !used.has(edge(frame.node, n)))
                .map((n) => ({ n, d: depth(n, frame.node, within) }))
                .sort((a, b) => a.d - b.d)
                .map((entry) => entry.n);
            }
            if (frame.taken >= frame.edges.length) {
              stack.pop();
              continue;
            }
            const n = frame.edges[frame.taken];
            frame.taken += 1;
            if (used.has(edge(frame.node, n))) continue;
            used.add(edge(frame.node, n));
            // Carrying on from where the pen is continues the run; anything
            // else is a fresh stroke starting at this junction.
            if (!frame.first) {
              runs.push(run);
              run = [frame.node];
            }
            frame.first = false;
            run.push(n);
            stack.push({ node: n, edges: null, taken: 0, first: true });
          }
        };

        step(from);
        runs.push(run);
        return runs.filter((r) => r.length > 1);
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
          runs: cover(start, component).map((run) =>
            run.map((k) => {
              const x = k % W,
                y = (k - (k % W)) / W;
              return [vx + x / SCALE, vy + y / SCALE];
            }),
          ),
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
