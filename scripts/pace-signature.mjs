import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

/*
 * Puts a traced signature's pen in the order a hand would write it, and gives
 * it the pace of the "hello" Apple shows when a Mac or an iPhone is first
 * switched on.
 *
 *   node scripts/pace-signature.mjs src/content/signature-sacramento.svg
 *
 * It runs last, on the output of `trace-signature.mjs`, and needs that output
 * fresh: the plan below names the tracer's runs by their position in the mask.
 * The full sequence for the Sacramento drawing:
 *
 *   node scripts/set-signature.mjs Sacramento-Regular.ttf Kiarash src/content/signature-sacramento.svg 3
 *   node scripts/trace-signature.mjs src/content/signature-sacramento.svg 12
 *   node scripts/pace-signature.mjs src/content/signature-sacramento.svg
 *
 * Sacramento is by Brian J. Bonislawsky (Astigmatic), released under the SIL
 * Open Font License 1.1 and available from Google Fonts. As with the other
 * typeset signature, only the outlines of the seven letters ship, not the font.
 *
 * Two things, in that order.
 *
 * The order. The tracer walks each glyph's skeleton from wherever the walk
 * happens to start, so a K comes out foot first and an h from its exit stroke
 * backwards. A plan, written per drawing by looking at the runs, lists the
 * pieces of those runs in writing order: which run, from which point on it to
 * which, and whether the pen is only travelling back over ink already down.
 * Pieces that follow each other in a stroke share a point, so the stroke is
 * one movement; a new stroke is the pen lifting.
 *
 * The pace. Apple's "hello" does not move at one speed: it slows into every
 * turn and runs along the straights. That is the two-thirds power law from the
 * motor-control literature (Lacquaniti, Terzuolo and Viviani, 1983): a hand
 * moves along a curve at a speed proportional to the cube root of its radius.
 * Each stroke also starts from rest and comes to rest, and travel back over
 * ink already down goes at three times the speed, since nothing new appears.
 * The result is written onto each `.ks-pen` as `data-at` and `data-ms`, when
 * it starts and how long it takes, and `data-pace`, the share of its length
 * drawn at each of PACE_STEPS equal moments. `Signature.tsx` plays a drawing
 * that has them on that timetable.
 */

const FILE = process.argv[2] || 'src/content/signature-sacramento.svg';

// Time spent with the pen down, shared out by how long each stroke takes.
const WRITE_MS = 4400;
// Pen up, moved, and down again.
const LIFT_MS = 240;
// The pause after the name before the swash, and how long the swash takes.
const SWASH_LIFT_MS = 320;
const SWASH_MS = 650;
// How much faster the pen goes back over its own ink.
const TRAVEL = 3;
const PACE_STEPS = 32;

/*
 * The plans. A piece is [run, from, to] or [run, from, to, 'retrace']; `from`
 * and `to` are points in the drawing's units, snapped to the nearest knot of
 * that run, or 'start' and 'end'. A plan is a list of strokes, and the width
 * of the swash drawn under the name once it is written.
 */
