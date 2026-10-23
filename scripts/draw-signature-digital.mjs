import { writeFile } from 'node:fs/promises';

/*
 * Draws `src/content/signature-digital.svg`: "Kiarash" as if signed with a
 * stylus on a tablet.
 *
 *   node scripts/draw-signature-digital.mjs
 *
 * `draw-signature.mjs` writes the name as strokes of one width, which is how a
 * ballpoint looks. A stylus reports pressure, and the signature pads that use
 * one draw a line that swells on the downstrokes, goes thin on the way up and
 * tapers out where the pen leaves the glass. That variation is what this adds,
 * and it is why the ink here is filled outlines rather than strokes: SVG has no
 * stroke whose width changes along its length.
 *
 * Outlines cannot be revealed by animating a dash, so the file carries the pen
 * path as well, as `.ks-pen` runs in `<mask id="ks-write">`, the arrangement
 * `signature.svg` and `signature-typeset.svg` already use. There it has to be
 * recovered from the artwork with `trace-signature.mjs`; here the pen path is
 * where the drawing starts, so it is written out directly and is exact.
 *
 * The letters are a list of points per stroke, joined by the same centripetal
 * Catmull-Rom spline as `draw-signature.mjs`, and the lean is one shear over
 * the whole drawing. It is invented lettering, not anyone's handwriting.
 */

const BASE = 150;
const XH = 44; // x-height
const SLANT = 16; // degrees of forward lean, steeper than a copybook hand

const y = (f) => BASE - XH * f;
const n = (v) => Math.round(v * 10) / 10;

// Ink width in user units. A stroke moving down the slant gets FULL, one moving
// up it gets HAIR, and sideways is in between.
const HAIR = 3;
const FULL = 7.8;
// How far a stroke runs before it reaches full pressure, and how far from its
// end it starts to lift.
const LAND = 10;
const LIFT = 26;
// The mask is wider than the widest ink so it uncovers a stroke completely.
const MASK = 15;

/*
 * Centripetal Catmull-Rom through `points`, as cubic bezier segments
 * [p1, c1, c2, p2]. See `draw-signature.mjs` for the derivation.
 */
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

const bezierPath = (segments) =>
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

// Points along the curve about every half unit, with the distance run so far.
function sample(segments) {
  const out = [];
  let run = 0;
  for (const segment of segments) {
    const steps = 60;
    for (let i = out.length ? 1 : 0; i <= steps; i += 1) {
      const p = cubic(segment, i / steps);
      if (out.length) {
        const last = out[out.length - 1];
        const gap = Math.hypot(p[0] - last.p[0], p[1] - last.p[1]);
        if (gap < 0.5 && i < steps) continue;
        run += gap;
      }
      out.push({ p, s: run });
    }
  }
  return out;
}

const smoothstep = (t) => {
  const c = Math.min(Math.max(t, 0), 1);
  return c * c * (3 - 2 * c);
};

/*
 * The ink of one stroke as a closed outline: the centreline offset either side
 * by half the width at each point, out along one side and back along the
 * other, with a round end at each tip. The width follows the direction of
 * travel against the slant, then the landing and lifting tapers.
 */
function ink(segments, { hair = HAIR, full = FULL, land = LAND, lift = LIFT } = {}) {
  const pts = sample(segments);
  const total = pts[pts.length - 1].s;
  const down = [-Math.sin((SLANT * Math.PI) / 180), Math.cos((SLANT * Math.PI) / 180)];

  const tangents = pts.map((_, i) => {
    const a = pts[Math.max(i - 1, 0)].p;
    const b = pts[Math.min(i + 1, pts.length - 1)].p;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  });

  const raw = tangents.map(([tx, ty], i) => {
    const along = Math.max(0, tx * down[0] + ty * down[1]);
    const shade = hair + (full - hair) * along ** 1.4;
    const press = smoothstep(pts[i].s / land) ** 0.6 * smoothstep((total - pts[i].s) / lift) ** 0.8;
    return Math.max(0.5, shade * (0.35 + 0.65 * press));
  });
  // A pen does not change width from one point to the next; average over a
  // few units so the swell builds and fades.
  const width = raw.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - 8; j <= i + 8; j += 1) {
      if (j < 0 || j >= raw.length) continue;
      sum += raw[j];
      count += 1;
    }
    return sum / count;
  });

  const left = [];
  const right = [];
  pts.forEach(({ p }, i) => {
    const [tx, ty] = tangents[i];
    const h = width[i] / 2;
    left.push([p[0] - ty * h, p[1] + tx * h]);
    right.push([p[0] + ty * h, p[1] - tx * h]);
  });

  const cap = (centre, from, r, steps = 6) => {
    const a0 = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    return Array.from({ length: steps - 1 }, (_, k) => {
      const a = a0 - (Math.PI * (k + 1)) / steps;
      return [centre[0] + r * Math.cos(a), centre[1] + r * Math.sin(a)];
    });
  };

  const end = pts.length - 1;
  const ring = [
    ...left,
    ...cap(pts[end].p, left[end], width[end] / 2),
    ...right.reverse(),
    ...cap(pts[0].p, right[right.length - 1], width[0] / 2),
  ];
  return outline(simplify(ring, 0.12));
}

