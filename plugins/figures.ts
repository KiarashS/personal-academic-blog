import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname, basename } from 'node:path';
import { imageSize } from '../src/lib/image-size';
import type { Element, Root } from 'hast';

export interface FigureOptions {
  /** Directory that root-relative image paths resolve against, i.e. `public`. */
  publicDir: string;
  /** Deployment base path, prefixed onto root-relative sources. */
  base: string;
  /**
   * Intrinsic width, in pixels, from which an image is linked to its own file
   * so a reader can see it at full size. Below it the link would open the same
   * pixels the page is already showing. The default is comfortably wider than
   * the text column.
   */
  fullSizeFrom?: number;
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

/**
 * A vector image is already as sharp as the reader's screen allows, and zooming
 * the page scales it losslessly, so linking it to itself buys nothing.
 */
const isVector = (src: string): boolean => /\.svg$/i.test(src);

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
  const fullSizeFrom = options.fullSizeFrom ?? 800;

  /**
   * Wraps an image in a link to its own file. Each theme variant links to
   * itself, so whichever one the reader can see is the one that opens, and it
   * opens in its own tab rather than replacing the page being read.
   */
  const zoomable = (image: Element, href: string): Element => ({
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['figure-zoom'],
      href,
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
    },
    children: [image],
  });

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

        // Only worth offering when the file holds detail the column cannot
        // show: a picture displayed at its own size has nothing more to give.
        const zoom = !isVector(src) && (size?.width ?? 0) >= fullSizeFrom;
        const link = (image: Element, path: string) => (zoom ? zoomable(image, href(path)) : image);

        const pictures: Element[] = dark
          ? [
              link(img(href(src), alt, size, 'figure-image figure-image--light'), src),
              link(
                img(href(darkSibling(src)), alt, size, 'figure-image figure-image--dark'),
                darkSibling(src),
              ),
            ]
          : [link(img(href(src), alt, size, 'figure-image'), src)];

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
