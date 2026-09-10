import { writeFile } from 'node:fs/promises';

/*
 * Draws `src/content/signature-script.svg`: the name "Kiarash" as pen strokes.
 *
 *   node scripts/draw-signature.mjs
 *
 * This is the editable form of that file. The SVG is a few hundred bezier
 * numbers and nobody can adjust a letterform by hand in it; here a letter is a
 * short list of positions the pen passes through, so a shoulder that reads
 * wrong is one number to change rather than an archaeology problem.
 *
 * The positions are joined by a centripetal Catmull-Rom spline, which is the
 * reason this hand looks tidier than picking bezier handles by eye: the curve
 * passes through every point, meets itself smoothly at each one, and — this is
 * what centripetal buys over the uniform kind — never loops or overshoots when
 * the points are unevenly spaced, which they are wherever a stroke turns hard.
 *
 * "iarash" is a single point list, so the joins between letters are part of the
 * same curve as the letters. A hand does not lift between them and neither does
 * this. The lean is one skew over the finished drawing rather than something
 * built into each letter, so every downstroke leans by exactly the same angle.
 *
 * These letters are strokes, not outlines. That is the difference from
 * `signature.svg`, which is a traced signature — closed shapes that cannot be
 * drawn stroke-wise, and so need `trace-signature.mjs` to derive a centreline
 * and a mask to reveal them through. Written as strokes from the start, the
 * letters are the pen path: `Signature.tsx` animates their dash offsets
 * directly and there is no mask at all. Two kilobytes against thirty.
 *
 * It is invented lettering, not anyone's handwriting.
 */

// A copybook's ruling. Heights are given as multiples of the x-height, so 0 is
// the baseline, 1 the top of an a, and 2.4 the top of an ascender. Widths are
// plain units on the same scale. Writing them this way is what keeps the hand
// even: an arch that should match a bowl is written as the same number.
const BASE = 150;
const XH = 44; // x-height. Letters are a little wider than this; upright ones
//                would look cramped otherwise, and cursive is a wide hand.

const SLANT = 9; // degrees of forward lean, applied once, to everything

// Heights: y(0) is the baseline, y(1) the top of an a, y(2.4) the top of the
// K and of the h's loop.
const y = (f) => BASE - XH * f;

const n = (v) => Math.round(v * 10) / 10;

/*
 * Centripetal Catmull-Rom through `points`, as a single cubic bezier run.
 *
 * Per segment the tangent at each end is the chord, corrected by how far the
 * neighbouring point sits off it, damped by the square root of the distance to
 * that neighbour — the alpha=0.5 in the literature. The ends of an open curve
 * have no outside neighbour, so the first and last points stand in for their
 * own, which makes the curve leave and arrive along its first and last chords.
 */
function spline(points) {
  const d = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const at = (i) => points[Math.min(Math.max(i, 0), points.length - 1)];

  let out = `M${n(points[0][0])} ${n(points[0][1])}`;
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
    out += `C${n(c1[0])} ${n(c1[1])},${n(c2[0])} ${n(c2[1])},${n(p2[0])} ${n(p2[1])}`;
  }
  return out;
}

/*
 * Each letter is a list of positions after the baseline point it starts from,
 * and ends on the baseline point the next letter starts from. Chained, that is
 * one unbroken curve: the little U where two letters meet is not drawn by
 * either of them, it is what the spline does between the end of one downstroke
 * and the start of the next upstroke.
 */
const letters = {
  // Up to the x-line, a turn, straight back down. The dot is a separate stroke.
  i: (x) => [
    [x + 7, y(0.55)],
    [x + 18, y(0.82)],
    [x + 22, y(1)],
    [x + 24, y(0.62)],
    [x + 25, y(0.28)],
    [x + 27, y(0)],
  ],

  // An oval written anticlockwise from its top right, closed where it began,
  // then the stem down beside it. Both a's are this same shape.
  //
  // The stroke in comes up the oval's right side rather than diagonally across
  // it. Cut across, as a copybook a is, it leaves the counter a slit at this
  // weight; up the side it leaves the whole oval open.
  a: (x) => [
    [x + 24, y(0.16)],
    [x + 42, y(0.5)],
    [x + 47, y(0.95)],
    [x + 36, y(1.09)],
    [x + 16, y(1.02)],
    [x + 9, y(0.66)],
    [x + 12, y(0.24)],
    [x + 28, y(0.01)],
    [x + 44, y(0.28)],
    [x + 48, y(0.84)],
    [x + 49, y(0.48)],
    [x + 51, y(0.2)],
    [x + 54, y(0)],
  ],

  // Up past the x-line, a notch, a flat shelf, down. Flat is what keeps it from
  // reading as an n.
  r: (x) => [
    [x + 8, y(0.6)],
    [x + 17, y(0.9)],
    [x + 22, y(1.2)],
    [x + 31, y(1.13)],
    [x + 42, y(1.15)],
    [x + 44, y(0.72)],
    [x + 45, y(0.34)],
    [x + 48, y(0)],
  ],

  // Up to a narrow point, then down the belly on the near side of the stroke
  // that made it. The top has to stay narrow: opened out, the belly closes
  // against the upstroke and the letter reads as an e. No closing curl at the
  // foot either — at this weight it fills in and reads as a knot.
  s: (x) => [
    [x + 6, y(0.3)],
    [x + 14, y(0.76)],
    [x + 21, y(1.17)],
    [x + 16, y(1.05)],
    [x + 10, y(0.6)],
    [x + 9, y(0.22)],
    [x + 22, y(0)],
    [x + 36, y(0.06)],
  ],

  // A looped ascender, the stem down, then one arch the width of the bowls
  // above, and out.
  h: (x) => [
    [x + 8, y(0.6)],
    [x + 15, y(1.02)],
    [x + 20, y(1.7)],
    [x + 24, y(2.4)],
    [x + 32, y(2.15)],
    [x + 29, y(1.3)],
    [x + 27, y(0.6)],
    [x + 27, y(0)],
    [x + 31, y(0.55)],
    [x + 38, y(0.95)],
    [x + 50, y(1)],
    [x + 60, y(0.85)],
    [x + 61, y(0.4)],
    [x + 63, y(0.15)],
    [x + 67, y(0)],
    [x + 78, y(0.4)],
  ],
};

