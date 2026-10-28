import type { Element, ElementContent, Root, RootContent } from 'hast';

/**
 * Footnotes as sidenotes: in the margin beside the line that cites them on a
 * screen wide enough to have a margin, and at the foot of the post everywhere
 * else, which is where an ordinary Markdown footnote is written to go.
 *
 * Nothing changes in the source. A footnote whose text is plain paragraphs is
 * copied in beside its first reference as a `span.sidenote`, and the stylesheet
 * shows one copy or the other, never both: at 80rem and up the sidenote, and
 * the entry at the foot is hidden, below it the reverse. Hidden with `display`,
 * so a screen reader meets the note once, where it is shown.
 *
 * A footnote stays at the foot on every screen when its text holds a list, a
 * table or a block of code, which do not belong in a 13rem margin, and when it
 * is cited from somewhere a margin note cannot reach cleanly: a table, a
 * caption, an alert, a heading, a quotation. The list at the foot is given its
 * numbers explicitly, so hiding some entries does not renumber the rest.
 */

const isElement = (node: RootContent | ElementContent | undefined): node is Element =>
  node?.type === 'element';

const isBlank = (node: RootContent | ElementContent): boolean =>
  node.type === 'text' && node.value.trim() === '';

function classesOf(node: Element): string[] {
  const classes = node.properties?.className;
  return Array.isArray(classes) ? classes.map(String) : [];
}

const addClass = (node: Element, name: string): void => {
  node.properties = { ...node.properties, className: [...classesOf(node), name] };
};

/** Containers a margin note can sit inside and still line up with the column's edge. */
function reachable(ancestors: Element[]): boolean {
  return ancestors.every((node) => {
    if (
      ['p', 'li', 'ul', 'ol', 'sup', 'em', 'strong', 'span', 'a', 'del', 'mark'].includes(
        node.tagName,
      )
    ) {
      return true;
    }
    return node.tagName === 'div' && classesOf(node).includes('theorem');
  });
}

const isBackref = (node: ElementContent): node is Element =>
  isElement(node) && node.tagName === 'a' && 'dataFootnoteBackref' in (node.properties ?? {});

/**
 * remark-gfm puts a note's back-links at the end of its last paragraph, but
 * when the note ends in a list it puts them after the list, where they stand
 * alone on a line under a list's worth of space. They go at the end of the
 * list's last item instead, which is where the note's text ends.
 */
function tuckBackrefs(item: Element): void {
  const kids = item.children;
  let start = kids.length;
  while (start > 0) {
    const node = kids[start - 1];
    if (isBackref(node) || isBlank(node)) start -= 1;
    else break;
  }
  const trailing = kids.slice(start);
  const list = kids[start - 1];
  if (!trailing.some(isBackref) || !isElement(list) || !['ul', 'ol'].includes(list.tagName)) {
    return;
  }
  const last = [...list.children].reverse().find(isElement);
  if (!last) return;
  const lastChild = [...last.children].reverse().find((node) => !isBlank(node));
  const into = isElement(lastChild) && lastChild.tagName === 'p' ? lastChild : last;
  into.children.push(
    ...trailing.flatMap((node): ElementContent[] =>
      isBackref(node) ? [{ type: 'text', value: ' ' }, node] : [],
    ),
  );
  kids.splice(start, trailing.length);
}

/** A copy without ids, so the two copies of a note do not give the page duplicate ids. */
function withoutIds<T extends ElementContent>(node: T): T {
  if (node.type !== 'element') return structuredClone(node);
  const { id: _id, ...properties } = node.properties ?? {};
  return {
    ...node,
    properties,
    children: node.children.map((child) => withoutIds(child)),
  };
}

/** The note's paragraphs as one run of text, a break between each, without the "back" link. */
function noteText(item: Element): ElementContent[] | undefined {
  const blocks = item.children.filter((child) => !isBlank(child));
  if (blocks.length === 0 || !blocks.every((block) => isElement(block) && block.tagName === 'p')) {
    return undefined;
  }
  const out: ElementContent[] = [];
  (blocks as Element[]).forEach((paragraph, index) => {
    if (index > 0) {
      out.push({
        type: 'element',
        tagName: 'span',
        properties: { className: ['sidenote__break'] },
        children: [],
      });
    }
    for (const child of paragraph.children) {
      if (isElement(child) && 'dataFootnoteBackref' in (child.properties ?? {})) continue;
      out.push(withoutIds(child));
    }
  });
  const last = out[out.length - 1];
  if (last?.type === 'text') last.value = last.value.trimEnd();
  return out;
}

export function rehypeSidenotes() {
  return (tree: Root) => {
    // The list at the foot, which remark-gfm writes as `section[data-footnotes] > ol > li`.
    let section: Element | undefined;
    const find = (node: Root | Element) => {
      for (const child of node.children) {
        if (!isElement(child)) continue;
        if ('dataFootnotes' in (child.properties ?? {})) section = child;
        else find(child);
      }
    };
    find(tree);
    if (!section) return;

    const list = section.children.find(
      (child): child is Element => isElement(child) && child.tagName === 'ol',
    );
    if (!list) return;
    const items = new Map<string, Element>();
    let position = 0;
    for (const item of list.children) {
      if (!isElement(item) || item.tagName !== 'li') continue;
      position += 1;
      item.properties = { ...item.properties, value: String(position) };
      tuckBackrefs(item);
      if (typeof item.properties.id === 'string') items.set(item.properties.id, item);
    }

    const done = new Set<string>();
    const visit = (node: Root | Element, ancestors: Element[]) => {
      const children = node.children;
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child) || child === section) continue;

        const ref = child.tagName === 'sup' ? child.children.find(isElement) : undefined;
        const href = ref?.properties?.href;
        if (ref && 'dataFootnoteRef' in (ref.properties ?? {}) && typeof href === 'string') {
          const id = decodeURIComponent(href.slice(1));
          const item = items.get(id);
          const text = item && !done.has(id) && reachable(ancestors) ? noteText(item) : undefined;
          if (item && text) {
            done.add(id);
            const number = ref.children.map((c) => (c.type === 'text' ? c.value : '')).join('');
            children.splice(index + 1, 0, {
              type: 'element',
              tagName: 'span',
              properties: { className: ['sidenote'], id: `sidenote-${id}`, tabIndex: -1 },
              children: [
                {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['sidenote__number'] },
                  children: [{ type: 'text', value: number }],
                },
                { type: 'text', value: ' ' },
                ...text,
              ],
            });
            addClass(item, 'footnote--sidenoted');
            index += 1;
          }
          continue;
        }
        visit(child, [...ancestors, child]);
      }
    };
    visit(tree, []);

    if (done.size > 0 && done.size === items.size) addClass(section, 'footnotes--sidenoted');
  };
}
