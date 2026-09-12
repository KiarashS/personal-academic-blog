import { writeFile } from 'node:fs/promises';

/*
 * Draws the logo: a K under warm glass.
 *
 *   node scripts/draw-logo.mjs
 *
 * Writes `public/logo.svg` (the full mark) and `public/logo-mark.svg` (the K
 * alone, in `currentColor`, for anywhere the glass would be noise — a favicon
 * at 16px, a print header, a one-colour stamp).
 *
 * The K is one path of three subpaths under `nonzero`, not three shapes. That
 * matters for a letter that may be drawn translucent: three overlapping shapes
 * each at 80% stack to nearly opaque where they meet, and leave two seams
 * across the junction. One path unions them into a single pane of one
 * thickness.
 */

const SIZE = 256;

/** The tile. A rounded square rather than a circle: it holds a K better. */
const TILE = { x: 18, y: 18, size: 220, radius: 50 };

/*
 * The letter, as a skeleton that is then given width. Written this way the
 * proportions are five numbers to argue about rather than twelve polygon
 * corners, and the arms meet the stem by construction.
 */
const STEM = { x: 88, top: 76, bottom: 180 };
const WEIGHT = 19; // 18% of the letter's height: bold, but not a blob

/*
 * Both arms leave the stem's right edge, not its centre. Off the centre they
 * spend half their width buried in the stem, and what shows at the junction is
 * a lump as wide as both arms at once.
 */
const JOIN = { x: STEM.x + WEIGHT / 2 - 3, y: 129 };
const ARM_UP = { x: 158, reach: STEM.top };
const ARM_DOWN = { x: 164, reach: STEM.bottom };

const n = (v) => Math.round(v * 10) / 10;

/**
 * A bar of width `WEIGHT` from `a` to `b`, cut square at `a` and upright at `b`.
 *
 * Upright at the tip rather than square to the arm: the two arms leave at
 * different angles, and cutting each square to itself leaves the letter's right
 * side as two slivers at two different slants. Cut upright they line up, and
 * the K sits in the square instead of leaning out of it.
 */
function bar(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const [ux, uy] = [dx / length, dy / length];
  const [ox, oy] = [(-uy * WEIGHT) / 2, (ux * WEIGHT) / 2];
  const tip = WEIGHT / 2 / Math.abs(ux); // half the upright cut at the tip
  return [
    { x: a.x + ox, y: a.y + oy },
    { x: b.x, y: b.y + tip },
    { x: b.x, y: b.y - tip },
    { x: a.x - ox, y: a.y - oy },
  ];
}

/**
 * Where an arm's skeleton has to end for the finished arm to stop on the line.
 *
 * An upright cut across a sloping bar is longer than the bar is wide, so a
 * skeleton that ends on the cap line puts half that cut above it: the first
 * draft had both arms spiking eleven units past the letter, top and bottom,
 * which is most of why it read as a spider rather than a K. The overshoot
 * depends on the slope and the slope depends on where the arm ends, so this
 * settles it by going round twice — the second pass moves the answer by less
 * than a tenth of a unit.
 */
function armEnd(from, x, line) {
  const toward = Math.sign(line - from.y);
  let y = line;
  for (let pass = 0; pass < 2; pass += 1) {
    const ux = Math.abs(x - from.x) / Math.hypot(x - from.x, y - from.y);
    y = line - toward * (WEIGHT / 2 / ux);
  }
  return { x, y };
}

/** Twice the signed area. Its sign is the winding. */
const winding = (points) =>
  points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + (p.x * q.y - q.x * p.y);
  }, 0);

/**
 * `nonzero` only unions subpaths that wind the same way; mixed windings punch
 * holes instead. So every subpath is turned to match the first.
 */
function subpath(points, like) {
  const wound = Math.sign(winding(points)) === Math.sign(like) ? points : [...points].reverse();
  return `M${wound.map((p) => `${n(p.x)} ${n(p.y)}`).join('L')}Z`;
}

const stem = [
  { x: STEM.x - WEIGHT / 2, y: STEM.top },
  { x: STEM.x + WEIGHT / 2, y: STEM.top },
  { x: STEM.x + WEIGHT / 2, y: STEM.bottom },
  { x: STEM.x - WEIGHT / 2, y: STEM.bottom },
];
const reference = winding(stem);

const parts = [
  stem,
  bar(JOIN, armEnd(JOIN, ARM_UP.x, ARM_UP.reach)),
  bar(JOIN, armEnd(JOIN, ARM_DOWN.x, ARM_DOWN.reach)),
];
const K = parts.map((points) => subpath(points, reference)).join('');

/*
 * Where the letter actually is, measured rather than assumed.
 *
 * The skeleton above is written in whatever numbers read clearly; the letter's
 * real extent is what comes out of giving those numbers width, and the arms
 * reach past their skeleton by half a weight. Measuring it means the size and
 * the centring below are one number each, and the mark can be cropped to the
 * ink rather than to the canvas — at 16px a viewBox with the tile's margins
 * still in it leaves the K six pixels tall in a sixteen-pixel box.
 */
