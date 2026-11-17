import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

/**
 * In a numeric style (IEEE, Vancouver), rehype-citation writes a citation of
 * several works in number order, "[1], [2]", but links the numbers in the
 * order the keys were typed: `[@white; @knuth]` linked "[1]" to White, which
 * is [2] in the list. Each number is linked here to the entry the list gives
 * that number. Author-year styles have no numbers to match, and are left as
 * they are.
 */
export function rehypeCitationNumbers() {
  return (tree: Root) => {
    const byNumber = new Map<string, string>();
    const links: Element[] = [];

    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        const classes = child.properties?.className;
        const list = Array.isArray(classes) ? classes.map(String) : [];
        const id = child.properties?.id;
        if (list.includes('csl-entry') && typeof id === 'string') {
          const margin = child.children.find(
            (part): part is Element =>
              part.type === 'element' &&
              Array.isArray(part.properties?.className) &&
              part.properties.className.includes('csl-left-margin'),
          );
          const number = margin ? /\d+/.exec(toString(margin))?.[0] : undefined;
          if (number) byNumber.set(number, id);
          continue;
        }
        const href = child.properties?.href;
        if (child.tagName === 'a' && typeof href === 'string' && href.startsWith('#bib-')) {
          links.push(child);
          continue;
        }
        walk(child);
      }
    };
    walk(tree);
    if (byNumber.size === 0) return;

    for (const link of links) {
      const number = toString(link).trim();
      const id = /^\d+$/.test(number) ? byNumber.get(number) : undefined;
      if (id) link.properties.href = `#${id}`;
    }
  };
}
