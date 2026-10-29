import type { Element, Root } from 'hast';
import { FOOTNOTE_HEADING } from './heading-anchors';

const DEPTH: Record<string, number> = { h2: 1, h3: 2, h4: 3 };

/**
 * Section numbers, for a post with `numbered: true`: "1 Introduction",
 * "2.1 The model", as a paper numbers them. A post's own title is its `h1`, so
 * the post's `##` headings are the first level, `###` the second and `####`
 * the third; deeper headings are left unnumbered, as most papers leave them.
 *
 * The number is a span at the start of the heading, so it is set in the
 * heading's own face and copied with it, and the heading's id stays the one
 * rehype-slug gave it: renumbering a post does not move its links. The heading
 * is marked "Section 2.1" for `rehypeCrossRefs`, so an empty link to it reads
 * that rather than its words.
 *
 * A heading at a level below one the post never opened, a `###` before any
 * `##`, counts the missing level as 0, "0.1", which is what LaTeX prints and
 * is the author's cue to fix the outline.
 */
export function rehypeSectionNumbers(options: { enabled: boolean }) {
  return (tree: Root) => {
    if (!options.enabled) return;
    const counts = [0, 0, 0];

    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        const depth = DEPTH[child.tagName];
        const id = child.properties?.id;
        if (depth && id !== FOOTNOTE_HEADING) {
          counts[depth - 1] += 1;
          for (let i = depth; i < counts.length; i += 1) counts[i] = 0;
          const number = counts.slice(0, depth).join('.');
          child.children.unshift(
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['section-number'] },
              children: [{ type: 'text', value: number }],
            },
            { type: 'text', value: ' ' },
          );
          child.properties = {
            ...child.properties,
            dataRefLabel: `Section ${number}`,
            dataSectionNumber: number,
          };
          continue;
        }
        walk(child);
      }
    };

    walk(tree);
  };
}
