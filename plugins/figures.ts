import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname, basename } from 'node:path';
import { imageSize } from '../src/lib/image-size';
import type { Element, Root } from 'hast';

export interface FigureOptions {
  /** Directory that root-relative image paths resolve against, i.e. `public`. */
  publicDir: string;
  /** Deployment base path, prefixed onto root-relative sources. */
  base: string;
  onWarn?: (message: string) => void;
}

interface Dimensions {
  width: number;
  height: number;
}

function measure(file: string): Dimensions | undefined {
  try {
    return imageSize(readFileSync(file));
  } catch {
    return undefined;
  }
}

/** `plot.png` -> `plot.dark.png`, the convention for a dark-theme variant. */
function darkSibling(src: string): string {
  const ext = extname(src);
  return join(dirname(src), `${basename(src, ext)}.dark${ext}`).replace(/\\/g, '/');
}

function img(src: string, alt: string, size: Dimensions | undefined, className?: string): Element {
  return {
    type: 'element',
    tagName: 'img',
    properties: {
      src,
      alt,
      loading: 'lazy',
      decoding: 'async',
      ...(size ? { width: size.width, height: size.height } : {}),
      ...(className ? { className: [className] } : {}),
    },
    children: [],
  };
}

/**
 * Turns images into figures: intrinsic dimensions so the page does not reflow
 * as plots load, a caption from the Markdown title, and a dark-theme variant
 * when a `.dark` sibling exists — a white-background plot on a dark page is
 * the usual complaint.
 */
export function rehypeFigures(options: FigureOptions) {
  const base = options.base.replace(/\/$/, '');

  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      const children = 'children' in node ? node.children : [];
      children.forEach((child, index) => {
        if (child.type !== 'element') return;
        if (child.tagName !== 'p' && child.tagName !== 'img') {
          walk(child);
          return;
        }

        // A lone image in its own paragraph is a figure; an inline one is not.
        const target =
          child.tagName === 'img'
            ? child
            : child.children.filter((c) => c.type !== 'text' || c.value.trim()).length === 1 &&
              child.children.find((c): c is Element => c.type === 'element' && c.tagName === 'img');
        if (!target || typeof target === 'boolean') {
          walk(child);
          return;
        }

        const src = String(target.properties?.src ?? '');
        const alt = String(target.properties?.alt ?? '');
        const caption = String(target.properties?.title ?? '');
        if (!src) return;

        const rootRelative = src.startsWith('/');
        const file = rootRelative ? join(options.publicDir, src) : '';
        const size = file && existsSync(file) ? measure(file) : undefined;
        if (rootRelative && !existsSync(file)) {
          options.onWarn?.(`Image not found in public/: ${src}`);
        }

        const dark = rootRelative && existsSync(join(options.publicDir, darkSibling(src)));
        const href = (path: string) => (rootRelative ? `${base}${path}` : path);

        const pictures: Element[] = dark
          ? [
              img(href(src), alt, size, 'figure-image figure-image--light'),
              img(href(darkSibling(src)), alt, size, 'figure-image figure-image--dark'),
            ]
          : [img(href(src), alt, size, 'figure-image')];

        children[index] = {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['figure'] },
          children: caption
            ? [
                ...pictures,
                {
                  type: 'element',
                  tagName: 'figcaption',
                  properties: {},
                  children: [{ type: 'text', value: caption }],
                },
              ]
            : pictures,
        };
      });
    };
    walk(tree);
  };
}
