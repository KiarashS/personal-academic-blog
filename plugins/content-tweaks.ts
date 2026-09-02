import type { Element, Root } from 'hast';

function isExternal(href: unknown): boolean {
  return typeof href === 'string' && /^https?:\/\//.test(href);
}

/**
 * Two things the client-side renderer used to do, moved into the build:
 * wide tables scroll inside their own box rather than pushing the page
 * sideways, and links off the site open in a new tab.
 */
export function rehypeContentTweaks() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      const children = 'children' in node ? node.children : [];
      children.forEach((child, index) => {
        if (child.type !== 'element') return;

        if (child.tagName === 'table') {
          children[index] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-wrap'] },
            children: [child],
          };
          return;
        }

        if (child.tagName === 'a' && isExternal(child.properties?.href)) {
          child.properties = {
            ...child.properties,
            target: '_blank',
            rel: ['noopener', 'noreferrer'],
          };
        }

        walk(child);
      });
    };
    walk(tree);
  };
}
