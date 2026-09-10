import { writeFile } from 'node:fs/promises';

/*
 * Draws `src/content/signature-script.svg`: the name "Kiarash" as pen strokes.
 *
 *   node scripts/draw-signature.mjs
 *
 * This is the editable form of that file. The SVG is a few hundred bezier
 * numbers and nobody can adjust a letterform by hand in it; the letters here
 * are functions of a position on a writing grid, so a shoulder that reads
 * wrong is a line to change rather than an archaeology problem.
 *
 * These letters are strokes, not outlines. That is the difference from
 * `signature.svg`, which is a traced signature — closed shapes that cannot be
 * drawn stroke-wise, and so need `trace-signature.mjs` to derive a centreline
 * and a mask to reveal them through. Written as strokes from the start, the
 * letters are the pen path: `Signature.tsx` animates their dash offsets
 * directly and there is no mask at all. 1.7KB against 30KB.
 *
 * It is invented lettering, not anyone's handwriting.
 */

// A copybook's ruling. Everything below is written against these.
const BASE = 150,
  XTOP = 100,
  ASC = 48;
const JOIN = BASE - 22; // where one letter hands over to the next

const n = (v) => Math.round(v * 10) / 10;
const C = (a, b, c, d, e, f) => `C${n(a)} ${n(b)},${n(c)} ${n(d)},${n(e)} ${n(f)}`;

/*
 * Each letter is written from the pen's current position and returns where the
 * pen ends up, so the joins line up by construction rather than by my counting
 * pixels. Widths are the advance from one join to the next.
 */
const letters = {
  // Rise, straight down, away.
  i: (x) => ({
    d:
      C(x + 4, XTOP + 26, x + 10, XTOP + 8, x + 14, XTOP) +
      C(x + 17, XTOP + 16, x + 19, XTOP + 34, x + 20, BASE) +
      C(x + 25, BASE - 8, x + 30, BASE - 14, x + 34, JOIN),
    width: 34,
  }),

  // An oval closed at the left, then the right stem down. The bowl has to shut
  // or it reads as a u.
  a: (x) => ({
    d:
      C(x + 10, XTOP + 20, x + 24, XTOP + 2, x + 34, XTOP) +
      C(x + 26, XTOP - 4, x + 12, XTOP + 2, x + 8, XTOP + 16) +
      C(x + 4, XTOP + 30, x + 10, BASE - 4, x + 20, BASE - 2) +
      C(x + 30, BASE, x + 38, XTOP + 30, x + 40, XTOP + 14) +
      C(x + 41, XTOP + 4, x + 41, XTOP, x + 41, XTOP) +
      C(x + 41, XTOP + 18, x + 43, XTOP + 38, x + 46, BASE) +
      C(x + 51, BASE - 8, x + 56, BASE - 14, x + 60, JOIN),
    width: 60,
  }),

  // Rise, a notch, then a flat shoulder and straight down. The shoulder has to
  // stay flat: rounded, it is an n.
  r: (x) => ({
    d:
      C(x + 4, XTOP + 24, x + 11, XTOP + 2, x + 17, XTOP - 6) +
      C(x + 21, XTOP - 2, x + 23, XTOP + 7, x + 28, XTOP + 3) +
      C(x + 33, XTOP - 1, x + 38, XTOP + 1, x + 40, XTOP + 7) +
      C(x + 40, XTOP + 22, x + 39, XTOP + 36, x + 39, BASE) +
      C(x + 44, BASE - 8, x + 48, BASE - 14, x + 52, JOIN),
    width: 52,
  }),

  // Up, a hook back to the left, down through the belly, out. The tail stops
  // short of crossing itself, which at this size reads as a knot.
  s: (x) => ({
    d:
      C(x + 6, XTOP + 22, x + 14, XTOP + 4, x + 22, XTOP - 2) +
      C(x + 16, XTOP - 8, x + 6, XTOP - 4, x + 5, XTOP + 8) +
      C(x + 4, XTOP + 20, x + 13, XTOP + 26, x + 20, XTOP + 32) +
      C(x + 27, XTOP + 38, x + 29, BASE - 2, x + 22, BASE) +
      C(x + 18, BASE + 2, x + 14, BASE - 1, x + 13, BASE - 6) +
      C(x + 22, BASE - 8, x + 32, BASE - 14, x + 42, JOIN),
    width: 42,
  }),

  // Tall stem up and back down, then the arch.
  h: (x) => ({
    d:
      C(x + 6, XTOP - 4, x + 14, ASC + 26, x + 21, ASC + 12) +
      C(x + 25, ASC + 34, x + 25, XTOP + 12, x + 25, BASE) +
      C(x + 26, XTOP + 32, x + 32, XTOP + 8, x + 44, XTOP + 6) +
      C(x + 54, XTOP + 4, x + 58, XTOP + 16, x + 58, XTOP + 30) +
      C(x + 58, XTOP + 40, x + 59, BASE - 4, x + 60, BASE) +
      C(x + 66, BASE - 8, x + 72, BASE - 16, x + 78, JOIN - 6),
    width: 78,
  }),
};

// A script capital K: a stem with a small loop at the head, then the arms in a
// second stroke, which is how a hand actually makes one.
const K_STEM =
  `M34 ${ASC + 34} ` +
  C(40, ASC + 8, 58, ASC - 4, 66, ASC + 14) +
  C(62, XTOP - 6, 56, XTOP + 24, 54, BASE) +
  C(54, BASE + 10, 60, BASE + 15, 68, BASE + 10);

const K_ARMS =
  `M150 ${ASC + 4} ` +
  C(126, ASC + 30, 98, XTOP - 6, 60, XTOP + 16) +
  C(86, XTOP + 22, 106, XTOP + 36, 120, BASE + 2) +
  C(126, BASE + 12, 136, BASE + 14, 146, BASE + 2);

// The word, written from where the K leaves off.
let pen = 158;
const word = ['i', 'a', 'r', 'a', 's', 'h'].map((name) => {
  const glyph = letters[name](pen);
  pen += glyph.width;
  return glyph.d;
});
const WORD = `M158 ${BASE}` + word.join('');

const DOT = `M${158 + 18} ${XTOP - 26} C${158 + 19} ${XTOP - 27},${158 + 21} ${XTOP - 27},${158 + 22} ${XTOP - 26}`;

const flourish =
  `M40 ${BASE + 20} ` +
  C(150, BASE + 32, 300, BASE + 34, 420, BASE + 24) +
  C(455, BASE + 20, 478, BASE + 14, pen + 10, BASE + 4);

const strokes = [K_STEM, K_ARMS, WORD, DOT];

console.log('word ends at x =', pen);

const OUT = 'src/content/signature-script.svg';
const W = pen + 46,
  H = 226;
const file =
  `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
  strokes
    .map(
      (d) =>
        `<path class="ks-stroke" fill="none" stroke="#1a2b4a" stroke-width="7" ` +
        `stroke-linecap="round" stroke-linejoin="round" d="${d}"></path>`,
    )
    .join('') +
  `<path class="ks-flourish" fill="none" stroke="#1a2b4a" stroke-width="5" ` +
  `stroke-linecap="round" d="${flourish}"></path>` +
  `</svg>`;
await writeFile(OUT, file + '\n');
console.log(
  `wrote ${OUT}: ${strokes.length} letter strokes plus the flourish, ${file.length} bytes`,
);
