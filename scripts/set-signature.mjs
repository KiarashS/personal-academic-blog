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
 * Big enough that a user unit is finer than the thinning grid in
 * `trace-signature.mjs`, and close to the scale the other two signatures are
 * drawn at, so a mask width means the same thing across all three.
 */
const SIZE = 260;

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
const paths = font
  .getPaths(NAME, 0, 0, SIZE, { kerning: true, features: { liga: true, rlig: true } })
  .filter((path) => path.commands.length > 0);

if (paths.length === 0) throw new Error(`${basename(FONT)} drew nothing for "${NAME}"`);

const boxes = paths.map((path) => path.getBoundingBox());
const n = (v) => Math.round(v * 100) / 100;
const left = Math.min(...boxes.map((b) => b.x1)) - PAD;
const top = Math.min(...boxes.map((b) => b.y1)) - PAD;
const width = Math.max(...boxes.map((b) => b.x2)) + PAD - left;
const height = Math.max(...boxes.map((b) => b.y2)) + PAD - top;

// The 1.4 stroke is what the tracer rasterises the glyph with, so it is carried
// on the element rather than left to the tracer to assume.
const glyphs = paths
  .map(
    (path) =>
      `<path class="ks-glyph" d="${path.toPathData(2)}" ` +
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