// Ramer-Douglas-Peucker on a closed ring: drop points within `tolerance` of
// the line their neighbours make.
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = points[i];
      const dist = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > worst) [worst, at] = [dist, i];
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Relative coordinates at a tenth of a unit: about half the bytes of absolute.
function outline(points) {
  let [x, y0] = points[0].map(n);
  let d = `M${x} ${y0}l`;
  for (const p of points.slice(1)) {
    const [px, py] = p.map(n);
    d += `${n(px - x)} ${n(py - y0)} `.replace(/ -/g, '-');
    [x, y0] = [px, py];
  }
  return `${d.trim()}z`;
}

/*
 * The letters. Heights are multiples of the x-height; 0 is the baseline. Each
 * of the lower-case letters starts from the baseline point the one before
 * ended on, so "iarash" is one unbroken stroke, joined to the K's leg.
 */
const letters = {
  i: (x) => [
    [x + 8, y(0.55)],
    [x + 17, y(0.86)],
    [x + 21, y(1)],
    [x + 22, y(0.6)],
    [x + 23, y(0.25)],
    [x + 26, y(0)],
  ],
  a: (x) => [
    [x + 12, y(0.03)],
    [x + 27, y(0.05)],
    [x + 39, y(0.42)],
    [x + 43, y(0.96)],
    [x + 33, y(1.08)],
    [x + 15, y(1)],
    [x + 8, y(0.62)],
    [x + 11, y(0.22)],
    [x + 25, y(0.01)],
    [x + 39, y(0.3)],
    [x + 44, y(0.9)],
    [x + 44, y(0.45)],
    [x + 46, y(0.17)],
    [x + 50, y(0)],
  ],
  r: (x) => [
    [x + 8, y(0.62)],
    [x + 16, y(0.95)],
    [x + 20, y(1.22)],
    [x + 28, y(1.1)],
    [x + 39, y(1.12)],
    [x + 40, y(0.7)],
    [x + 41, y(0.32)],
    [x + 44, y(0)],
  ],
  s: (x) => [
    [x + 6, y(0.35)],
    [x + 13, y(0.8)],
    [x + 18, y(1.18)],
    [x + 24, y(0.72)],
    [x + 26, y(0.34)],
    [x + 20, y(0.04)],
    [x + 10, y(0.04)],
    [x + 8, y(0.2)],
    [x + 17, y(0.1)],
    [x + 32, y(0.1)],
  ],
  // A tall looped ascender, then the arch, and the exit runs on and lifts.
  h: (x) => [
    [x + 8, y(0.62)],
    [x + 16, y(1.1)],
    [x + 22, y(1.9)],
    [x + 27, y(2.65)],
    [x + 34, y(2.35)],
    [x + 30, y(1.4)],
    [x + 27, y(0.6)],
    [x + 26, y(0)],
    [x + 30, y(0.55)],
    [x + 37, y(0.95)],
    [x + 48, y(1.02)],
    [x + 57, y(0.84)],
    [x + 58, y(0.4)],
    [x + 60, y(0.12)],
    [x + 65, y(0)],
    [x + 78, y(0.3)],
  ],
};

// The K's stem: a lead-in hook, up to the top, and down in one pull with a
// small kick at the foot.
const K_STEM = [
  [8, y(1.9)],
  [22, y(2.5)],
  [40, y(2.85)],
  [46, y(2.6)],
  [40, y(2.1)],
  [34, y(1.0)],
  [30, y(0.15)],
  [24, y(-0.1)],
  [16, y(0.08)],
];

