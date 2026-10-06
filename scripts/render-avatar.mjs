import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChromium } from './chromium.mjs';

/*
 * Portraits at the size they are shown, written into the build beside each
 * original: the front page's at AVATAR_WIDTH, and every People page photo kept
 * under `public/` at PHOTO_WIDTH. See `src/lib/avatar.ts` for the names.
 *
 * Drawn through Chromium's canvas, which the build already runs for the cards
 * and the diagrams, rather than an image library it would otherwise not need.
 * `imageSmoothingQuality: 'high'` is a proper downscale, not a nearest-pixel
 * one. A copy is never wider than its original: a small portrait is only
 * re-encoded.
 */

const dist = resolve('dist');
const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const {
  siteConfig,
  avatarCopyPath,
  isUrl,
  memberPhotos,
  footerCredit,
  AVATAR_WIDTH,
  PHOTO_WIDTH,
  CREDIT_WIDTH,
} = await import(serverEntry);

const MIME = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const jobs = [];
const home = siteConfig.features.home ? siteConfig.home.avatar : '';
// A portrait hosted somewhere else is not ours to size.
if (home && !isUrl(home)) jobs.push({ src: home, width: AVATAR_WIDTH, what: 'home.avatar' });
for (const photo of memberPhotos()) {
  jobs.push({ src: photo, width: PHOTO_WIDTH, what: 'A People page photo' });
}
// The footer's credit, on every page: the portrait at 28px wants a small copy.
const credit = footerCredit()?.photo;
if (credit && !isUrl(credit)) {
  jobs.push({ src: credit, width: CREDIT_WIDTH, what: 'The footer credit photo' });
}

// The same file at the same width is one copy, whoever asked for it.
const unique = [...new Map(jobs.map((job) => [avatarCopyPath(job.src, job.width), job])).values()];

if (unique.length === 0) process.exit(0);

const inputs = await Promise.all(
  unique.map(async (job) => {
    const type = MIME[extname(job.src).toLowerCase()];
    if (!type) {
      throw new Error(
        `${job.what} is ${job.src}; the build can size ${Object.keys(MIME).join(', ')}.`,
      );
    }
    const bytes = await readFile(join(resolve('public'), job.src)).catch(() => {
      throw new Error(`${job.what} is ${job.src}, but there is no public${job.src}.`);
    });
    return { ...job, type, bytes };
  }),
);

const browser = await launchChromium();

try {
  const page = await browser.newPage();
  for (const { src, width, type, bytes } of inputs) {
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
      { dataUrl: `data:${type};base64,${bytes.toString('base64')}`, width },
    );

    if (!result.data.startsWith('data:image/webp')) {
      throw new Error(`Chromium would not encode WebP; no copy of ${src} was written.`);
    }

    const out = avatarCopyPath(src, width);
    const encoded = Buffer.from(result.data.split(',')[1], 'base64');
    await mkdir(dirname(join(dist, out)), { recursive: true });
    await writeFile(join(dist, out), encoded);
    console.log(
      `avatar: ${src} ${result.from}, ${Math.round(bytes.length / 1024)} kB -> ` +
        `${out} ${result.size}, ${Math.round(encoded.length / 1024)} kB`,
    );
  }
} finally {
  await browser.close();
}
