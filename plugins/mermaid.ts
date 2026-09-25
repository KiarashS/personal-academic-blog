import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { uniqueIds } from '../src/lib/svg-ids';

export interface DiagramCache {
  [hash: string]: { light: string; dark: string };
}

export function diagramHash(source: string): string {
  return createHash('sha256').update(source.trim()).digest('hex').slice(0, 16);
}

export function loadDiagramCache(path: string): DiagramCache {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as DiagramCache;
  } catch (cause) {
    console.warn(`Ignoring unreadable diagram cache at ${path}: ${String(cause)}`);
    return {};
  }
}

/** The control that opens a diagram in the viewer. */
function expand(): Element {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      className: ['mermaid-figure__expand'],
      'aria-label': 'View this diagram full size',
    },
    children: [
      {
        type: 'element',
        tagName: 'svg',
        properties: {
          viewBox: '0 0 24 24',
          width: '14',
          height: '14',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        children: [
          { type: 'element', tagName: 'path', properties: { d: 'M15 3h6v6' }, children: [] },
          { type: 'element', tagName: 'path', properties: { d: 'M9 21H3v-6' }, children: [] },
          { type: 'element', tagName: 'path', properties: { d: 'M21 3l-7 7' }, children: [] },
          { type: 'element', tagName: 'path', properties: { d: 'M3 21l7-7' }, children: [] },
        ],
      },
    ],
  };
}

function raw(value: string): Element {
  // `rehype-raw` has already run by this point, so the SVG is injected as a raw
  // node that rehype-stringify passes through untouched.
  return { type: 'raw', value } as unknown as Element;
}

/**
 * Replaces ```mermaid fences either with the SVG pair rendered at build time,
 * or — when the cache has no entry, as in dev — with a placeholder the browser
 * renders instead.
 */
export function rehypeMermaid(options: {
  cache: DiagramCache;
  onMissing?: (source: string) => void;
}) {
  return (tree: Root) => {
    // One set for the whole post: the light and dark copies of a diagram carry
    // different prefixes and cannot collide, but two uses of the same diagram
    // produce the same SVG twice.
    const seen = new Set<string>();

    visit(tree, (node, index, parent) => {
      if (!parent || index === null) return;
      if (node.type !== 'element' || node.tagName !== 'pre') return;

      const code = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'code',
      );
      if (!code) return;

      const classes = code.properties?.className;
      const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
      if (!list.includes('language-mermaid')) return;

      const source = toString(code);
      const rendered = options.cache[diagramHash(source)];

      if (rendered) {
        // A real element, not a raw blob: later steps need to see the class in
        // order to caption and number it.
        //
        // `div`, not `figure` — `rehypeCaptions` gives a `figure` element its
        // caption as a direct child, on the assumption that the figure is
        // otherwise just the picture. This element is also the clickable
        // widget `PostBody` clones into the lightbox, so a caption living
        // inside it opened in the lightbox too. As a `div`, `rehypeCaptions`
        // wraps it in its own new `<figure>` alongside the caption instead —
        // the path every other captioned block (code, table, notebook)
        // already takes — and the clone stays just the diagram.
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['mermaid-figure'], 'data-rendered': 'true' },
          children: [
            raw(`<div class="mermaid-figure__light">${uniqueIds(rendered.light, seen)}</div>`),
            raw(`<div class="mermaid-figure__dark">${uniqueIds(rendered.dark, seen)}</div>`),
            // Written by the build rather than added on hydration, so it is in
            // the static HTML and a keyboard reaches it at first paint. The
            // click is answered by `PostBody`; with no JavaScript the button is
            // not there to press, which is why it is a button and not a link.
            expand(),
          ],
        };
        return;
      }

      options.onMissing?.(source);
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid-pending'] },
        children: [
          {
            type: 'element',
            tagName: 'script',
            properties: { type: 'text/x-mermaid' },
            children: [{ type: 'text', value: source }],
          },
        ],
      };
    });
  };
}

/** Minimal depth-first walk; avoids pulling in unist-util-visit for one use. */
function visit(
  node: Root | Element,
  callback: (node: Root | Element, index: number | null, parent: Root | Element | null) => void,
  index: number | null = null,
  parent: Root | Element | null = null,
): void {
  callback(node, index, parent);
  const children = 'children' in node ? node.children : [];
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (child && child.type === 'element') visit(child, callback, i, node);
  }
}