// The arms in one stroke: in from the top right, a small loop where they meet
// the stem, and the leg out along the baseline into the i.
const WORD_X = 112;
const K_ARMS = [
  [100, y(2.55)],
  [80, y(1.95)],
  [56, y(1.35)],
  [40, y(1.05)],
  [38, y(1.35)],
  [48, y(1.4)],
  [58, y(0.9)],
  [72, y(0.3)],
  [88, y(0.02)],
  [100, y(0.1)],
];

let pen = WORD_X - 8;
const word = [...K_ARMS];
for (const name of ['i', 'a', 'r', 'a', 's', 'h']) {
  const points = letters[name](pen);
  word.push(...points);
  pen = points[points.length - 1][0] + 3;
}

// Tapped over the i, as a short dash rather than a dot: a stylus moving fast.
const I_STEM = WORD_X - 8 + 21;
const DOT = [
  [I_STEM + 2, y(1.42)],
  [I_STEM + 7, y(1.5)],
  [I_STEM + 13, y(1.53)],
];

// One flick under the name, quick at both ends.
const FLOURISH = [
  [70, y(-0.5)],
  [170, y(-0.7)],
  [290, y(-0.72)],
  [370, y(-0.62)],
  [pen - 14, y(-0.42)],
];

const TAN = Math.tan((SLANT * Math.PI) / 180);
// Letters are written a little narrower than they are drawn above, which is
// what keeps the lower case a readable size in a box of fixed width.
const CONDENSE = 0.92;
const lean = ([x, yy]) => [x * CONDENSE + (BASE - yy) * TAN, yy];

const strokes = [K_STEM, word, DOT].map((s) => spline(s.map(lean)));
const swash = spline(FLOURISH.map(lean));

const glyphs = strokes.map((s, i) => ink(s, i === 2 ? { land: 3, lift: 6 } : {}));
const flourishInk = ink(swash, { hair: 2, full: 4.4, land: 40, lift: 110 });

// The box, from the outlines' own points.
const nums = [...glyphs, flourishInk].flatMap((d) => {
  const out = [];
  let [x, yy] = [0, 0];
  const tokens = d.match(/[Mlz]|-?\d*\.?\d+/g);
  let mode = '';
  for (let i = 0; i < tokens.length;) {
    const t = tokens[i];
    if (/[Mlz]/.test(t)) {
      mode = t;
      i += 1;
      continue;
    }
    const [a, b] = [Number(tokens[i]), Number(tokens[i + 1])];
    if (mode === 'M') [x, yy] = [a, b];
    else [x, yy] = [x + a, yy + b];
    out.push([x, yy]);
    i += 2;
  }
  return out;
});
const PAD = 4;
const left = Math.min(...nums.map(([x]) => x)) - PAD;
const top = Math.min(...nums.map(([, v]) => v)) - PAD;
const W = Math.max(...nums.map(([x]) => x)) + PAD - left;
const H = Math.max(...nums.map(([, v]) => v)) + PAD - top;
const box = `x="${n(left)}" y="${n(top)}" width="${n(W)}" height="${n(H)}"`;

const penPath = (segments, cls, extra = '') =>
  `<path class="${cls}" fill="none" stroke="#fff"${extra} stroke-width="${MASK}" ` +
  `stroke-linecap="round" stroke-linejoin="round" d="${bezierPath(segments)}"></path>`;

const OUT = 'src/content/signature-digital.svg';
const file =
  `<svg data-baseline="${BASE}" viewBox="${n(left)} ${n(top)} ${n(W)} ${n(H)}" xmlns="http://www.w3.org/2000/svg" role="img">` +
  `<defs>` +
  `<mask id="ks-write" maskUnits="userSpaceOnUse" ${box}>${strokes.map((s) => penPath(s, 'ks-pen')).join('')}</mask>` +
  // The swash's pen is `.ks-flourish`, which the page's stylesheet inks with
  // the text colour; inside a mask it has to stay white, hence the style.
  `<mask id="ks-swash" maskUnits="userSpaceOnUse" ${box}>${penPath(swash, 'ks-flourish', ' style="stroke:#fff"')}</mask>` +
  `</defs>` +
  glyphs
    .map(
      (d) =>
        `<path class="ks-glyph" mask="url(#ks-write)" fill="#1a2b4a" stroke-width="0" d="${d}"></path>`,
    )
    .join('') +
  `<path class="ks-glyph" mask="url(#ks-swash)" fill="#1a2b4a" stroke-width="0" d="${flourishInk}"></path>` +
  `</svg>`;
await writeFile(OUT, file + '\n');
console.log(`wrote ${OUT}: ${strokes.length} strokes plus the flourish, ${file.length} bytes`);
