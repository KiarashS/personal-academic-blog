import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { launchChromium } from './chromium.mjs';

/**
 * Whether a signature's mask uncovers all of its letters once it has finished.
 *
 *   node scripts/check-signature.mjs src/content/signature-damion.svg [map.png]
 *
 * A traced or typeset signature is filled letters shown through a mask of pen
 * strokes (scripts/trace-signature.mjs), and a pen narrower than the letter
 * at its fattest leaves a sliver of it hidden for good: the Damion K had a
 * notch in its stem where the curl joins it, because the 22-unit pen missed
 * the stem's left edge there. This draws the letters twice, plainly and
 * through the whole mask, and counts the ink the second leaves out. The map,
 * if asked for, shows that ink in red on the grey letters.
 *
 * A few pixels along an edge are antialiasing, so it fails only on a missed
 * patch: more than 6 pixels in one 20-pixel square at 1600px wide.
 */

const [file, map] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/check-signature.mjs <signature.svg> [map.png]');
  process.exit(2);
}

const WIDTH = 1600;
const CELL = 20;
const PATCH = 6;

const browser = await launchChromium();
const page = await browser.newPage();
const result = await page.evaluate(
  async ({ svg, width, cell }) => {
    const draw = async (masked) => {
      const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const box = root
        .getAttribute('viewBox')
        .split(/[\s,]+/)
        .map(Number);
      root.setAttribute('width', String(width));
      root.setAttribute('height', String(Math.round((width * box[3]) / box[2])));
      for (const glyph of root.querySelectorAll('.ks-glyph')) {
        glyph.setAttribute('fill', '#000');
        if (!masked) glyph.removeAttribute('mask');
      }
      const source = new XMLSerializer().serializeToString(root);
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      return { canvas, data: context.getImageData(0, 0, canvas.width, canvas.height) };
    };

    const plain = await draw(false);
    const masked = await draw(true);
    const { canvas } = plain;
    const context = canvas.getContext('2d');
    const out = context.createImageData(canvas.width, canvas.height);
    const cells = {};
    let ink = 0;
    let missed = 0;
    for (let i = 0; i < plain.data.data.length; i += 4) {
      const isInk = plain.data.data[i] < 128;
      const isMissed = isInk && masked.data.data[i] >= 128;
      if (isInk) ink += 1;
      if (isMissed) {
        missed += 1;
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);
        const key = `${x - (x % cell)},${y - (y % cell)}`;
        cells[key] = (cells[key] ?? 0) + 1;
      }
      out.data.set(
        isMissed ? [220, 30, 30, 255] : isInk ? [90, 90, 90, 255] : [255, 255, 255, 255],
        i,
      );
    }
    context.putImageData(out, 0, 0);
    return { ink, missed, cells, png: canvas.toDataURL('image/png') };
  },
  { svg: readFileSync(file, 'utf8'), width: WIDTH, cell: CELL },
);
await browser.close();

if (map) writeFileSync(map, Buffer.from(result.png.split(',')[1], 'base64'));
const patches = Object.entries(result.cells).filter(([, count]) => count > PATCH);
const name = basename(file);
if (patches.length === 0) {
  console.log(`${name}: every letter is uncovered (${result.missed} edge pixels of ${result.ink})`);
} else {
  console.log(
    `${name}: the mask leaves ${result.missed} pixels of ink hidden, in ${patches.length} ` +
      `patches; the largest at ${patches
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([at, count]) => `${at} (${count})`)
        .join(', ')}, in pixels at ${WIDTH}px wide. A wider pen in the mask closes them.`,
  );
  process.exitCode = 1;
}
