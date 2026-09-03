import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const { posts, siteConfig } = await import(serverEntry);

const escapeHtml = (value) =>
  String(value).replace(
    /[<>&"]/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[char],
  );

/** Matches the site's serif and palette so a shared link looks like the page. */
function card({ eyebrow, title, footer }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    justify-content: space-between; padding: 80px;
    background: #fdfdfc; color: #1b1b18;
    font-family: 'Iowan Old Style', Charter, Georgia, Cambria, 'Times New Roman', serif;
  }
  .eyebrow {
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 24px; letter-spacing: 0.12em; text-transform: uppercase; color: #6a6a62;
  }
  h1 { font-size: 68px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 600; }
  .rule { height: 3px; width: 120px; background: #7a3b2e; }
  footer {
    font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 26px; color: #6a6a62; display: flex; justify-content: space-between;
  }
</style></head>
<body>
  <div class="eyebrow">${escapeHtml(eyebrow)}</div>
  <h1>${escapeHtml(title)}</h1>
  <div>
    <div class="rule"></div>
    <footer><span>${escapeHtml(footer.left)}</span><span>${escapeHtml(footer.right)}</span></footer>
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
  ...posts.map((post) => ({
    slug: post.slug,
    html: card({
      eyebrow: siteConfig.title,
      title: post.title,
      footer: {
        left: post.authors.map((author) => author.name).join(', '),
        right: post.date,
      },
    }),
  })),
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
