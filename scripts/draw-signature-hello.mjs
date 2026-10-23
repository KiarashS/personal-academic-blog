import { writeFile } from 'node:fs/promises';

/*
 * Draws `src/content/signature-hello.svg`: "Kiarash" in the manner of the
 * "hello" Apple shows when a Mac or an iPhone is first switched on.
 *
 *   node scripts/draw-signature-hello.mjs
 *
 * What makes that animation read as writing is two things, and this file
 * copies both. The line is one weight throughout, thick, with round ends, so
 * the moving tip is a round pen nib; and it does not move at one speed. It
 * slows into every turn and runs along the straights, the way a hand does.
 *
 * The speed follows the two-thirds power law from the motor-control
 * literature (Lacquaniti, Terzuolo and Viviani, 1983): a hand drawing a curve
 * moves at a speed proportional to the cube root of the curve's radius. Each
 * stroke also starts from rest and comes to rest at its end. The script works
 * that out from the geometry and writes it into the file, per stroke, as
 * `data-pace`: the share of the stroke's length drawn at each of PACE_STEPS
 * equal moments of its duration. `data-at` and `data-ms` are when the stroke
 * starts and how long it takes. `Signature.tsx` plays a drawing that carries
 * them on that timetable; one without them is drawn as before.
 *
 * The letters are points joined by a centripetal Catmull-Rom spline, as in
 * `draw-signature.mjs`, and the lean is one shear over the whole drawing.
 * "iarash" is one stroke and joins the K's leg, so after the stem the pen lifts
 * only for the dot. It is invented lettering, not anyone's handwriting.
 */

const BASE = 150;
const XH = 46; // x-height
const SLANT = 11; // degrees of lean

const INK = 8; // the one width every stroke has
const PAD = 2;

// Time spent writing, not counting the lifts between strokes.
const WRITE_MS = 4200;
// Pen up, moved, and down again.
const LIFT_MS = 220;
const DOT_MS = 140;
const PACE_STEPS = 32;

const y = (f) => BASE - XH * f;
const n = (v) => Math.round(v * 10) / 10;

/* Centripetal Catmull-Rom through `points`, as cubic segments [p1, c1, c2, p2]. */
function spline(points) {
  const d = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const at = (i) => points[Math.min(Math.max(i, 0), points.length - 1)];
  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const [t01, t12, t23] = [d(p0, p1) || 1e-6, d(p1, p2) || 1e-6, d(p2, p3) || 1e-6];
    const c1 = [0, 1].map(
      (k) =>
        p1[k] + (p2[k] - p1[k] + t12 * ((p1[k] - p0[k]) / t01 - (p2[k] - p0[k]) / (t01 + t12))) / 3,
    );
    const c2 = [0, 1].map(
      (k) =>
        p2[k] - (p2[k] - p1[k] + t12 * ((p3[k] - p2[k]) / t23 - (p3[k] - p1[k]) / (t12 + t23))) / 3,
    );
    segments.push([p1, c1, c2, p2]);
  }
  return segments;
}

const pathData = (segments) =>
  `M${n(segments[0][0][0])} ${n(segments[0][0][1])}` +
  segments
    .map(([, c1, c2, p]) => `C${c1.map(n).join(' ')} ${c2.map(n).join(' ')} ${p.map(n).join(' ')}`)
    .join('');

const cubic = ([p0, c1, c2, p1], t) => {
  const u = 1 - t;
  return [0, 1].map(
    (k) => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k],
  );
};

// Points about a quarter of a unit apart, each with the length run so far.
function sample(segments) {
  const out = [{ p: segments[0][0], s: 0 }];
  for (const segment of segments) {
    for (let i = 1; i <= 200; i += 1) {
      const p = cubic(segment, i / 200);
      const last = out[out.length - 1];
      const gap = Math.hypot(p[0] - last.p[0], p[1] - last.p[1]);
      if (gap < 0.25 && i < 200) continue;
      out.push({ p, s: last.s + gap });
    }
  }
  return out;
}

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
 * How long a stroke takes, in arbitrary units, and where the pen is along it
 * at each of PACE_STEPS equal moments.
 *
 * Speed is the cube root of the radius, measured over a few units either side
 * so the bumps of the spline do not register as turns, and held between a
 * floor (a cusp would otherwise stop the pen dead) and a ceiling (a straight
 * would otherwise be instant). Over the first and last stretch it is scaled
 * down towards a standstill, the pen landing and lifting.
 */