const plans = {
  'signature-sacramento.svg': {
    swash: 5,
    strokes: [
      // K: the swash in from its curled tail, across the top to the tip, back
      // and down the stem to the junction, and on down to the foot.
      [
        [6, 'end', 'start'],
        [5, 'end', 'start'],
        [4, 'end', 'start'],
        [0, [86.3, -60.8], 'start'],
      ],
      // K: the arms, from the tip down to the stem and out along the leg.
      [
        [0, 'end', [116, -59]],
        [0, [116, -59], [86.3, -60.8]],
        [0, [86.3, -60.8], [116, -59], 'retrace'],
        [2, 'start', 'end'],
      ],
      // i, and the join into the a.
      // a: round the bowl clockwise from where the join meets it, back over
      // the top, down and round the bottom, up the stem and away to the r.
      // r: up into its loop, over the shoulder, down, and the join to the a.
      // a: as the first.
      // s: up its left side to the point, down the belly, round the foot and
      // back, and the join to the h.
      // h: the whole letter, which the tracer walked backwards.
      [
        [7, 'start', 'end'],
        [11, [257.7, -26.2], 'end'],
        [11, 'end', [257.7, -26.2], 'retrace'],
        [11, [257.7, -26.2], 'start'],
        [9, [284.3, -12.5], 'start'],
        [9, 'start', [284.3, -12.5], 'retrace'],
        [9, [284.3, -12.5], 'end'],
        [12, 'start', 'end'],
        [14, 'start', 'end'],
        [17, [377.2, -26.3], 'end'],
        [17, 'end', [377.2, -26.3], 'retrace'],
        [17, [377.2, -26.3], 'start'],
        [15, [403.5, -12.5], 'start'],
        [15, 'start', [403.5, -12.5], 'retrace'],
        [15, [403.5, -12.5], 'end'],
        [22, [440.3, -26.2], 'start'],
        [20, [446.8, -35.5], 'end'],
        [20, 'end', [446.8, -35.5], 'retrace'],
        [20, [446.8, -35.5], 'start'],
        [18, [453.2, -1.7], 'start'],
        [22, 'end', [440.3, -26.2]],
        [22, [440.3, -26.2], 'end', 'retrace'],
        [18, 'start', [453.2, -1.7], 'retrace'],
        [18, [453.2, -1.7], 'end'],
        [23, 'end', 'start'],
      ],
      // The dot, last.
      [[8, 'start', 'end']],
    ],
  },

  // node scripts/set-signature.mjs Damion-Regular.ttf Kiarash src/content/signature-damion.svg
  // node scripts/trace-signature.mjs src/content/signature-damion.svg 22
  'signature-damion.svg': {
    swash: 6,
    strokes: [
      // K: the stem from the top down to its curled foot.
      [[0, 'end', 'start']],
      // K: the arm down to the stem, and the leg out.
      [
        [2, 'end', 'start'],
        [4, 'start', 'end'],
      ],
      // i, and the join into the a.
      // a: up its left side and over to the top, back, down and round the
      // bottom, up the stem and down again, and away to the r.
      // r: down the little foot its join leaves and back, up and over the top,
      // down its right side, and the join to the a.
      // a: as the first, and its join towards the s.
      [
        [5, 'start', 'end'],
        [9, [196.4, -29.3], 'end'],
        [9, 'end', [196.4, -29.3], 'retrace'],
        [9, [196.4, -29.3], 'start'],
        [7, [241.5, -25.6], 'start'],
        [7, 'start', [241.5, -25.6], 'retrace'],
        [7, [241.5, -25.6], 'end'],
        [12, [282.4, -29.4], 'end'],
        [12, 'end', [282.4, -29.4], 'retrace'],
        [12, [282.4, -29.4], 'start'],
        [10, [326.2, -47.9], 'end'],
        [15, [358, -31.8], 'end'],
        [15, 'end', [358, -31.8], 'retrace'],
        [15, [358, -31.8], 'start'],
        [13, [400.9, -25.6], 'start'],
        [13, 'start', [400.9, -25.6], 'retrace'],
        [13, [400.9, -25.6], 'end'],
      ],
      // s: from its hook at the top, down the belly and round to its foot.
      [
        [17, 'end', 'start'],
        [16, 'end', 'start'],
      ],
      // h: down the ascender, back up to the shoulder, over the arch and out.
      [
        [18, 'end', 'start'],
        [18, 'start', [508.7, -48.3], 'retrace'],
        [20, 'start', 'end'],
      ],
      // The dot, last.
      [[6, 'start', 'end']],
    ],
  },
};

const plan = plans[basename(FILE)];
if (!plan) throw new Error(`no plan for ${basename(FILE)}; add one to ${import.meta.url}`);

const svg = await readFile(FILE, 'utf8');
const mask = /<mask id="ks-write"[^>]*>([\s\S]*?)<\/mask>/.exec(svg);
if (!mask) throw new Error(`${FILE} has no ks-write mask; run trace-signature.mjs first`);
// The plan counts the tracer's runs, which a paced file no longer has.
if (mask[1].includes('data-pace'))
  throw new Error(`${FILE} is already paced; set and trace it again first`);
const width = /stroke-width="([^"]+)"/.exec(mask[1])[1];

// Each run as its knots and the cubic segments between them.
const runs = [...mask[1].matchAll(/<path class="ks-pen"[^>]*\sd="([^"]+)"/g)].map(([, d]) => {
  const v = d.match(/-?\d*\.?\d+/g).map(Number);
  const knots = [[v[0], v[1]]];
  const segments = [];
  for (let i = 2; i + 5 < v.length; i += 6) {
    const from = knots[knots.length - 1];
    const to = [v[i + 4], v[i + 5]];
    segments.push([from, [v[i], v[i + 1]], [v[i + 2], v[i + 3]], to]);
    knots.push(to);
  }
  return { knots, segments };
});

const nearest = (run, point) => {
  if (point === 'start') return 0;
  if (point === 'end') return run.knots.length - 1;
  let best = 0;
  run.knots.forEach(([x, y], i) => {
    const [bx, by] = run.knots[best];
    if (Math.hypot(x - point[0], y - point[1]) < Math.hypot(bx - point[0], by - point[1])) best = i;
  });
  return best;
};

// A piece as cubic segments in the direction of travel.
function piece([index, from, to]) {
  const run = runs[index];
  if (!run) throw new Error(`the plan names run ${index}, and there are ${runs.length}`);
  const a = nearest(run, from);
  const b = nearest(run, to);
  if (a <= b) return run.segments.slice(a, b);
  return run.segments
    .slice(b, a)
    .reverse()
    .map(([p0, c1, c2, p1]) => [p1, c2, c1, p0]);
}

