import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import opentype from 'opentype.js';

/*
 * Sets a name in a handwriting font and writes it out as `.ks-glyph` outlines.
 *
 *   node scripts/set-signature.mjs <font file> [name] [out.svg]
 *   node scripts/set-signature.mjs ~/fonts/TheRichJullietta.ttf
 *
 * The font is not in this repo and must not be: "The Rich Jullietta" is a demo
 * released for personal use only, and a font served from a public site is a
 * font distributed to everyone who visits it. What ships is the output — the
 * outlines of seven letters, which is a drawing, not the typeface. Point this
 * at your own copy of whatever font you want the name written in.
 *
 * The result is filled shapes, so it cannot be drawn stroke-wise. Run
 * `scripts/trace-signature.mjs` on it afterwards to derive the centreline the
 * component reveals it through:
 *
 *   node scripts/set-signature.mjs <font> && \
 *     node scripts/trace-signature.mjs src/content/signature-typeset.svg
 */

const FONT = process.argv[2];
const NAME = process.argv[3] || 'Kiarash';
const OUT = process.argv[4] || 'src/content/signature-typeset.svg';

if (!FONT) {
  console.error('usage: node scripts/set-signature.mjs <font file> [name] [out.svg]');
  process.exit(1);
}

/*
 * How wide the finished drawing is, in user units.
 *
 * Fixed on the drawing rather than on the type size, because a type size means
 * nothing across fonts: an em is 2048 units in one face and 1000 in the next,
 * and the same 260pt setting came out 584 units wide in one and 933 in another.
 * That matters twice. The mask width in `trace-signature.mjs` is in user units,
 * so it would mean something different per font; and the tracer rasterises at
 * six pixels per unit, so a drawing half again as wide costs more than twice as
 * much to thin. Pinning the width leaves both comparable.
 *
 * 560 is a unit finer than the thinning grid everywhere it matters, and close
 * to where the other two signatures in the repo were drawn.
 */
const WIDTH = 560;

/** Room for the round caps of the mask, which is stroked wider than the ink. */
const PAD = 18;

const font = opentype.loadSync(FONT);

/*
 * One path per glyph rather than one for the word. The tracer rasterises and
 * walks each `.ks-glyph` separately and the component writes them in document
 * order, so this is what makes the name arrive a letter at a time; a single
 * path would be one shape and would arrive all at once.
 *
 * `liga` is on because a script face uses ligatures to make its joins meet, and
 * kerning because it is a face that expects to be kerned. Anything the font
 * substitutes is still one path here, which is correct: a ligature is one mark.
 */
const set = (size) =>
  font
    .getPaths(NAME, 0, 0, size, { kerning: true, features: { liga: true, rlig: true } })
    .filter((path) => path.commands.length > 0);

const span = (list) => {
  const boxes = list.map((path) => path.getBoundingBox());
  return Math.max(...boxes.map((b) => b.x2)) - Math.min(...boxes.map((b) => b.x1));
};

// Set it once to find out how wide this face draws the name, then again at the
// size that makes it WIDTH. Twice is cheaper than reasoning about an em.
const probe = set(100);
if (probe.length === 0) throw new Error(`${basename(FONT)} drew nothing for "${NAME}"`);
const paths = set((100 * WIDTH) / span(probe));

const boxes = paths.map((path) => path.getBoundingBox());
const n = (v) => Math.round(v * 100) / 100;
const left = Math.min(...boxes.map((b) => b.x1)) - PAD;
const top = Math.min(...boxes.map((b) => b.y1)) - PAD;
const width = Math.max(...boxes.map((b) => b.x2)) + PAD - left;
const height = Math.max(...boxes.map((b) => b.y2)) + PAD - top;

/*
 * One decimal. The drawing is 560 units wide and is shown at 176px, so a
 * tenth of a unit is three hundredths of a pixel — below anything a screen can
 * show, and the path data is a sixth smaller for it. This matters because the
 * file is inlined into the front page rather than fetched: an ornate capital is
 * tens of kilobytes of outline whatever you do, and there is no reason to spend
 * a digit of it on nothing.
 *
 * The 1.4 stroke is what the tracer rasterises the glyph with, so it is carried
 * on the element rather than left to the tracer to assume.
 */
const glyphs = paths
  .map(
    (path) =>
      `<path class="ks-glyph" d="${path.toPathData(1)}" ` +
      `fill="#1a2b4a" stroke="#1a2b4a" stroke-width="1.4"></path>`,
  )
  .join('');

const file =
  `<svg viewBox="${n(left)} ${n(top)} ${n(width)} ${n(height)}" ` +
  `xmlns="http://www.w3.org/2000/svg" role="img"><defs></defs>${glyphs}</svg>`;
await writeFile(OUT, file + '\n');

console.log(
  `wrote ${OUT}: "${NAME}" in ${font.names.fullName?.en ?? basename(FONT)}, ` +
    `${paths.length} glyphs, ${n(width)}×${n(height)} units, ${file.length} bytes`,
);
// Both go into .banner__signature. The second is the share of the box that
// hangs below the letters' baseline: the box bottom is what sits on the line of
// type beside it, so without that offset the name floats above the line by the
// depth of its own descenders.
console.log(`  --signature-ratio: ${(height / width).toFixed(4)};`);
console.log(`  --signature-descent: ${((top + height) / height).toFixed(4)};`);
console.log(`now: node scripts/trace-signature.mjs ${OUT}`);
