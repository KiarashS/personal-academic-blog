import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

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

  const found = new Map();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(FENCE)) {
      const source = match[1].trim();
      if (source) found.set(hash(source), source);
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

let failures = 0;

for (const [key, source] of missing) {
  const rendered = {};
  for (const [name, theme] of [
    ['light', 'neutral'],
    ['dark', 'dark'],
  ]) {
    const result = await page.evaluate(
      async ([diagram, mermaidTheme, id]) => {
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            suppressErrorRendering: true,
            theme: mermaidTheme,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          });
          const { svg } = await window.mermaid.render(id, diagram);
          return { svg };
        } catch (cause) {
          return { error: String(cause && cause.message ? cause.message : cause) };
        }
      },
      [source, theme, `d-${key}-${name}`],
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

await mkdir(dirname(CACHE), { recursive: true });
await writeFile(CACHE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');

console.log(
  `diagrams: rendered ${missing.length - failures}/${missing.length}, ${Object.keys(cache).length} cached`,
);
