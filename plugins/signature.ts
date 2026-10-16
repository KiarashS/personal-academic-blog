import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { siteConfig } from '../src/site.config';

/*
 * The one signature the front page draws, chosen by `home.signatureFile`.
 *
 * A virtual module rather than a static import, so changing the drawing is a
 * line of config and not an edit to `Signature.tsx`; and rather than
 * `import.meta.glob`, because a glob over the three files would put all three
 * in the bundle to show one, and the traced one alone is 30KB inlined into the
 * front page.
 *
 * It also works out the two proportions `.banner__signature` sizes the box
 * with, which used to be numbers copied by hand into the stylesheet and so
 * were wrong for every file but the one they were copied from. The ratio is
 * the viewBox's. The descent is the share of the box hanging below the
 * letters' baseline, and the baseline is `data-baseline` on the root `<svg>`,
 * or y=0 without one, which is where `scripts/set-signature.mjs` puts it.
 */

const VIRTUAL = 'virtual:signature';
const RESOLVED = `\0${VIRTUAL}`;
const CONTENT = resolve(process.cwd(), 'src/content');

export interface SignatureDrawing {
  markup: string;
  ratio: number;
  descent: number;
}

const round = (value: number): number => Math.round(value * 10000) / 10000;

/** The drawing's proportions, read off its root element. */
export function signatureDrawing(source: string, name = 'the signature'): SignatureDrawing {
  const root = /<svg\b[^>]*>/.exec(source)?.[0];
  if (!root) throw new Error(`${name} has no <svg> element`);
  const box = /\bviewBox="([^"]+)"/
    .exec(root)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !box ||
    box.length !== 4 ||
    box.some((n) => !Number.isFinite(n)) ||
    box[2] <= 0 ||
    box[3] <= 0
  )
    throw new Error(`${name} needs a viewBox of four numbers, with a width and height above 0`);
  const baseline = Number(/\bdata-baseline="([^"]+)"/.exec(root)?.[1] ?? 0);
  if (!Number.isFinite(baseline))
    throw new Error(`${name} has a data-baseline that is not a number`);
  const [, y, width, height] = box;
  return {
    // Stored as published, `role="img"` included; the wrapper carries the name
    // for a screen reader, so the drawing itself is taken out of the tree.
    markup: source.replace('role="img"', 'aria-hidden="true" focusable="false"'),
    ratio: round(height / width),
    descent: round((y + height - baseline) / height),
  };
}

/** The configured file, as a path under `src/content`, or a build error that names the choices. */
export function signaturePath(file: string, dir = CONTENT): string {
  const path = resolve(dir, file);
  if (!file.endsWith('.svg') || !path.startsWith(`${dir}/`) || !existsSync(path)) {
    const choices = readdirSync(dir)
      .filter((name) => name.startsWith('signature') && name.endsWith('.svg'))
      .join(', ');
    throw new Error(
      `home.signatureFile is "${file}", which is not an SVG in src/content. ` +
        `The signatures there are: ${choices || 'none'}.`,
    );
  }
  return path;
}

export function signature(file = siteConfig.home.signatureFile): Plugin {
  return {
    name: 'academic-signature',

    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },

    load(id) {
      if (id !== RESOLVED) return null;
      const path = signaturePath(file);
      this.addWatchFile(path);
      const drawing = signatureDrawing(readFileSync(path, 'utf8'), `src/content/${file}`);
      return Object.entries(drawing)
        .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)};`)
        .join('\n');
    },
  };
}