/*
 * A script capital K in two strokes, which is the order a hand makes one in:
 * the stem with its crest, then the arms. The crest stays open — closed into a
 * loop it reads as an E.
 */
const K_STEM = [
  [36, y(1.65)],
  [44, y(2.25)],
  [58, y(2.45)],
  [66, y(2.05)],
  [58, y(0.95)],
  [55, y(0.35)],
  [55, y(0)],
  [59, y(-0.22)],
  [68, y(-0.16)],
];

const K_ARMS = [
  [148, y(2.35)],
  [120, y(1.75)],
  [94, y(0.95)],
  [66, y(0.6)],
  [88, y(0.42)],
  [103, y(0.12)],
  [116, y(-0.04)],
  [124, y(-0.27)],
  [138, y(-0.04)],
];

// The word starts clear of the K's lower arm.
const WORD_X = 150;

let pen = WORD_X;
const word = [[WORD_X, BASE]];
for (const name of ['i', 'a', 'r', 'a', 's', 'h']) {
  const points = letters[name](pen);
  word.push(...points);
  // A little air between the baseline a letter lands on and the one the next
  // rises from. Butted together the connecting U is a deep narrow notch; given
  // a few units it is the shallow scoop a hand actually makes.
  pen = points[points.length - 1][0] + 4;
}

// Tapped over the i's stem, which the letter puts at WORD_X + 23.
const DOT = [
  [WORD_X + 22, y(1.34)],
  [WORD_X + 27, y(1.42)],
  [WORD_X + 33, y(1.44)],
];

// One sweep under the whole name, out of the K's tail and away past the h.
const FLOURISH = [
  [52, y(-0.5)],
  [160, y(-0.78)],
  [300, y(-0.82)],
  [420, y(-0.7)],
  [pen + 34, y(-0.36)],
];

const strokes = [K_STEM, K_ARMS, word, DOT];

// The lean, as a shear about the baseline: points on it stay put, everything
// above slides right in proportion to its height. Ovals lean with the letters,
// which is what they do in a real slanted hand.
const TAN = Math.tan((SLANT * Math.PI) / 180);
const lean = ([x, y]) => [x + (BASE - y) * TAN, y];

const INK = 6; // letters
const HAIR = 4.5; // the flourish
const PAD = 5; // beyond the round caps, for the little a spline bulges past a point

const all = [...strokes.flat(), ...FLOURISH].map(lean);
const xs = all.map(([x]) => x);
const ys = all.map(([, y]) => y);
const left = Math.min(...xs) - INK / 2 - PAD;
const top = Math.min(...ys) - INK / 2 - PAD;
const W = Math.max(...xs) + INK / 2 + PAD - left;
const H = Math.max(...ys) + INK / 2 + PAD - top;

const path = (points, cls, width) =>
  `<path class="${cls}" fill="none" stroke="#1a2b4a" stroke-width="${width}" ` +
  `stroke-linecap="round" stroke-linejoin="round" d="${spline(points.map(lean))}"></path>`;

const OUT = 'src/content/signature-script.svg';
const file =
  `<svg viewBox="${n(left)} ${n(top)} ${n(W)} ${n(H)}" xmlns="http://www.w3.org/2000/svg" role="img">` +
  strokes.map((s) => path(s, 'ks-stroke', INK)).join('') +
  path(FLOURISH, 'ks-flourish', HAIR) +
  `</svg>`;
await writeFile(OUT, file + '\n');
console.log(`wrote ${OUT}: ${strokes.length} strokes plus the flourish, ${file.length} bytes`);
