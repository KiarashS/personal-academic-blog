import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

const HEADINGS = new Set(['h2', 'h3', 'h4']);

/** Two links of a chain, drawn rather than set in text so it scales cleanly. */
function linkIcon(): Element {
  const path = (d: string): Element => ({
    type: 'element',
    tagName: 'path',
    properties: { d },
    children: [],
  });

  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: ['heading-anchor__icon'],
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      focusable: 'false',
    },
    children: [
      path('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'),
      path('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
    ],
  };
}

/**
 * Adds a permalink beside each heading. `rehype-slug` has already assigned the
 * ids; without this there is nothing to click to get a link to a section.
 *
 * It stays a real link — copyable, openable in a new tab, reachable by
 * keyboard — and the post page adds the click handler that copies the section's
 * URL rather than merely jumping to it.
 */
export function rehypeHeadingAnchors() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      for (const child of 'children' in node ? node.children : []) {
        if (child.type !== 'element') continue;
        const id = typeof child.properties?.id === 'string' ? child.properties.id : '';

        if (HEADINGS.has(child.tagName) && id) {
          child.children.push({
            type: 'element',
            tagName: 'a',
            properties: {
              className: ['heading-anchor'],
              href: `#${id}`,
              'aria-label': `Copy a link to “${toString(child)}”`,
            },
            children: [linkIcon()],
          });
          continue;
        }

        walk(child);
      }
    };
    walk(tree);
  };
}
