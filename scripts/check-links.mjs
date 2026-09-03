import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, normalize } from 'node:path';

const dist = resolve('dist');
const checkExternal = process.argv.includes('--external');

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

const ATTR = /(?:href|src)\s*=\s*"([^"]+)"/g;

/** Where a site-absolute or relative URL lands in dist. */
function targetFor(url, file) {
  const path = url.split(/[?#]/)[0];
  if (!path) return null;

  const absolute = path.startsWith('/')
    ? join(dist, path.replace(/^\/+/, ''))
    : normalize(join(dirname(file), path));

  if (existsSync(absolute)) {
    return absolute.endsWith('/') || !/\.[a-z0-9]+$/i.test(absolute)
      ? existsSync(join(absolute, 'index.html'))
        ? join(absolute, 'index.html')
        : absolute
      : absolute;
  }
  if (existsSync(`${absolute}.html`)) return `${absolute}.html`;
  if (existsSync(join(absolute, 'index.html'))) return join(absolute, 'index.html');
  return null;
}

const files = await htmlFiles(dist);
const internal = new Map();
const external = new Set();
const fragments = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

  for (const [, url] of html.matchAll(ATTR)) {
    if (/^(https?:)?\/\//.test(url)) {
      if (url.startsWith('http')) external.add(url);
      continue;
    }
    if (/^(mailto:|data:|javascript:|tel:)/.test(url)) continue;

    if (url.startsWith('#')) {
      const id = decodeURIComponent(url.slice(1));
      if (id && !ids.has(id)) fragments.push(`${file}: no element with id "${id}"`);
      continue;
    }

    if (!targetFor(url, file)) {
      internal.set(`${url} (from ${file.replace(`${dist}/`, '')})`, true);
    }
  }
}

const broken = [...internal.keys()];
for (const problem of broken) console.error(`broken internal link: ${problem}`);
for (const problem of fragments) console.error(`broken fragment: ${problem}`);

let externalFailures = 0;
if (checkExternal) {
  for (const url of external) {
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      // Some hosts refuse HEAD; a GET decides those.
      const status = response.status === 405 ? (await fetch(url)).status : response.status;
      if (status >= 400) {
        console.error(`external link ${status}: ${url}`);
        externalFailures += 1;
      }
    } catch (cause) {
      console.error(`external link failed: ${url} — ${String(cause)}`);
      externalFailures += 1;
    }
  }
}

console.log(
  `links: ${files.length} pages, ${broken.length} broken internal, ${fragments.length} broken fragments, ` +
    `${external.size} external${checkExternal ? ` (${externalFailures} failing)` : ' (not checked)'}`,
);

// External links rot for reasons outside this repository, so they are reported
// but do not fail the build; anything internal is ours and should never break.
if (broken.length > 0 || fragments.length > 0) process.exit(1);
