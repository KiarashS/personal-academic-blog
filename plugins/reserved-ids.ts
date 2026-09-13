import type { Element, Root } from 'hast';
import { isReservedId } from '../src/lib/reserved-ids';

const idOf = (node: Element): string =>
  typeof node.properties?.id === 'string' ? node.properties.id : '';

/**
 * Renames any id in the post's own HTML that the page chrome already claims.
 *
 * `rehype-slug` gives every heading an id derived from its text, and keeps
 * those unique among themselves — it cannot know the app will wrap the result
 * in a page that has already used `revisions` and `comments`. This runs
 * straight after it, and before the contents list is collected, so the renamed
 * id is what the contents entry and the heading's own permalink point at.
 *
 * The suffix follows github-slugger's, so a heading pushed off `revisions`
 * lands on `revisions-1` exactly as a second `## Revisions` in the same post
 * would have.
 */
export function rehypeReservedIds() {
  return (tree: Root) => {
    const taken = new Set<string>();
    const collisions: Element[] = [];

    const walk = (node: Root | Element) => {
      for (const child of 'children' in node ? node.children : []) {
        if (child.type !== 'element') continue;
        const id = idOf(child);
        if (id) {
          taken.add(id);
          if (isReservedId(id)) collisions.push(child);
        }
        walk(child);
      }
    };
    walk(tree);

    for (const node of collisions) {
      const id = idOf(node);
      let suffix = 1;
      while (taken.has(`${id}-${suffix}`) || isReservedId(`${id}-${suffix}`)) suffix += 1;
      const renamed = `${id}-${suffix}`;
      taken.add(renamed);
      node.properties = { ...node.properties, id: renamed };
    }
  };
}
