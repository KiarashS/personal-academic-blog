import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

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
        parent.children[index] = {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['mermaid-figure'], 'data-rendered': 'true' },
          children: [
            raw(`<div class="mermaid-figure__light">${rendered.light}</div>`),
            raw(`<div class="mermaid-figure__dark">${rendered.dark}</div>`),
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
