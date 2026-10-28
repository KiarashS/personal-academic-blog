import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Element, ElementContent, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { optimize } from 'svgo';
import { uniqueIds } from '../src/lib/svg-ids';

/**
 * TikZ, drawn at build time without a TeX installation:
 *
 *     ```tikz
 *     % alt: A curve falling towards the x axis
 *     \begin{tikzpicture}
 *       \draw[->] (0,0) -- (3,0) node[right] {$x$};
 *       \draw[thick, domain=0:3] plot (\x, {exp(-\x)});
 *     \end{tikzpicture}
 *     ```
 *
 * node-tikzjax runs TeX as WebAssembly and turns the result into SVG. A fence
 * that holds only a picture is put in a document for it; one with its own
 * `\begin{document}` is taken as written, so a preamble can load tikz-cd,
 * pgfplots, circuitikz or chemfig. The first line may be `% alt: …`, which is
 * what a screen reader is told the picture shows.
 *
 * Two things are done to the SVG before it reaches the page.
 *
 * Its text is set in Computer Modern from font files the page would have to
 * fetch. Every character is drawn as a path from those fonts here instead, so
 * the picture needs no font, looks the same everywhere, and cannot fall back.
 *
 * Its black is the page's text colour and its white the page's background, so
 * one drawing serves both themes. Any other colour the author chose is kept.
 *
 * TeX is slow, about two seconds a picture, so each one is kept in
 * .cache/tikz.json against a hash of its source and drawn once.
 */

const require = createRequire(import.meta.url);

interface Font {
  getPath(
    text: string,
    x: number,
    y: number,
    size: number,
  ): { toPathData(decimals: number): string };
}
const opentype = require('opentype.js') as { loadSync(path: string): Font };
const tikzjax = require('node-tikzjax') as
  | { default: (source: string, options?: Record<string, unknown>) => Promise<string> }
  | ((source: string, options?: Record<string, unknown>) => Promise<string>);
const tex2svg = typeof tikzjax === 'function' ? tikzjax : tikzjax.default;

const FONTS = join(dirname(require.resolve('node-tikzjax/package.json')), 'css/bakoma/ttf');

/** The libraries most pictures reach for, loaded for every one. */
const LIBRARIES = 'arrows.meta,calc,positioning,shapes.geometric,decorations.pathreplacing';

/** How much larger than TeX's own size the picture is shown, so 10pt labels sit beside 17px prose. */
const SCALE = 1.15;

/**
 * Bumped whenever what is done to TeX's SVG changes, so a cached picture drawn
 * the old way is drawn again rather than served.
 */
const PROCESSING = 1;

export const tikzHash = (source: string): string =>
  createHash('sha256').update(`tikz\n${PROCESSING}\n${source.trim()}`).digest('hex').slice(0, 16);

const fonts = new Map<string, Font>();
const fontFor = (name: string): Font => {
  let font = fonts.get(name);
  if (!font) {
    font = opentype.loadSync(join(FONTS, `${name}.ttf`));
    fonts.set(name, font);
  }
  return font;
};

const decode = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Each `<text>` as the outline of its characters, keeping its position, transform and colour. */
export function textToPaths(svg: string): string {
  return svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, attrs: string, chars: string) => {
    const attr = (name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
    const family = attr('font-family');
    if (!family) return '';
    const d = fontFor(family)
      .getPath(
        decode(chars),
        Number(attr('x') ?? 0),
        Number(attr('y') ?? 0),
        Number(attr('font-size') ?? 10),
      )
      .toPathData(3);
    // A space has no outline.
    if (!d) return '';
    const transform = attr('transform');
    const fill = attr('fill');
    return `<path d="${d}"${transform ? ` transform="${transform}"` : ''}${fill ? ` fill="${fill}"` : ''} stroke="none"/>`;
  });
}

/** Black becomes the text colour and white the background; the rest is the author's. */
export function themeColours(svg: string): string {
  return svg
    .replace(/\b(fill|stroke)="(?:#000|#000000|black)"/gi, '$1="currentColor"')
    .replace(/\b(fill|stroke)="(?:#fff|#ffffff|white)"/gi, 'style="$1:var(--bg)"');
}

