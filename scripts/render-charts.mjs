import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { launchChromium } from './chromium.mjs';
import { rowsOf } from './chart-data.mjs';
import {
  CHART_FONT,
  CHART_SIZES,
  atSize,
  chartConfig,
  prepareSpec,
  seriesOf,
  sizesOf,
  withCrosshair,
} from './chart-theme.mjs';
import { DIAGRAM_FONT_FILE } from './diagram-source.mjs';

/*
 * Draws every Vega-Lite chart in the posts, once per page theme at each of the
 * widths the column can have (CHART_SIZES), and keeps the SVGs in
 * .cache/charts.json for the Markdown plugin to inline. It runs with
 * `npm run diagrams`, before the build, for the same reason Mermaid does: the
 * labels have to be measured in the face the reader sees, and that takes a
 * browser with the font loaded.
 *
 * The page arrives with these drawings and needs no script to show them. The
 * charting library is fetched only when a reader reaches for a chart, and it
 * redraws the same spec with the same theme at the same width, so the live
 * chart is the picture that was already there.
 */

const POSTS = resolve('src/content/posts');
const EXTRA = [resolve('src/content/about.md')];
const PUBLIC = resolve('public');
const CACHE = resolve('.cache/charts.json');
const VEGA = resolve('node_modules/vega/build/vega.min.js');
const VEGA_LITE = resolve('node_modules/vega-lite/build/vega-lite.min.js');

const FENCE = /^[ \t]*```vega-lite[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

/** Must match `chartHash` in plugins/charts.ts: the spec as drawn, the theme and the sizes. */
const hash = (spec) =>
  createHash('sha256')
    .update(JSON.stringify([spec, chartConfig('light'), chartConfig('dark'), CHART_SIZES]))
    .digest('hex')
    .slice(0, 16);

const readText = (path) => readFileSync(join(PUBLIC, path.replace(/^\/+/, '')), 'utf8');

async function sources() {
  const files = [
    ...(existsSync(POSTS)
      ? (await readdir(POSTS)).filter((f) => f.endsWith('.md')).map((f) => join(POSTS, f))
      : []),
    ...EXTRA.filter((f) => existsSync(f)),
  ];
  const found = new Map();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(FENCE)) {
      const source = match[1].trim();
      if (!source) continue;
      try {
        // The same steps, in the same order, as plugins/charts.ts.
        const prepared = prepareSpec(JSON.parse(source), readText);
        const spec = withCrosshair(prepared, seriesOf(prepared, rowsOf(prepared)));
        found.set(hash(spec), { spec, file: file.split('/').pop() });
      } catch (cause) {
        // The plugin reports the same problem against the post, with the
        // chart's place in it; here it is only left out.
        console.warn(`charts: ${file.split('/').pop()}: skipped a chart — ${cause.message}`);
      }
    }
  }
  return found;
}

async function loadCache() {
  if (!existsSync(CACHE)) return {};
  try {
    return JSON.parse(await readFile(CACHE, 'utf8'));
  } catch {
    return {};
  }
}

const wanted = await sources();
const cache = await loadCache();
for (const key of Object.keys(cache)) if (!wanted.has(key)) delete cache[key];
const missing = [...wanted].filter(([key]) => !cache[key]);

if (missing.length === 0) {
  await mkdir(dirname(CACHE), { recursive: true });
  await writeFile(CACHE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  console.log(`charts: ${wanted.size} up to date`);
  process.exit(0);
}

const browser = await launchChromium();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ path: VEGA });
await page.addScriptTag({ path: VEGA_LITE });
await page.waitForFunction(() => Boolean(window.vega && window.vegaLite), null, { timeout: 30000 });

// The face the page uses, so every label is measured as the reader sees it.
const fontData = (await readFile(resolve(DIAGRAM_FONT_FILE))).toString('base64');
await page.evaluate(async (data) => {
  const face = new FontFace(
    'Source Sans 3 Variable',
    `url(data:font/woff2;base64,${data}) format('woff2-variations')`,
    { weight: '200 900' },
  );
  await face.load();
  document.fonts.add(face);
  await document.fonts.ready;
}, fontData);

let failures = 0;
for (const [key, { spec, file }] of missing) {
  const rendered = {};
  let failed = false;
  for (const size of sizesOf(spec)) {
    rendered[size.name] = {};
    for (const mode of ['light', 'dark']) {
      const result = await page.evaluate(
        async ([chart, config]) => {
          try {
            const { spec: compiled } = window.vegaLite.compile(chart, { config });
            const view = new window.vega.View(window.vega.parse(compiled), { renderer: 'none' });
            const svg = await view.toSVG();
            view.finalize();
            return { svg };
          } catch (cause) {
            return { error: String(cause && cause.message ? cause.message : cause) };
          }
        },
        [atSize(spec, size), chartConfig(mode)],
      );
      if (result.error) {
        console.warn(`charts: ${file}: a chart failed (${size.name}, ${mode}) — ${result.error}`);
        failed = true;
        break;
      }
      rendered[size.name][mode] = result.svg;
    }
    if (failed) break;
  }
  if (failed) failures += 1;
  else cache[key] = rendered;
}

await browser.close();
await mkdir(dirname(CACHE), { recursive: true });
await writeFile(CACHE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
console.log(
  `charts: rendered ${missing.length - failures}/${missing.length} in ${CHART_FONT}, ` +
    `${Object.keys(cache).length} cached`,
);
