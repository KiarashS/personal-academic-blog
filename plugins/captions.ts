import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';
import { linkIcon } from './link-icon';

const CAPTION = /^caption:\s*/i;

/**
 * A name for the block, Pandoc's way: `Caption: The layout. {#fig-architecture}`.
 * It has to look like an id — a letter, then word characters or hyphens — or it
 * is left in the caption as written, where the author will see it and fix it.
 */
const NAME = /\s*\{#([A-Za-z][\w-]*)\}\s*$/;

function isElement(node: RootContent, tagName?: string): node is Element {
  return node.type === 'element' && (!tagName || node.tagName === tagName);
}

function classesOf(node: Element): string[] {
  const classes = node.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
  return list.filter(Boolean);
}

type Kind = 'figure' | 'table' | 'code' | 'notebook';

/** What a block should be called in its caption, and how it is counted. */
function kindOf(node: Element): Kind | undefined {
  const classes = classesOf(node);
  if (classes.includes('table-wrap')) return 'table';
  if (classes.includes('code-block')) return 'code';
  if (classes.includes('notebook')) return 'notebook';
  if (
    classes.includes('figure') ||
    classes.includes('mermaid-figure') ||
    classes.includes('mermaid-pending')
  ) {
    return 'figure';
  }
  if (node.tagName === 'video' || node.tagName === 'figure') return 'figure';
  return undefined;
}

const LABELS: Record<Kind, string> = {
  figure: 'Figure',
  table: 'Table',
  code: 'Listing',
  notebook: 'Notebook',
};

/**
 * The automatic id, short and prefixed by kind. `rehype-slug` has already named
 * the headings from their own text, so a section called "Figure 2" owns
 * `#figure-2`; these cannot collide with that.
 */
const PREFIXES: Record<Kind, string> = {
  figure: 'fig',
  table: 'tbl',
  code: 'lst',
  notebook: 'nb',
};

/**
 * A caption goes below a block the reader takes in at a glance and above one
 * they read from the top down: a figure below, everything else above.
 */
const isAbove = (kind: Kind): boolean => kind !== 'figure';

/**
 * The index of the next real sibling. remark-rehype leaves newline text nodes
 * between block elements, so the caption is rarely at `index + 1`.
 */
function nextElement(children: RootContent[], from: number): number {
  for (let i = from; i < children.length; i += 1) {
    const node = children[i];
    if (node.type === 'text' && !node.value.trim()) continue;
    return i;
  }
  return -1;
}

/** A paragraph of the form `Caption: …` belongs to the block before it. */
function captionParagraph(node: RootContent | undefined): Element | undefined {
  if (!node || !isElement(node, 'p')) return undefined;
  return CAPTION.test(toString(node).trimStart()) ? node : undefined;
}

function stripMarker(paragraph: Element): ElementContent[] {
  const children = [...paragraph.children];
  const first = children[0];
  if (first?.type === 'text') {
    children[0] = { ...first, value: first.value.replace(CAPTION, '') };
  }
  return children;
}

/**
 * Takes an explicit `{#name}` off the end of the caption and returns both. The
 * marker is only recognised in the caption's last text node, which is where an
 * author writes it; one in the middle of a sentence is prose.
 */
function takeName(body: ElementContent[]): { name?: string; body: ElementContent[] } {
  const last = body[body.length - 1];
  if (last?.type !== 'text') return { body };

  const found = NAME.exec(last.value);
  if (!found) return { body };

  const trimmed = last.value.slice(0, found.index).trimEnd();
  const rest = trimmed ? [...body.slice(0, -1), { ...last, value: trimmed }] : body.slice(0, -1);
  return { name: found[1], body: rest };
}

function permalink(id: string, label: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['caption-anchor'],
      href: `#${id}`,
      'aria-label': `Copy a link to ${label}`,
    },
    children: [linkIcon('caption-anchor__icon')],
  };
}

function figcaption(label: string, body: ElementContent[], anchor: Element): Element {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: { className: ['caption'] },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['caption__label'] },
        children: [{ type: 'text', value: label }],
      },
      { type: 'text', value: ' ' },
      ...body,
      { type: 'text', value: ' ' },
      anchor,
    ],
  };
}

/**
 * Captions for every kind of block, numbered per post the way a paper numbers
 * them: figures in one sequence, tables in another, listings and notebooks in
 * their own. A caption is a paragraph beginning `Caption:` after the block;
 * images may also use the Markdown title, which `rehypeFigures` has already
 * turned into a figcaption.
 *
 * Where the caption sits is a separate question from what it is called, and
 * `isAbove` answers it.
 */
export function rehypeCaptions() {
  return (tree: Root) => {
    const counts: Record<Kind, number> = { figure: 0, table: 0, code: 0, notebook: 0 };
    // First name wins. A second block claiming it falls back to its number,
    // which keeps every id in the post unique and every link working.
    const taken = new Set<string>();

    const walk = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];

      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];
        if (!isElement(node)) continue;

        const kind = kindOf(node);
        if (!kind) {
          walk(node);
          continue;
        }

        const followingIndex = nextElement(children, index + 1);
        const following =
          followingIndex === -1 ? undefined : captionParagraph(children[followingIndex]);
        // An image's title has already become a figcaption inside the figure.
        const existing = node.children.find((child): child is Element =>
          isElement(child, 'figcaption'),
        );
        if (!following && !existing) {
          walk(node);
          continue;
        }

        const number = (counts[kind] += 1);
        const label = `${LABELS[kind]} ${number}.`;
        const above = isAbove(kind);
        const raw = following ? stripMarker(following) : [...(existing?.children ?? [])];
        const { name, body } = takeName(raw);

        // A block that is numbered is a block someone can refer to, so it gets
        // an address whether or not the author thought to name one. The name is
        // worth writing anyway: insert a figure above this one and the number
        // shifts, and a link someone saved to `#fig-3` lands on the wrong
        // picture, while `#fig-architecture` still lands here.
        const automatic = `${PREFIXES[kind]}-${number}`;
        const id = name && !taken.has(name) ? name : automatic;
        taken.add(id);

        const caption = figcaption(label, body, permalink(id, `${LABELS[kind]} ${number}`));

        if (following) children.splice(followingIndex, 1);
        if (existing) node.children = node.children.filter((child) => child !== existing);

        const classes = ['captioned', `captioned--${kind}`, ...(above ? ['captioned--above'] : [])];

        if (node.tagName === 'figure') {
          if (above) node.children.unshift(caption);
          else node.children.push(caption);
          node.properties = {
            ...node.properties,
            id,
            className: [...classesOf(node), ...classes],
          };
        } else {
          children[index] = {
            type: 'element',
            tagName: 'figure',
            properties: { id, className: classes },
            children: above ? [caption, node] : [node, caption],
          };
        }
      }
    };

    walk(tree);
  };
}
