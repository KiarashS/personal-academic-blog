import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;

const {
  render,
  allRoutes,
  metaFor,
  posts,
  siteConfig,
  canonicalUrl,
  withBase,
  loadPostHtml,
  tagCounts,
  postsByTag,
  tagSlug,
  categoryCounts,
  postsInCategory,
} = await import(serverEntry);

const template = await readFile(join(dist, 'index.html'), 'utf8');

/**
 * The body face is only discovered once the stylesheet has been parsed, which
 * costs a round trip on first view. Preloading the roman weight starts it with
 * the CSS. The filename is hashed by the build, so it is looked up rather than
 * hard-coded; italic is left to load on demand.
 */
async function fontPreload() {
  const assets = await readdir(join(dist, 'assets')).catch(() => []);
  const roman = assets.find((name) => /wght-normal.*\.woff2$/.test(name));
  if (!roman) return '';
  return (
    `\n    <link rel="preload" as="font" type="font/woff2" crossorigin ` +
    `href="${escapeXml(withBase(`/assets/${roman}`))}" />`
  );
}
const TITLE_TAG = /<title>[\s\S]*?<\/title>/;

if (!TITLE_TAG.test(template)) {
  throw new Error('dist/index.html has no <title> to replace; the head would not be injected.');
}

const escapeXml = (value) =>
  String(value).replace(
    /[<>&'"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char],
  );

const preload = await fontPreload();

/*
 * Cloudflare Web Analytics, when a token is configured: one deferred script
 * from Cloudflare, no cookies and no identifier that follows a reader between
 * sites. With no token the tag is not written at all, so the default build
 * talks to nobody.
 */
const analytics = siteConfig.analytics?.cloudflareToken
  ? `\n    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" ` +
    `data-cf-beacon='${JSON.stringify({ token: siteConfig.analytics.cloudflareToken })}'></script>`
  : '';

function head({ title, description, url, type, image, feed }) {
  return (
    [
      `<title>${escapeXml(title)}</title>`,
      `<meta name="description" content="${escapeXml(description)}" />`,
      `<link rel="canonical" href="${escapeXml(url)}" />`,
      // Vite rewrites icon hrefs in index.html but not rel="manifest", and the
      // manifest is generated here anyway, so it is written with the base applied.
      `<link rel="manifest" href="${escapeXml(withBase('/site.webmanifest'))}" />`,
      `<link rel="alternate" type="application/atom+xml" title="${escapeXml(siteConfig.title)}" href="${escapeXml(canonicalUrl('/feed.xml'))}" />`,
      ...(feed
        ? [
            `<link rel="alternate" type="application/atom+xml" title="${escapeXml(feed.title)}" href="${escapeXml(feed.href)}" />`,
          ]
        : []),
      `<meta property="og:type" content="${type}" />`,
      `<meta property="og:site_name" content="${escapeXml(siteConfig.title)}" />`,
      `<meta property="og:title" content="${escapeXml(title)}" />`,
      `<meta property="og:description" content="${escapeXml(description)}" />`,
      `<meta property="og:url" content="${escapeXml(url)}" />`,
      ...(image
        ? [
            `<meta property="og:image" content="${escapeXml(image)}" />`,
            '<meta property="og:image:width" content="1200" />',
            '<meta property="og:image:height" content="630" />',
            `<meta name="twitter:image" content="${escapeXml(image)}" />`,
          ]
        : []),
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
      `<meta name="twitter:title" content="${escapeXml(title)}" />`,
      `<meta name="twitter:description" content="${escapeXml(description)}" />`,
    ].join('\n    ') +
    preload +
    analytics
  );
}

function cardFor(slug) {
  const file = join(dist, 'og', `${slug}.png`);
  return existsSync(file) ? canonicalUrl(`/og/${slug}.png`) : undefined;
}

function pageFor(route) {
  const post =
    route.startsWith('/posts/') && posts.find((candidate) => `/posts/${candidate.slug}` === route);
  const tag = /^\/tags\/([^/]+)/.exec(route)?.[1];
  const category = /^\/categories\/([^/]+)/.exec(route)?.[1];

  return {
    ...metaFor(route),
    url: canonicalUrl(route),
    type: post ? 'article' : 'website',
    image: post ? cardFor(post.slug) : cardFor('site'),
    feed: tag
      ? { title: `${siteConfig.title}: ${tag}`, href: canonicalUrl(`/tags/${tag}/feed.xml`) }
      : category
        ? {
            title: `${siteConfig.title}: ${category}`,
            href: canonicalUrl(`/categories/${category}/feed.xml`),
          }
        : undefined,
  };
}

function document(html, meta) {
  return template
    .replace(TITLE_TAG, head(meta))
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

async function write(relative, contents) {
  const target = join(dist, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

// React Router matches the location against the basename, so a prerendered
// path has to carry the base prefix; without it nothing matches and the body
// comes out empty.
const rawBase = withBase('/') || '/';
const basename = rawBase === '/' ? '/' : rawBase.replace(/\/$/, '');
const locationOf = (route) => (basename === '/' ? route : `${basename}${route}`);

for (const route of allRoutes()) {
  const html = await render(locationOf(route), basename);
  // An empty body means the router matched nothing — a basename or route
  // mismatch. It is invisible in the browser, because the client renders the
  // page anyway, so fail the build instead of shipping hollow HTML.
  if (html.trim() === '') {
    throw new Error(`Prerendering ${route} produced an empty document (basename ${basename}).`);
  }
  const relative = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  await write(relative, document(html, pageFor(route)));
}

// Unknown paths: static hosts serve 404.html, which boots the router and
// renders whatever the path turns out to be.
const missing = await render(locationOf('/__not_found__'), basename);
await write(
  '404.html',
  document(missing, { ...metaFor('/__not_found__'), url: canonicalUrl('/404'), type: 'website' }),
);

const iso = (date) => new Date(`${date}T00:00:00Z`).toISOString();

async function entryFor(post) {
  const url = canonicalUrl(`/posts/${post.slug}`);
  const html = await loadPostHtml(post.slug);
  return [
    '  <entry>',
    `    <title>${escapeXml(post.title)}</title>`,
    `    <link rel="alternate" type="text/html" href="${escapeXml(url)}" />`,
    `    <id>${escapeXml(url)}</id>`,
    `    <published>${iso(post.date)}</published>`,
    `    <updated>${iso(post.updated ?? post.date)}</updated>`,
    ...post.authors.map((author) => `    <author><name>${escapeXml(author.name)}</name></author>`),
    ...post.tags.map((tag) => `    <category term="${escapeXml(tag)}" />`),
    `    <summary>${escapeXml(post.summary)}</summary>`,
    `    <content type="html">${escapeXml(html)}</content>`,
    '  </entry>',
  ].join('\n');
}

async function writeFeed({ path, title, subtitle, alternate, entries }) {
  const newest = entries[0];
  const rendered = await Promise.all(entries.map(entryFor));

  await write(
    path,
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
      `  <title>${escapeXml(title)}</title>`,
      `  <subtitle>${escapeXml(subtitle)}</subtitle>`,
      `  <id>${escapeXml(canonicalUrl(alternate))}</id>`,
      `  <link rel="alternate" type="text/html" href="${escapeXml(canonicalUrl(alternate))}" />`,
      `  <link rel="self" type="application/atom+xml" href="${escapeXml(canonicalUrl(`/${path}`))}" />`,
      `  <updated>${newest ? iso(newest.updated ?? newest.date) : new Date().toISOString()}</updated>`,
      ...rendered,
      '</feed>',
      '',
    ].join('\n'),
  );
}

await writeFeed({
  path: 'feed.xml',
  title: siteConfig.title,
  subtitle: siteConfig.description,
  alternate: '/',
  entries: posts,
});

// One feed per category, for a reader who wants the shelf and not the archive.
for (const { category } of categoryCounts()) {
  await writeFeed({
    path: `categories/${category.slug}/feed.xml`,
    title: `${siteConfig.title}: ${category.label}`,
    subtitle: category.description ?? `Posts in ${category.label}.`,
    alternate: `/categories/${category.slug}`,
    entries: postsInCategory(category.slug),
  });
}

// One feed per tag, so a reader can follow a single line of work.
for (const { tag } of tagCounts()) {
  const slug = tagSlug(tag);
  await writeFeed({
    path: `tags/${slug}/feed.xml`,
    title: `${siteConfig.title}: ${tag}`,
    subtitle: `Posts tagged ${tag}.`,
    alternate: `/tags/${slug}`,
    entries: postsByTag(slug),
  });
}

await write(
  'sitemap.xml',
  [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allRoutes().map((route) => {
      const post = posts.find((candidate) => `/posts/${candidate.slug}` === route);
      const lastmod = post ? (post.updated ?? post.date) : undefined;
      return [
        '  <url>',
        `    <loc>${escapeXml(canonicalUrl(route))}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    }),
    '</urlset>',
    '',
  ].join('\n'),
);

// The manifest and the service worker are generated rather than kept in
// public/, so they read the site's own configuration and so the worker's cache
// name changes whenever the built assets do.
const assetNames = (await readdir(join(dist, 'assets')).catch(() => [])).sort();
const buildStamp = createHash('sha256').update(assetNames.join('|')).digest('hex').slice(0, 12);

await write(
  'site.webmanifest',
  `${JSON.stringify(
    {
      name: siteConfig.title,
      short_name: siteConfig.shortName,
      description: siteConfig.description,
      // Relative to the manifest, so a subdirectory deployment needs no edit.
      id: './',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#fdfdfc',
      theme_color: '#fdfdfc',
      icons: [
        { src: 'favicons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'favicons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: 'favicons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    null,
    2,
  )}\n`,
);

await write(
  'sw.js',
  `/* Generated by scripts/prerender.mjs — edit that, not this. */
const CACHE = 'site-${buildStamp}';
const START = ${JSON.stringify(withBase('/'))};

/*
 * Navigations go to the network first, so a reader online never sees a stale
 * page; the cache is the fallback when the network fails. Everything else is
 * cache-first, which is safe because the build gives assets hashed names.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(START)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(START))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
`,
);

await write(
  'robots.txt',
  ['User-agent: *', 'Allow: /', `Sitemap: ${canonicalUrl('/sitemap.xml')}`, ''].join('\n'),
);

console.log(
  `prerendered ${allRoutes().length} routes, 404.html, feeds, sitemap.xml, robots.txt, ` +
    `site.webmanifest and sw.js (${buildStamp})`,
);
