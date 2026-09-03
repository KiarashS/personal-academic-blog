import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString } from 'hast-util-to-string';

const CAPTION = /^caption:\s*/i;

function isElement(node: RootContent, tagName?: string): node is Element {
  return node.type === 'element' && (!tagName || node.tagName === tagName);
}

function classesOf(node: Element): string[] {
  const classes = node.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
  return list.filter(Boolean);
}

type Kind = 'figure' | 'table' | 'code';

/** What a block should be called in its caption, and how it is counted. */
function kindOf(node: Element): Kind | undefined {
  const classes = classesOf(node);
  if (classes.includes('table-wrap')) return 'table';
  if (classes.includes('code-block')) return 'code';
  if (
    classes.includes('figure') ||
    classes.includes('mermaid-figure') ||
    classes.includes('mermaid-pending') ||
    classes.includes('notebook')
  ) {
    return 'figure';
  }
  if (node.tagName === 'video' || node.tagName === 'figure') return 'figure';
  return undefined;
}

const LABELS: Record<Kind, string> = { figure: 'Figure', table: 'Table', code: 'Listing' };

/**
 * A caption goes below a block the reader takes in at a glance and above one
 * they read from the top down. That is a figure below; a table, a listing and
 * a notebook — which is a page of code and output, however it is numbered —
 * above.
 */
function isAbove(node: Element, kind: Kind): boolean {
  if (kind !== 'figure') return true;
  return classesOf(node).includes('notebook');
}

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

function figcaption(label: string, body: ElementContent[]): Element {
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
    ],
  };
}

/**
 * Captions for every kind of block, numbered per post the way a paper numbers
 * them: figures in one sequence, tables in another, code listings in a third.
 * A caption is a paragraph beginning `Caption:` directly after the block;
 * images may also use the Markdown title, which `rehypeFigures` has already
 * turned into a figcaption.
 *
 * Where the caption sits is a separate question from what it is called, and
 * `isAbove` answers it.
 */
export function rehypeCaptions() {
  return (tree: Root) => {
    const counts: Record<Kind, number> = { figure: 0, table: 0, code: 0 };

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

        const label = `${LABELS[kind]} ${(counts[kind] += 1)}.`;
        const above = isAbove(node, kind);
        const body = following ? stripMarker(following) : [...(existing?.children ?? [])];
        const caption = figcaption(label, body);

        if (following) children.splice(followingIndex, 1);
        if (existing) node.children = node.children.filter((child) => child !== existing);

        const classes = ['captioned', `captioned--${kind}`, ...(above ? ['captioned--above'] : [])];

        if (node.tagName === 'figure') {
          if (above) node.children.unshift(caption);
          else node.children.push(caption);
          node.properties = { ...node.properties, className: [...classesOf(node), ...classes] };
        } else {
          children[index] = {
            type: 'element',
            tagName: 'figure',
            properties: { className: classes },
            children: above ? [caption, node] : [node, caption],
          };
        }
      }
    };

    walk(tree);
  };
}