function pace(segments) {
  const pts = sample(segments);
  const total = pts[pts.length - 1].s;
  const reach = 16; // samples either side, about 4 units
  const speed = pts.map(({ p, s }, i) => {
    const a = pts[Math.max(i - reach, 0)].p;
    const c = pts[Math.min(i + reach, pts.length - 1)].p;
    const r = Math.min(Math.max(radius(a, p, c), 4), 160);
    const ramp = 0.3 + 0.7 * smoothstep(s / 26) * smoothstep((total - s) / 34);
    return Math.cbrt(r) * ramp;
  });

  const time = [0];
  for (let i = 1; i < pts.length; i += 1) {
    const ds = pts[i].s - pts[i - 1].s;
    time.push(time[i - 1] + (2 * ds) / (speed[i] + speed[i - 1]));
  }
  const duration = time[time.length - 1];

  const fractions = [];
  let j = 0;
  for (let k = 1; k < PACE_STEPS; k += 1) {
    const goal = (k / PACE_STEPS) * duration;
    while (time[j + 1] < goal) j += 1;
    const t = (goal - time[j]) / (time[j + 1] - time[j]);
    fractions.push((pts[j].s + t * (pts[j + 1].s - pts[j].s)) / total);
  }
  return { duration, fractions };
}

/*
 * The lower case. Each letter is the points after the baseline point it
 * starts from, ending on the one the next starts from, so chained they are
 * one curve and the joins are whatever the spline does between them.
 */
const letters = {
  i: (x) => [
    [x + 10, y(0.45)],
    [x + 20, y(0.85)],
    [x + 25, y(1)],
    [x + 25, y(0.55)],
    [x + 26, y(0.2)],
    [x + 32, y(0)],
  ],

  // Along the baseline and up the oval's right side, round it anticlockwise,
  // back up the same side and down the stem. Coming in across the oval, as a
  // copybook a does, would put a line through its counter at this weight.
  a: (x) => [
    [x + 16, y(0.02)],
    [x + 34, y(0.1)],
    [x + 46, y(0.5)],
    [x + 50, y(1)],
    [x + 36, y(1.1)],
    [x + 18, y(0.98)],
    [x + 9, y(0.55)],
    [x + 14, y(0.1)],
    [x + 30, y(0.02)],
    [x + 44, y(0.4)],
    [x + 50, y(1.02)],
    [x + 49, y(0.5)],
    [x + 51, y(0.15)],
    [x + 58, y(0)],
  ],

  // Up to a small point above the x-line, a short shoulder, and down.
  r: (x) => [
    [x + 12, y(0.5)],
    [x + 20, y(0.92)],
    [x + 24, y(1.18)],
    [x + 27, y(0.98)],
    [x + 36, y(1.08)],
    [x + 44, y(0.95)],
    [x + 44, y(0.5)],
    [x + 46, y(0.15)],
    [x + 53, y(0)],
  ],

  s: (x) => [
    [x + 10, y(0.42)],
    [x + 18, y(0.84)],
    [x + 23, y(1.16)],
    [x + 30, y(0.72)],
    [x + 31, y(0.3)],
    [x + 23, y(0.02)],
    [x + 10, y(0.06)],
    [x + 6, y(0.3)],
    [x + 14, y(0.32)],
    [x + 25, y(0.14)],
    [x + 38, y(0.1)],
  ],

  // The h of "hello": a tall open loop, the stem, one round arch, and the
  // exit curling up to finish.
  h: (x) => [
    [x + 14, y(0.6)],
    [x + 30, y(1.4)],
    [x + 41, y(2.1)],
    [x + 45, y(2.6)],
    [x + 38, y(2.74)],
    [x + 29, y(2.35)],
    [x + 23, y(1.3)],
    [x + 20, y(0.45)],
    [x + 19, y(0)],
    [x + 25, y(0.65)],
    [x + 36, y(1)],
    [x + 48, y(1.02)],
    [x + 55, y(0.72)],
    [x + 55, y(0.3)],
    [x + 58, y(0.05)],
    [x + 68, y(0.06)],
    [x + 80, y(0.42)],
  ],
};

