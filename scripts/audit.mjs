import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve('dist');
const axeSource = resolve('node_modules/axe-core/axe.min.js');

// A subdirectory deployment prefixes every asset URL; serve those from the
// root of dist so the audited pages are styled and scripted as published.
const html = await readFile(join(dist, 'index.html'), 'utf8');
const basePath = /(?:src|href)="([^"]*)\/assets\//.exec(html)?.[1] ?? '';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

async function resolveFile(pathname) {
  let path = decodeURIComponent(pathname);
  if (basePath && path.startsWith(`${basePath}/`)) path = path.slice(basePath.length);
  const target = join(dist, path.replace(/^\/+/, ''));
  try {
    const info = await stat(target);
    if (info.isDirectory()) return join(target, 'index.html');
    return target;
  } catch {
    return join(dist, '404.html');
  }
}

const server = createServer(async (request, response) => {
  const file = await resolveFile(new URL(request.url, 'http://localhost').pathname);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

// An already-provisioned Chromium can be used instead of Playwright's own
// download, which is what sandboxes and CI images with a browser baked in
// need: set CHROMIUM_EXECUTABLE to its path.
const launchOptions = process.env.CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
  : {};

await new Promise((done) => server.listen(0, done));
const base = `http://localhost:${server.address().port}`;

// One page of each kind rather than all of them: the templates are shared, so
// a violation on one post is a violation on every post.
const routes = [
  '/',
  '/posts/code-tables-and-notes/',
  '/publications/',
  '/archive/',
  '/tags/',
  '/tags/guide/',
  '/authors/you/',
  '/search/',
  '/about/',
  '/404.html',
];

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
const axe = await readFile(axeSource, 'utf8');
let total = 0;

for (const route of routes) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: axe });
  const results = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  );

  for (const violation of results.violations) {
    total += 1;
    console.error(`${route} — ${violation.id} (${violation.impact}): ${violation.help}`);
    for (const node of violation.nodes.slice(0, 3)) {
      console.error(`    ${node.html.slice(0, 120)}`);
    }
  }
}

await browser.close();
server.close();

console.log(`audit: ${routes.length} routes, ${total} accessibility violations`);
if (total > 0) process.exit(1);