const cubic = ([p0, c1, c2, p1], t) => {
  const u = 1 - t;
  return [0, 1].map(
    (k) => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k],
  );
};

// The radius of the circle through three points; Infinity on a straight.
function radius(a, b, c) {
  const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cross < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cross);
}

const smoothstep = (t) => {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
};

/*
 * One stroke: its pieces sampled end to end, a speed at every sample, and from
 * that the time at every sample. Speed is the cube root of the radius, measured
 * a few units either side so that the tracer's small wobbles do not count as
 * turns, held between a floor (a cusp would stop the pen dead) and a ceiling (a
 * straight would be instant), and brought down towards rest over the first and
 * last stretch of the stroke.
 */
function timeStroke(pieces) {
  const pts = [];
  pieces.forEach((p, k) => {
    for (const segment of p.segments) {
      for (let i = pts.length && pts[pts.length - 1].k === k ? 1 : 0; i <= 24; i += 1) {
        const point = cubic(segment, i / 24);
        const last = pts[pts.length - 1];
        const gap = last ? Math.hypot(point[0] - last.p[0], point[1] - last.p[1]) : 0;
        pts.push({ p: point, s: (last?.s ?? 0) + gap, k });
      }
    }
  });
  const total = pts[pts.length - 1].s || 1;
  const reach = (i, ds) => {
    let j = i;
    while (j > 0 && j < pts.length - 1 && Math.abs(pts[j].s - pts[i].s) < 4) j += ds;
    return pts[j].p;
  };
  const speed = pts.map(({ p, s, k }, i) => {
    const r = Math.min(Math.max(radius(reach(i, -1), p, reach(i, 1)), 4), 160);
    const ramp = 0.3 + 0.7 * smoothstep(s / 26) * smoothstep((total - s) / 34);
    return Math.cbrt(r) * ramp * (pieces[k].retrace ? TRAVEL : 1);
  });
  const time = [0];
  for (let i = 1; i < pts.length; i += 1) {
    const ds = pts[i].s - pts[i - 1].s;
    time.push(time[i - 1] + (2 * ds) / (speed[i] + speed[i - 1]));
  }
  return { pts, time };
}

const strokes = plan.strokes.map((spec) => {
  const pieces = [];
  for (const item of spec) {
    const segments = piece(item);
    if (segments.length === 0) continue;
    const last = pieces[pieces.length - 1];
    const end = last?.segments[last.segments.length - 1][3];
    const start = segments[0][0];
    // Where the plan steps between runs that do not quite meet, the pen moves
    // across in a straight line, and whatever ink lies under it shows.
    if (end && Math.hypot(start[0] - end[0], start[1] - end[1]) > 0.5)
      pieces.push({ segments: [[end, end, start, start]], retrace: false });
    pieces.push({ segments, retrace: item[3] === 'retrace' });
  }
  return { pieces, ...timeStroke(pieces) };
});

const penDown = strokes.reduce((sum, s) => sum + s.time[s.time.length - 1], 0);
const scale = WRITE_MS / penDown;

const n = (v) => Math.round(v * 100) / 100;
const d = (segments) =>
  `M${n(segments[0][0][0])} ${n(segments[0][0][1])}` +
  segments.map(([, c1, c2, p]) => `C${[...c1, ...c2, ...p].map(n).join(' ')}`).join('');

// The share of a stretch of samples drawn at each of PACE_STEPS equal moments.
function paceOf(own) {
  const t0 = own[0].t;
  const t1 = own[own.length - 1].t;
  const s0 = own[0].s;
  const length = own[own.length - 1].s - s0 || 1;
  const pace = [];
  let j = 0;
  for (let step = 1; step < PACE_STEPS; step += 1) {
    const goal = t0 + ((t1 - t0) * step) / PACE_STEPS;
    while (j < own.length - 2 && own[j + 1].t < goal) j += 1;
    const f = (goal - own[j].t) / (own[j + 1].t - own[j].t || 1);
    pace.push(Math.round(((own[j].s + f * (own[j + 1].s - own[j].s) - s0) / length) * 1000) / 1000);
  }
  return pace.join(' ');
}

let clock = 0;
const pens = [];
for (const { pieces, pts, time } of strokes) {
  pieces.forEach((p, k) => {
    const own = pts.map((pt, i) => ({ ...pt, t: time[i] })).filter((pt) => pt.k === k);
    const t0 = own[0].t;
    const t1 = own[own.length - 1].t;
    pens.push(
      `<path class="ks-pen"${p.retrace ? ' data-retrace="true"' : ''} ` +
        `data-at="${Math.round(clock + t0 * scale)}" data-ms="${Math.max(1, Math.round((t1 - t0) * scale))}" ` +
        `data-pace="${paceOf(own)}" fill="none" stroke="#fff" stroke-width="${width}" ` +
        `stroke-linecap="round" stroke-linejoin="round" d="${d(p.segments)}"></path>`,
    );
  });
  clock += time[time.length - 1] * scale + LIFT_MS;
}

