import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;

const { render, allRoutes, metaFor, posts, siteConfig, canonicalUrl, withBase, loadPostHtml } =
  await import(serverEntry);

const template = await readFile(join(dist, 'index.html'), 'utf8');
const TITLE_TAG = '<title>Notes</title>';

const escapeXml = (value) =>
  String(value).replace(
    /[<>&'"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char],
  );

function head({ title, description, url, type }) {
  return [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}" />`,
    `<link rel="canonical" href="${escapeXml(url)}" />`,
    `<link rel="alternate" type="application/atom+xml" title="${escapeXml(siteConfig.title)}" href="${escapeXml(canonicalUrl('/feed.xml'))}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${escapeXml(siteConfig.title)}" />`,
    `<meta property="og:title" content="${escapeXml(title)}" />`,
    `<meta property="og:description" content="${escapeXml(description)}" />`,
    `<meta property="og:url" content="${escapeXml(url)}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeXml(title)}" />`,
    `<meta name="twitter:description" content="${escapeXml(description)}" />`,
  ].join('\n    ');
}

function pageFor(route) {
  const post =
    route.startsWith('/posts/') &&
    posts.find((candidate) => `/posts/${candidate.slug}` === route);
  return { ...metaFor(route), url: canonicalUrl(route), type: post ? 'article' : 'website' };
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

const basename = withBase('/') || '/';

for (const route of allRoutes()) {
  const html = await render(route, basename);
  const relative = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  await write(relative, document(html, pageFor(route)));
}

// Unknown paths: static hosts serve 404.html, which boots the router and
// renders whatever the path turns out to be.
const missing = await render('/__not_found__', basename);
await write(
  '404.html',
  document(missing, { ...metaFor('/__not_found__'), url: canonicalUrl('/404'), type: 'website' }),
);

const iso = (date) => new Date(`${date}T00:00:00Z`).toISOString();
const lastUpdated = posts[0] ? iso(posts[0].updated ?? posts[0].date) : new Date().toISOString();

const entries = await Promise.all(
  posts.map(async (post) => {
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
  }),
);

await write(
  'feed.xml',
  [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(siteConfig.title)}</title>`,
    `  <subtitle>${escapeXml(siteConfig.description)}</subtitle>`,
    `  <id>${escapeXml(canonicalUrl('/'))}</id>`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(canonicalUrl('/'))}" />`,
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(canonicalUrl('/feed.xml'))}" />`,
    `  <updated>${lastUpdated}</updated>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n'),
);

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

await write(
  'robots.txt',
  ['User-agent: *', 'Allow: /', `Sitemap: ${canonicalUrl('/sitemap.xml')}`, ''].join('\n'),
);

console.log(
  `prerendered ${allRoutes().length} routes, 404.html, feed.xml, sitemap.xml and robots.txt`,
);
