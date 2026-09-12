import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

/*
 * Renders `public/favicons/` from the logo SVGs.
 *
 *   node scripts/render-icons.mjs
 *
 * Run it after `scripts/draw-logo.mjs`. Nothing in `npm run build` calls it:
 * the PNGs are committed, and making them needs a browser.
 *
 * Which drawing each size gets is the whole point of the file. The frosted
 * logo is a blur, and a blur at sixteen pixels is a smudge, so the small sizes
 * take the flat two-colour version and only the sizes with room take the glass.
 * That is not a compromise — an icon set is supposed to be redrawn per size,
 * and this is the cheap version of doing so.
 */
const SOURCES = {
  glass: 'src/content/logo.svg',
  flat: 'src/content/logo-icon.svg',
  maskable: 'src/content/logo-maskable.svg',
};

const TARGETS = [
  { file: 'favicon-16x16.png', size: 16, from: 'flat' },
  { file: 'favicon-32x32.png', size: 32, from: 'flat' },
  { file: 'apple-touch-icon.png', size: 76, from: 'flat' },
  { file: 'apple-touch-icon-180x180.png', size: 180, from: 'glass' },
  { file: 'icon-192.png', size: 192, from: 'glass' },
  { file: 'icon-512.png', size: 512, from: 'glass' },
  { file: 'icon-maskable-512.png', size: 512, from: 'maskable' },
];

/** The sizes that go into favicon.ico, which is still what some clients read. */
const ICO = [16, 32, 48];

const out = resolve('public/favicons');
const svg = Object.fromEntries(
  await Promise.all(
    Object.entries(SOURCES).map(async ([key, path]) => [key, await readFile(path, 'utf8')]),
  ),
);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage();

/**
 * One PNG, rendered at exactly its own pixel size.
 *
 * At `deviceScaleFactor: 1` and a viewport the size of the icon, what the
 * browser rasterises is what gets written — no resampling afterwards, which is
 * what left the old set soft.
 */
async function render(source, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">` +
      `<div style="width:${size}px;height:${size}px">` +
      svg[source].replace('<svg ', '<svg style="width:100%;height:100%;display:block" ') +
      `</div></body>`,
  );
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

const written = [];
for (const target of TARGETS) {
  const png = await render(target.from, target.size);
  await writeFile(resolve(out, target.file), png);
  written.push(`${target.file} (${target.from})`);
}

/*
 * favicon.ico, which is a container rather than a format: modern readers accept
 * whole PNGs inside it, so each size goes in as the PNG that was just rendered.
 * A directory entry records 0 for a 256-pixel side, which is why the byte is
 * masked rather than assigned.
 */
const frames = await Promise.all(
  ICO.map((size) => render('flat', size).then((data) => ({ size, data }))),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(frames.length, 4);

let offset = header.length + frames.length * 16;
const directory = [];
for (const frame of frames) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(frame.size & 0xff, 0);
  entry.writeUInt8(frame.size & 0xff, 1);
  entry.writeUInt8(0, 2); // palette size: none, it is a PNG
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(frame.data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += frame.data.length;
  directory.push(entry);
}

await writeFile(
  resolve(out, 'favicon.ico'),
  Buffer.concat([header, ...directory, ...frames.map((frame) => frame.data)]),
);

await browser.close();

console.log(`icons: ${written.join(', ')}`);
console.log(`favicon.ico: ${frames.map((f) => `${f.size}px`).join(', ')}`);