/*
 * The swash: a smile under the lower case, drawn once the name is written and
 * the pen has lifted off the dot. It runs from just before the i to just past
 * the last letter, dips in the middle and turns up at both ends. It is quicker
 * than the writing, as a flick is, and paced the same way, so it leaves from
 * rest and slows as it lifts.
 *
 * The pen presses as it lands and eases off as it goes, so the line is
 * thickest where it starts and thins to a point where it lifts. A stroke has
 * one width, so the ink is a filled outline, `.ks-glyph` like the letters,
 * and the curve it is built round is one more `.ks-pen` in the mask: the swash
 * is revealed exactly as the letters are, last. The viewBox and the mask are
 * let out to hold it.
 */
const glyphBoxes = [...svg.matchAll(/<path class="ks-glyph"[^>]*\sd="([^"]+)"/g)].map(
  ([, path]) => {
    const v = path.match(/-?\d*\.?\d+/g).map(Number);
    const xs = v.filter((_, i) => i % 2 === 0);
    const ys = v.filter((_, i) => i % 2 === 1);
    return { x1: Math.min(...xs), x2: Math.max(...xs), y2: Math.max(...ys) };
  },
);
const lower = glyphBoxes.slice(1);
const from = Math.min(...lower.map((b) => b.x1)) - 10;
const to = Math.max(...lower.map((b) => b.x2)) + 6;
const under = Math.max(...lower.map((b) => b.y2)) + 26;
const span = to - from;
const swash = [
  [from, under - 16],
  [from + span * 0.25, under + 10],
  [from + span * 0.7, under + 10],
  [to, under - 22],
];
const swashed = timeStroke([{ segments: [swash], retrace: false }]);
const swashAt = Math.round(clock - LIFT_MS + SWASH_LIFT_MS);
pens.push(
  `<path class="ks-pen" data-at="${swashAt}" data-ms="${SWASH_MS}" ` +
    `data-pace="${paceOf(swashed.pts.map((pt, i) => ({ ...pt, t: swashed.time[i] })))}" ` +
    `fill="none" stroke="#fff" stroke-width="${width}" stroke-linecap="round" ` +
    `stroke-linejoin="round" d="${d([swash])}"></path>`,
);

// The ink: the curve offset either side by half its width, out along one side
// and back along the other, with a round end at each tip.
const thick = plan.swash * 1.25;
const thin = plan.swash * 0.3;
const STEPS = 120;
const centre = Array.from({ length: STEPS + 1 }, (_, i) => cubic(swash, i / STEPS));
const sides = centre.map((p, i) => {
  const a = centre[Math.max(i - 1, 0)];
  const b = centre[Math.min(i + 1, STEPS)];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  const half = (thin + (thick - thin) * (1 - i / STEPS) ** 0.9) / 2;
  return {
    p,
    half,
    left: [p[0] + nx * half, p[1] + ny * half],
    right: [p[0] - nx * half, p[1] - ny * half],
  };
});
const cap = ({ p, half }, from) => {
  const a0 = Math.atan2(from[1] - p[1], from[0] - p[0]);
  return Array.from({ length: 7 }, (_, k) => {
    const a = a0 - (Math.PI * (k + 1)) / 8;
    return [p[0] + half * Math.cos(a), p[1] + half * Math.sin(a)];
  });
};
const ring = [
  ...sides.map((side) => side.left),
  ...cap(sides[STEPS], sides[STEPS].left),
  ...sides.map((side) => side.right).reverse(),
  ...cap(sides[0], sides[0].right),
];
const ribbon =
  `<path class="ks-glyph" mask="url(#ks-write)" fill="#1a2b4a" stroke="#1a2b4a" stroke-width="0" ` +
  `d="M${ring.map(([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join('L')}Z"></path>`;
const bottom = Math.max(...ring.map(([, y]) => y)) + 4;

const [vx, vy, vw, vh] = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number);
const height = n(Math.max(vy + vh, bottom) - vy);
const next = svg
  .replace(mask[1], pens.join(''))
  .replace(/viewBox="[^"]+"/, `viewBox="${vx} ${vy} ${vw} ${height}"`)
  .replace(/(<mask id="ks-write"[^>]*\sheight=")[^"]+"/, `$1${height}"`)
  .replace('</svg>', `${ribbon}</svg>`);
await writeFile(FILE, next);
console.log(
  `paced ${FILE}: ${strokes.length} strokes, ${pens.length - 1} pieces and the swash, ` +
    `${swashAt + SWASH_MS}ms from first touch to last lift`,
);