// The K's stem as an l: up from the baseline into an open loop and down.
const K_STEM = [
  [8, y(0.15)],
  [34, y(1.15)],
  [54, y(2.15)],
  [62, y(2.75)],
  [56, y(3.02)],
  [44, y(2.85)],
  [37, y(2.1)],
  [32, y(1)],
  [29, y(0)],
];

// The arms: in from the top right, a small loop where they meet the stem, the
// leg down to the baseline, and on into the word.
const K_ARMS = [
  [104, y(2.55)],
  [96, y(2.4)],
  [78, y(1.9)],
  [56, y(1.4)],
  [40, y(1.18)],
  [38, y(1.42)],
  [50, y(1.45)],
  [60, y(1)],
  [70, y(0.45)],
  [80, y(0.1)],
  [92, y(0.02)],
];

let pen = 90;
const word = [...K_ARMS];
const starts = {};
for (const [index, name] of ['i', 'a', 'r', 'a', 's', 'h'].entries()) {
  starts[index] = pen;
  const points = letters[name](pen);
  word.push(...points);
  pen = points[points.length - 1][0] + 6;
}

// A dot, as a stroke too short to see as anything but its round end.
const I_TOP = starts[0] + 25;
const DOT = [
  [I_TOP + 6, y(1.52)],
  [I_TOP + 6.6, y(1.54)],
];

const TAN = Math.tan((SLANT * Math.PI) / 180);
const lean = ([x, yy]) => [x + (BASE - yy) * TAN, yy];

const strokes = [K_STEM, word, DOT].map((s) => spline(s.map(lean)));
const paces = strokes.map(pace);

// Writing time is shared out by how long each stroke takes at its own pace;
// the dot gets a fixed tap.
const written = paces.slice(0, 2).reduce((sum, p) => sum + p.duration, 0);
const durations = paces.map((p, i) => (i === 2 ? DOT_MS : (p.duration / written) * WRITE_MS));
const at = [];
durations.reduce((t, d, i) => {
  at[i] = t;
  return t + d + LIFT_MS;
}, 0);

const all = strokes.flatMap((s) => sample(s).map(({ p }) => p));
const left = Math.min(...all.map(([x]) => x)) - INK / 2 - PAD;
const top = Math.min(...all.map(([, v]) => v)) - INK / 2 - PAD;
const W = Math.max(...all.map(([x]) => x)) + INK / 2 + PAD - left;
const H = Math.max(...all.map(([, v]) => v)) + INK / 2 + PAD - top;

const OUT = 'src/content/signature-hello.svg';
const file =
  `<svg data-baseline="${BASE}" viewBox="${n(left)} ${n(top)} ${n(W)} ${n(H)}" xmlns="http://www.w3.org/2000/svg" role="img">` +
  strokes
    .map(
      (s, i) =>
        `<path class="ks-stroke" data-at="${Math.round(at[i])}" data-ms="${Math.round(durations[i])}" ` +
        `data-pace="${paces[i].fractions.map((f) => Math.round(f * 1000) / 1000).join(' ')}" ` +
        `fill="none" stroke="#1a2b4a" stroke-width="${INK}" stroke-linecap="round" stroke-linejoin="round" ` +
        `d="${pathData(s)}"></path>`,
    )
    .join('') +
  `</svg>`;
await writeFile(OUT, file + '\n');
console.log(
  `wrote ${OUT}: ${strokes.length} strokes, ${Math.round(at[2] + durations[2])}ms, ${file.length} bytes`,
);
