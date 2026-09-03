import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, normalize } from 'node:path';

const dist = resolve('dist');
const checkExternal = process.argv.includes('--external');

/**
 * A deployment under a subdirectory writes links as `/<base>/posts/x`, which
 * still resolve to `dist/posts/x`. The base is read back off the built entry
 * page rather than passed in, so the check needs no knowledge of the build.
 */
async function basePrefix() {
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  const match = /(?:src|href)="([^"]*)\/assets\//.exec(html);
  return match ? match[1] : '';
}

const base = await basePrefix();

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
  let path = url.split(/[?#]/)[0];
  if (!path) return null;
  if (base === path) path = '/';
  else if (base && path.startsWith(`${base}/`)) path = path.slice(base.length);

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
const missingBase = new Map();
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

    // A site-absolute link that skips the base resolves here but 404s in a
    // browser, so it is reported rather than silently stripped.
    if (base && url.startsWith('/') && url !== base && !url.startsWith(`${base}/`)) {
      missingBase.set(`${url} (from ${file.replace(`${dist}/`, '')})`, true);
      continue;
    }

    if (!targetFor(url, file)) {
      internal.set(`${url} (from ${file.replace(`${dist}/`, '')})`, true);
    }
  }
}

const broken = [...internal.keys()];
const unprefixed = [...missingBase.keys()];
for (const problem of broken) console.error(`broken internal link: ${problem}`);
for (const problem of unprefixed) console.error(`link missing the base prefix: ${problem}`);
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
  `links: ${files.length} pages${base ? ` under ${base}` : ''}, ${broken.length} broken internal, ` +
    `${unprefixed.length} missing the base prefix, ${fragments.length} broken fragments, ` +
    `${external.size} external${checkExternal ? ` (${externalFailures} failing)` : ' (not checked)'}`,
);

// External links rot for reasons outside this repository, so they are reported
// but do not fail the build; anything internal is ours and should never break.
if (broken.length > 0 || unprefixed.length > 0 || fragments.length > 0) process.exit(1);
