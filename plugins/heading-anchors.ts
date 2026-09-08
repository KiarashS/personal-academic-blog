import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { linkIcon } from './link-icon';

const HEADINGS = new Set(['h2', 'h3', 'h4']);

/**
 * remark-gfm opens its footnote section with `<h2 class="sr-only">Footnotes</h2>`.
 * It is a landmark for a screen reader, not a section of the post, so it takes
 * neither an anchor nor a line in the contents list.
 */
export const FOOTNOTE_HEADING = 'footnote-label';

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

        if (HEADINGS.has(child.tagName) && id && id !== FOOTNOTE_HEADING) {
          child.children.push({
            type: 'element',
            tagName: 'a',
            properties: {
              className: ['heading-anchor'],
              href: `#${id}`,
              'aria-label': `Copy a link to “${toString(child)}”`,
            },
            children: [linkIcon('heading-anchor__icon')],
          });
          continue;
        }

        walk(child);
      }
    };
    walk(tree);
  };
}