const xs = parts.flat().map((p) => p.x);
const ys = parts.flat().map((p) => p.y);
const ink = { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
const ROOM = Math.max(ink.x2 - ink.x1, ink.y2 - ink.y1);

/** The letter's height as a share of the tile. Icons want rather more than half. */
const CAP = 0.56;

const scale = (TILE.size * CAP) / (ink.y2 - ink.y1);
const place =
  `translate(${n(SIZE / 2 - ((ink.x1 + ink.x2) / 2) * scale)} ` +
  `${n(SIZE / 2 - ((ink.y1 + ink.y2) / 2) * scale)}) scale(${n(scale * 1000) / 1000})`;

const OUT_MARK = 'public/logo-mark.svg';
await writeFile(
  OUT_MARK,
  `<svg viewBox="${n(ink.x1 - (ROOM - (ink.x2 - ink.x1)) / 2)} ${n(ink.y1)} ` +
    `${n(ROOM)} ${n(ROOM)}" xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="Kiarash Soleimanzadeh">` +
    `<path fill="currentColor" fill-rule="nonzero" d="${K}"></path>` +
    `</svg>\n`,
);

/*
 * The glass.
 *
 * Two earlier tries came out as a gel button, and the reason was not the
 * lighting: a solid tile with a shine on it is plastic however the shine is
 * drawn. What reads as glass is seeing something through it. So there is
 * something behind — a few saturated blobs — and the tile is a frosted pane
 * over them: the blobs are blurred hard, a white wash is laid over, and what
 * survives is colour diffusing through frost rather than a gradient painted on.
 *
 * The blur is done here rather than left to `backdrop-filter` because this file
 * has to be a logo: one drawing that is the same on a page, in a favicon, in a
 * README, on someone else's slide. It cannot depend on what is behind it.
 *
 * On top of the frost: the letter as a brighter pane, a bright rim where the
 * edge faces the light, and a warm edge light piped along the bottom wall,
 * which is the one thing a sheet of glass does that a gel button cannot.
 */
const rect = (inset, radius) =>
  `x="${n(TILE.x + inset)}" y="${n(TILE.y + inset)}" ` +
  `width="${n(TILE.size - inset * 2)}" height="${n(TILE.size - inset * 2)}" rx="${n(radius)}"`;

const face = rect(0, TILE.radius);
const [sx, sy] = [n(TILE.x + 52), n(TILE.y + 38)];

const OUT = 'public/logo.svg';
const file = `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kiarash Soleimanzadeh">
  <defs>
    <filter id="ks-frost" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="ks-cast" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <linearGradient id="ks-letter" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#fffefd" stop-opacity="0.98"/>
      <stop offset="1" stop-color="#ffe7d9" stop-opacity="0.84"/>
    </linearGradient>
    <linearGradient id="ks-rim" x1="0.05" y1="0" x2="0.95" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/>
      <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="ks-edge" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0.45" stop-color="#ffb392" stop-opacity="0"/>
      <stop offset="1" stop-color="#ffcdb4" stop-opacity="0.8"/>
    </linearGradient>
    <radialGradient id="ks-spec" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="0.65" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ks-clip"><rect ${face}/></clipPath>
  </defs>

  <g clip-path="url(#ks-clip)">
    <!-- What the glass has behind it. Blurred to nothing recognisable: the job
         is colour arriving from somewhere, not a picture. -->
    <rect ${face} fill="#4a1d15"/>
    <g filter="url(#ks-frost)">
      <circle cx="${n(TILE.x + 34)}" cy="${n(TILE.y + 28)}" r="76" fill="#f0a06d"/>
      <circle cx="${n(TILE.x + 188)}" cy="${n(TILE.y + 66)}" r="66" fill="#c2412c"/>
      <circle cx="${n(TILE.x + 150)}" cy="${n(TILE.y + 208)}" r="82" fill="#571a2e"/>
      <circle cx="${n(TILE.x + 26)}" cy="${n(TILE.y + 186)}" r="58" fill="#8e3524"/>
    </g>

    <!-- The frost itself. -->
    <rect ${face} fill="#ffffff" fill-opacity="0.1"/>
    <ellipse cx="${sx}" cy="${sy}" rx="84" ry="42" fill="url(#ks-spec)" transform="rotate(-24 ${sx} ${sy})"/>

    <!-- The letter sits above the frost rather than in it, which is the only
         thing keeping it off the bright corner: white on peach has almost no
         contrast, and the shadow gives the edge back without darkening the
         letter or the tile. -->
    <g transform="translate(6 8)" filter="url(#ks-cast)" opacity="0.38">
      <path fill="#41130c" fill-rule="nonzero" transform="${place}" d="${K}"/>
    </g>
    <path fill="url(#ks-letter)" fill-rule="nonzero" transform="${place}" d="${K}"/>

    <rect ${rect(3.5, TILE.radius - 3.5)} fill="none" stroke="url(#ks-edge)" stroke-width="3"/>
  </g>

  <rect ${rect(1.25, TILE.radius - 1.25)} fill="none" stroke="url(#ks-rim)" stroke-width="2.5"/>
</svg>
`;
await writeFile(OUT, file);

/*
 * The same mark with the glass taken off, for a favicon.
 *
 * Frost is a blur, and a blur at sixteen pixels is a smudge: the tile arrives
 * as a brown blob with something pale in it. Two flat colours survive, and a
 * browser tab is the one place the drawing has no room to be a drawing.
 */
const OUT_ICON = 'public/logo-icon.svg';
const icon = `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kiarash Soleimanzadeh">
  <rect ${face} fill="#8d3e2e"/>
  <path fill="#fdf4ee" fill-rule="nonzero" transform="${place}" d="${K}"/>
</svg>
`;
await writeFile(OUT_ICON, icon);

console.log(`wrote ${OUT} (${file.length} bytes), ${OUT_MARK} and ${OUT_ICON}`);