/** TeX's points as CSS pixels, scaled up a little, with the viewBox kept for scaling down. */
function sized(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/, (whole, attrs: string) => {
    const px = (name: string) => {
      const value = new RegExp(`\\b${name}="([\\d.]+)(pt)?"`).exec(attrs);
      if (!value) return undefined;
      return Math.round(Number(value[1]) * (value[2] === 'pt' ? 4 / 3 : 1) * SCALE * 10) / 10;
    };
    const width = px('width');
    const height = px('height');
    if (width === undefined || height === undefined) return whole;
    const rest = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    return `<svg${rest} width="${width}" height="${height}">`;
  });
}

function documentFor(source: string): string {
  const body = source.replace(/^%\s*alt:.*$/m, '');
  return /\\begin\{document\}/.test(body) ? body : `\\begin{document}\n${body}\n\\end{document}`;
}

// The engine is one instance and must not be asked twice at once.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
};

const TIMEOUT = 90_000;

export async function renderTikz(source: string): Promise<string> {
  const svg = await serial(() =>
    Promise.race([
      tex2svg(documentFor(source), { tikzLibraries: LIBRARIES, disableOptimize: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TeX took too long')), TIMEOUT),
      ),
    ]),
  );
  const drawn = sized(themeColours(textToPaths(svg)));
  return optimize(drawn, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            convertColors: false,
            minifyStyles: false,
            // Throws on some of TeX's path data; the paths are short enough as they are.
            convertPathData: false,
            inlineStyles: false,
          },
        },
      },
    ],
  }).data;
}

export interface TikzCache {
  [hash: string]: string;
}

export function loadTikzCache(path: string): TikzCache {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as TikzCache;
  } catch {
    return {};
  }
}

export function saveTikzCache(path: string, cache: TikzCache): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

const raw = (value: string): ElementContent =>
  ({ type: 'raw', value }) as unknown as ElementContent;

export interface TikzOptions {
  cache: TikzCache;
  /** Called after a picture is drawn, so the cache can be written. */
  onRendered?: () => void;
  onWarn?: (message: string) => void;
}

export function rehypeTikz(options: TikzOptions) {
  return async (tree: Root) => {
    const found: { parent: Root | Element; index: number; source: string }[] = [];
    const walk = (parent: Root | Element) => {
      parent.children.forEach((node, index) => {
        if (node.type !== 'element') return;
        if (node.tagName !== 'pre') {
          walk(node);
          return;
        }
        const code = node.children.find(
          (child): child is Element => child.type === 'element' && child.tagName === 'code',
        );
        const classes = code?.properties?.className;
        if (code && Array.isArray(classes) && classes.map(String).includes('language-tikz')) {
          found.push({ parent, index, source: toString(code) });
        }
      });
    };
    walk(tree);
    if (found.length === 0) return;

    const seen = new Set<string>();
    for (const { parent, index, source } of found) {
      const key = tikzHash(source);
      let svg = options.cache[key];
      let error: string | undefined;
      if (!svg) {
        try {
          svg = await renderTikz(source);
          options.cache[key] = svg;
          options.onRendered?.();
        } catch (cause) {
          error = cause instanceof Error ? cause.message : String(cause);
        }
      }

      const children = parent.children as ElementContent[];
      if (error !== undefined || !svg) {
        options.onWarn?.(`a TikZ picture could not be drawn: ${error ?? 'no output'}`);
        children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['tikz-error'] },
          children: [
            {
              type: 'element',
              tagName: 'strong',
              properties: {},
              children: [{ type: 'text', value: 'TikZ picture could not be drawn.' }],
            },
            {
              type: 'element',
              tagName: 'pre',
              properties: {},
              children: [{ type: 'text', value: source }],
            },
          ],
        };
        continue;
      }

      const alt = /^%\s*alt:\s*(.+)$/m.exec(source)?.[1]?.trim();
      children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['tikz'], role: 'img', ariaLabel: alt ?? 'Diagram' },
        children: [
          raw(uniqueIds(svg.replace('<svg', '<svg aria-hidden="true" focusable="false"'), seen)),
        ],
      };
    }
  };
}
