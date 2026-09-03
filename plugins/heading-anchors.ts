import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

const HEADINGS = new Set(['h2', 'h3', 'h4']);

/**
 * Adds a permalink beside each heading. `rehype-slug` has already assigned the
 * ids; without this there is nothing to click to get a link to a section.
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
              'aria-label': `Permalink to “${toString(child)}”`,
            },
            children: [{ type: 'text', value: '#' }],
          });
          continue;
        }

        walk(child);
      }
    };
    walk(tree);
  };
}
