import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  DIAGRAM_FONT,
  DIAGRAM_FONT_FILE,
  DIAGRAM_THEMES,
  MERMAID_THEMES,
  withoutPinnedTheme,
} from './diagram-source.mjs';

const POSTS = resolve('src/content/posts');
const EXTRA = [resolve('src/content/about.md')];
const CACHE = resolve('.cache/diagrams.json');
// The UMD build defines window.mermaid and bundles every diagram type,
// which avoids resolving lazy chunks inside a blank page.
const MERMAID = resolve('node_modules/mermaid/dist/mermaid.min.js');

const FENCE = /^[ \t]*```mermaid[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

const hash = (source) => createHash('sha256').update(source.trim()).digest('hex').slice(0, 16);

async function sources() {
  const files = [
    ...(existsSync(POSTS)
      ? (await readdir(POSTS)).filter((f) => f.endsWith('.md')).map((f) => join(POSTS, f))
      : []),
    ...EXTRA.filter((f) => existsSync(f)),
  ];

  // Keyed by a hash of the source as written, so the plugin that looks an
  // entry up from the same text finds it. The theme is taken out when the
  // diagram is drawn, not when it is counted.
  const found = new Map();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(FENCE)) {
      const source = match[1].trim();
      if (source) found.set(hash(source), { source, file: file.split('/').pop() });
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

// An already-provisioned Chromium can be used instead of Playwright's own
// download, which is what sandboxes and CI images with a browser baked in
// need: set CHROMIUM_EXECUTABLE to its path.
const launchOptions = process.env.CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
  : {};

const wanted = await sources();
const cache = await loadCache();
const missing = [...wanted].filter(([key]) => !cache[key]);

if (missing.length === 0) {
  console.log(`diagrams: ${wanted.size} up to date`);
  process.exit(0);
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ path: MERMAID });
await page.waitForFunction(() => Boolean(window.mermaid), null, { timeout: 30000 });

/*
 * The face the reader will see, loaded from the same file the site serves and
 * awaited before a single label is measured. Without it this page falls back
 * to whatever sans the build machine happens to have — Liberation Sans on CI —
 * and every label box is cut to the wrong width.
 */
let fontData;
try {
  fontData = (await readFile(resolve(DIAGRAM_FONT_FILE))).toString('base64');
} catch (cause) {
  console.error(
    `diagrams: cannot read ${DIAGRAM_FONT_FILE} (${cause.code ?? cause.message}). Every label ` +
      'would be measured in whatever sans this machine has and cut to that width, so no ' +
      'diagram is written.',
  );
  await browser.close();
  process.exit(1);
}
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
const fontOk = await page.evaluate(() => document.fonts.check('16px "Source Sans 3 Variable"'));
if (!fontOk) {
  console.error(
    `diagrams: ${DIAGRAM_FONT_FILE} loaded but the browser will not use it, so every label ` +
      'would be cut to the wrong width. No diagram is written.',
  );
  await browser.close();
  process.exit(1);
}

let failures = 0;

const pinned = [];

for (const [key, { source: written, file }] of missing) {
  /*
   * A `theme:` in the diagram's own frontmatter outranks the one passed to
   * `initialize`, so both renders would come out the same and a dark page
   * would show a light diagram. It is taken out here and said out loud below.
   */
  const { source, theme: pinnedTheme } = withoutPinnedTheme(written);
  if (pinnedTheme !== undefined) pinned.push({ file, theme: pinnedTheme });

  const rendered = {};
  for (const [name, theme] of [
    ['light', DIAGRAM_THEMES.light],
    ['dark', DIAGRAM_THEMES.dark],
  ]) {
    const result = await page.evaluate(
      async ([diagram, mermaidTheme, id, font]) => {
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            suppressErrorRendering: true,
            theme: mermaidTheme,
            fontFamily: font,
          });
          const { svg } = await window.mermaid.render(id, diagram);
          return { svg };
        } catch (cause) {
          return { error: String(cause && cause.message ? cause.message : cause) };
        }
      },
      [source, theme, `d-${key}-${name}`, DIAGRAM_FONT],
    );

    if (result.error) {
      console.warn(`diagrams: ${key} (${name}) failed — ${result.error}`);
      failures += 1;
      rendered.failed = true;
      break;
    }
    rendered[name] = result.svg;
  }

  // A diagram that fails here is left out of the cache and falls back to
  // rendering in the browser, so one bad fence costs one diagram.
  if (!rendered.failed) cache[key] = rendered;
}

await browser.close();

// Drop entries for diagrams that no longer appear in any post.
for (const key of Object.keys(cache)) {
  if (!wanted.has(key)) delete cache[key];
}

for (const { file, theme } of pinned) {
  const known = MERMAID_THEMES.includes(theme);
  console.warn(
    `diagrams: ${file} pins \`theme: ${theme}\` in a diagram's frontmatter. ` +
      (known
        ? 'Every diagram is drawn once per page theme and the page swaps between them, ' +
          'so a pinned theme would show the same colours on a dark page as a light one. '
        : `“${theme}” is not one of ${MERMAID_THEMES.join(', ')} — mermaid takes an unknown ` +
          'theme without complaint and draws the diagram with no palette at all. ') +
      'It has been ignored; `look:` and the rest of the block are kept. Change ' +
      'DIAGRAM_THEMES in scripts/diagram-source.mjs to restyle every diagram.',
  );
}

await mkdir(dirname(CACHE), { recursive: true });
await writeFile(CACHE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');

console.log(
  `diagrams: rendered ${missing.length - failures}/${missing.length}, ${Object.keys(cache).length} cached`,
);
