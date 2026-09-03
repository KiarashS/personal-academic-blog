import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
} = await import(serverEntry);

const template = await readFile(join(dist, 'index.html'), 'utf8');
const TITLE_TAG = /<title>[\s\S]*?<\/title>/;

if (!TITLE_TAG.test(template)) {
  throw new Error('dist/index.html has no <title> to replace; the head would not be injected.');
}

const escapeXml = (value) =>
  String(value).replace(
    /[<>&'"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char],
  );

function head({ title, description, url, type, image, feed }) {
  return [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}" />`,
    `<link rel="canonical" href="${escapeXml(url)}" />`,
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
  ].join('\n    ');
}

function cardFor(slug) {
  const file = join(dist, 'og', `${slug}.png`);
  return existsSync(file) ? canonicalUrl(`/og/${slug}.png`) : undefined;
}

function pageFor(route) {
  const post =
    route.startsWith('/posts/') && posts.find((candidate) => `/posts/${candidate.slug}` === route);
  const tag = /^\/tags\/([^/]+)/.exec(route)?.[1];

  return {
    ...metaFor(route),
    url: canonicalUrl(route),
    type: post ? 'article' : 'website',
    image: post ? cardFor(post.slug) : cardFor('site'),
    feed: tag
      ? { title: `${siteConfig.title}: ${tag}`, href: canonicalUrl(`/tags/${tag}/feed.xml`) }
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

await write(
  'robots.txt',
  ['User-agent: *', 'Allow: /', `Sitemap: ${canonicalUrl('/sitemap.xml')}`, ''].join('\n'),
);

console.log(
  `prerendered ${allRoutes().length} routes, 404.html, feed.xml, sitemap.xml and robots.txt`,
);
