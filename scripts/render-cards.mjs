import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const { posts, siteConfig } = await import(serverEntry);

/*
 * The logo, inlined rather than linked. The card is rendered from a string with
 * no server behind it, so a `src` would have nothing to resolve against; and at
 * 104px the frosted version is one of the few places on the site with room to
 * be seen properly.
 */
const logo = await readFile(resolve('src/content/logo.svg'), 'utf8');

const MIME = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

/*
 * A post's banner, as a data URI to lay behind its card. The page is rendered
 * from a string with no server behind it, so a `src` would have nothing to
 * resolve against. Only a file under public/ can be used: a banner hosted
 * somewhere else, or a YouTube still, would make the card wait on a network
 * the build may not have.
 */
async function backdrop(banner) {
  const src = banner?.poster ?? banner?.src ?? '';
  if (!src.startsWith('/')) return '';
  const type = MIME[extname(src).toLowerCase()];
  if (!type) return '';
  try {
    const bytes = await readFile(join(resolve('public'), src));
    return `data:${type};base64,${bytes.toString('base64')}`;
  } catch {
    // Warned about by the markdown plugin already; the plain card still works.
    return '';
  }
}

const escapeHtml = (value) =>
  String(value).replace(
    /[<>&"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[char],
  );

/** Matches the site's serif and palette so a shared link looks like the page. */
function card({ eyebrow, title, footer, backdrop: image }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    background: #fdfdfc; color: #1b1b18;
    font-family: 'Iowan Old Style', Charter, Georgia, Cambria, 'Times New Roman', serif;
  }
  /*
   * A post's banner runs as a band across the top rather than behind the type.
   * A scrim cannot promise contrast it does not know the artwork of: over a
   * light banner, white title text measures 3.7:1 even at 72% black, which is
   * below what the plain card gets by simply not being on top of a picture.
   */
  .band { height: 240px; flex: none; background-size: cover; background-position: center; }
  .body {
    flex: 1; display: flex; flex-direction: column; justify-content: space-between;
    padding: 80px;
  }
  .band + .body { padding: 56px 80px; }
  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 40px; }
  .eyebrow {
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 24px; letter-spacing: 0.12em; text-transform: uppercase; color: #6a6a62;
  }
  .logo { width: 104px; height: 104px; flex: none; margin-top: -14px; }
  .band + .body .logo { width: 76px; height: 76px; margin-top: -8px; }
  h1 { font-size: 68px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 600; }
  .band + .body h1 { font-size: 56px; }
  .rule { height: 3px; width: 120px; background: #7a3b2e; }
  footer {
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 26px; color: #6a6a62; display: flex; justify-content: space-between;
  }
</style></head>
<body>
  ${image ? `<div class="band" style="background-image: url(&quot;${image}&quot;)"></div>` : ''}
  <div class="body">
    <div class="top">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <div class="logo">${logo}</div>
    </div>
    <h1>${escapeHtml(title)}</h1>
    <div>
      <div class="rule"></div>
      <footer><span>${escapeHtml(footer.left)}</span><span>${escapeHtml(footer.right)}</span></footer>
    </div>
  </div>
</body></html>`;
}

const targets = [
  {
    slug: 'site',
    html: card({
      eyebrow: siteConfig.title,
      title: siteConfig.tagline,
      footer: { left: siteConfig.url.replace(/^https?:\/\//, ''), right: '' },
    }),
  },
  ...(await Promise.all(
    posts.map(async (post) => ({
      slug: post.slug,
      html: card({
        eyebrow: siteConfig.title,
        title: post.title,
        footer: {
          left: post.authors.map((author) => author.name).join(', '),
          right: post.date,
        },
        backdrop: await backdrop(post.banner),
      }),
    })),
  )),
];

// An already-provisioned Chromium can be used instead of Playwright's own
// download, which is what sandboxes and CI images with a browser baked in
// need: set CHROMIUM_EXECUTABLE to its path.
const launchOptions = process.env.CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
  : {};

await mkdir(join(dist, 'og'), { recursive: true });

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

for (const { slug, html } of targets) {
  await page.setContent(html, { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png' });
  await writeFile(join(dist, 'og', `${slug}.png`), png);
}

await browser.close();
console.log(`cards: rendered ${targets.length} social images`);
