import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

/*
 * The front page's portrait at the size it is shown, written into the build
 * beside the original. See `src/lib/avatar.ts` for the name and the width.
 *
 * Drawn through Chromium's canvas, which the build already runs for the cards
 * and the diagrams, rather than an image library it would otherwise not need.
 * `imageSmoothingQuality: 'high'` is a proper downscale, not a nearest-pixel
 * one. The copy is never wider than the original: a small portrait is only
 * re-encoded.
 */

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const { siteConfig, avatarCopyPath, isUrl, AVATAR_WIDTH } = await import(serverEntry);

const MIME = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const src = siteConfig.features.home ? siteConfig.home.avatar : '';

if (!src || isUrl(src)) {
  // Nothing of ours to size: no portrait, or one hosted somewhere else.
  process.exit(0);
}

const type = MIME[extname(src).toLowerCase()];
if (!type) {
  throw new Error(`home.avatar is ${src}; the build can size ${Object.keys(MIME).join(', ')}.`);
}

const bytes = await readFile(join(resolve('public'), src)).catch(() => {
  throw new Error(`home.avatar is ${src}, but there is no public${src}.`);
});

// As in render-cards.mjs: CHROMIUM_EXECUTABLE for a browser already on the
// machine, Playwright's own download otherwise.
const launchOptions = process.env.CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
  : {};

const browser = await chromium.launch(launchOptions);

try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ dataUrl, width }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const scale = Math.min(1, width / Math.min(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return {
        data: canvas.toDataURL('image/webp', 0.86),
        size: `${canvas.width}x${canvas.height}`,
        from: `${image.naturalWidth}x${image.naturalHeight}`,
      };
    },
    { dataUrl: `data:${type};base64,${bytes.toString('base64')}`, width: AVATAR_WIDTH },
  );

  if (!result.data.startsWith('data:image/webp')) {
    throw new Error('Chromium would not encode WebP; the portrait copy was not written.');
  }

  const out = avatarCopyPath(src);
  const encoded = Buffer.from(result.data.split(',')[1], 'base64');
  await writeFile(join(dist, out), encoded);
  console.log(
    `avatar: ${src} ${result.from}, ${Math.round(bytes.length / 1024)} kB -> ` +
      `${out} ${result.size}, ${Math.round(encoded.length / 1024)} kB`,
  );
} finally {
  await browser.close();
}
