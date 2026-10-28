import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import { linkIcon } from './link-icon';

/**
 * Theorems, lemmas, definitions and proofs, written the way an alert is: a
 * blockquote whose first line names the kind.
 *
 *     > [!THEOREM] Bayes' rule {#thm-bayes}
 *     > For events $A$ and $B$ with $P(B) > 0$, …
 *
 *     > [!PROOF] of [](#thm-bayes)
 *     > By the definition of conditional probability, …
 *
 * Anywhere that does not know the syntax it is still a quotation with the kind
 * at the top, which is why it is a blockquote and not a fence. The rest of the
 * first line is the title, which may hold Markdown, a citation or a reference;
 * `{#name}` at its end names the block for links, as a caption's does.
 *
 * Numbered the way amsthm numbers them by default in most papers: one sequence
 * for every kind but the proof, so a post reads Theorem 1, Lemma 2,
 * Definition 3, and a reader looking for "2" finds one thing. A proof is not
 * numbered and ends with a tombstone.
 */

export const THEOREM_KINDS = [
  'theorem',
  'lemma',
  'proposition',
  'corollary',
  'conjecture',
  'definition',
  'example',
  'remark',
  'proof',
] as const;

export type TheoremKind = (typeof THEOREM_KINDS)[number];

/**
 * amsthm's three styles: a statement is set in italic, a definition or an
 * example upright, and a remark upright with its label in italic, so that a
 * reader can tell a claim from the vocabulary it is stated in at a glance.
 */
const STYLE: Record<TheoremKind, 'plain' | 'definition' | 'remark' | 'proof'> = {
  theorem: 'plain',
  lemma: 'plain',
  proposition: 'plain',
  corollary: 'plain',
  conjecture: 'plain',
  definition: 'definition',
  example: 'definition',
  remark: 'remark',
  proof: 'proof',
};

const MARKER = new RegExp(`^\\[!(${THEOREM_KINDS.join('|')})\\][ \\t]*`, 'i');

/** The same shape a caption's name takes: a letter, then word characters or hyphens. */
const NAME = /\s*\{#([A-Za-z][\w-]*)\}\s*$/;

function isElement(
  node: RootContent | ElementContent | undefined,
  tagName?: string,
): node is Element {
  return node?.type === 'element' && (!tagName || node.tagName === tagName);
}

const isText = (node: RootContent | ElementContent | undefined): node is Text =>
  node?.type === 'text';

const isBlank = (node: RootContent | ElementContent | undefined): boolean =>
  isText(node) && node.value.trim() === '';

const label = (kind: TheoremKind): string => kind.charAt(0).toUpperCase() + kind.slice(1);

/**
 * The kind, the title (the rest of the marker's line, as nodes, so emphasis
 * and links in it survive), and the paragraph the body starts in, which loses
 * the line. The marker paragraph goes altogether when the line was all of it.
 */
function takeMarker(quote: Element): { kind: TheoremKind; title: ElementContent[] } | null {
  const first = quote.children.find((child) => !isBlank(child));
  if (!isElement(first, 'p')) return null;
  const opening = first.children[0];
  if (!isText(opening)) return null;
  const found = MARKER.exec(opening.value);
  if (!found) return null;

  opening.value = opening.value.slice(found[0].length);
  const title: ElementContent[] = [];
  while (first.children.length > 0) {
    const node = first.children[0];
    if (isText(node)) {
      const at = node.value.search(/\r?\n/);
      if (at !== -1) {
        if (at > 0) title.push({ type: 'text', value: node.value.slice(0, at) });
        node.value = node.value.slice(at).replace(/^\r?\n/, '');
        if (node.value === '') first.children.shift();
        break;
      }
    }
    title.push(node);
    first.children.shift();
  }

  if (first.children.length === 0 || first.children.every(isBlank)) {
    const index = quote.children.indexOf(first);
    let end = index + 1;
    while (isBlank(quote.children[end])) end += 1;
    quote.children.splice(index, end - index);
  }

  return { kind: found[1].toLowerCase() as TheoremKind, title: trimTitle(title) };
}

function trimTitle(nodes: ElementContent[]): ElementContent[] {
  const out = [...nodes];
  while (isBlank(out[0])) out.shift();
  while (isBlank(out[out.length - 1])) out.pop();
  const head = out[0];
  if (isText(head)) out[0] = { ...head, value: head.value.trimStart() };
  const tail = out[out.length - 1];
  if (isText(tail)) out[out.length - 1] = { ...tail, value: tail.value.trimEnd() };
  return out.filter((node) => !(isText(node) && node.value === ''));
}

function takeName(title: ElementContent[]): { name?: string; title: ElementContent[] } {
  const last = title[title.length - 1];
  if (!isText(last)) return { title };
  const found = NAME.exec(last.value);
  if (!found) return { title };
  const rest = last.value.slice(0, found.index).trimEnd();
  return {
    name: found[1],
    title: rest ? [...title.slice(0, -1), { ...last, value: rest }] : title.slice(0, -1),
  };
}

const span = (className: string, children: ElementContent[]): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { className: [className] },
  children,
});

function permalink(id: string, name: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['caption-anchor', 'theorem__anchor'],
      href: `#${id}`,
      'aria-label': `Copy a link to ${name}`,
    },
    children: [linkIcon('caption-anchor__icon')],
  };
}

/**
 * The run-in heading: "Theorem 2 (Bayes' rule)." in front of the first
 * paragraph, as amsthm sets it. A proof's title follows "Proof" without
 * parentheses, since it is almost always "of Theorem 2".
 */
function heading(
  kind: TheoremKind,
  number: number | undefined,
  title: ElementContent[],
): ElementContent[] {
  const name = number === undefined ? label(kind) : `${label(kind)} ${number}`;
  const parts: ElementContent[] = [span('theorem__label', [{ type: 'text', value: name }])];
  if (title.length > 0) {
    parts.push(
      kind === 'proof'
        ? span('theorem__title', [{ type: 'text', value: ' ' }, ...title])
        : span('theorem__title', [
            { type: 'text', value: ' (' },
            ...title,
            { type: 'text', value: ')' },
          ]),
    );
  }
  parts.push(span('theorem__stop', [{ type: 'text', value: '.' }]));
  return parts;
}

/** The tombstone, read out as what it means rather than as a black square. */
const qed = (): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { className: ['theorem__qed'], role: 'img', ariaLabel: 'End of proof' },
  children: [{ type: 'text', value: '∎' }],
});

export interface TheoremOptions {
  onWarn?: (message: string) => void;
}

export function rehypeTheorems(options: TheoremOptions = {}) {
  return (tree: Root) => {
    let count = 0;
    const taken = new Set<string>();

    const walk = (parent: Root | Element) => {
      for (const node of 'children' in parent ? parent.children : []) {
        if (!isElement(node)) continue;
        if (node.tagName !== 'blockquote') {
          walk(node);
          continue;
        }

        const found = takeMarker(node);
        if (!found) {
          walk(node);
          continue;
        }
        const { kind } = found;
        const { name, title } = takeName(found.title);
        const number = kind === 'proof' ? undefined : (count += 1);
        const fullName = number === undefined ? label(kind) : `${label(kind)} ${number}`;

        let id: string | undefined;
        if (name && !taken.has(name)) id = name;
        else {
          if (name) options.onWarn?.(`two blocks are named "${name}"; the second keeps its number`);
          if (number !== undefined) id = `thm-${number}`;
        }
        if (id) taken.add(id);

        // Anything quoted inside the statement is still for this pass to see.
        walk(node);

        const head = heading(kind, number, title);
        if (id) head.push(permalink(id, fullName));

        const firstIndex = node.children.findIndex((child) => !isBlank(child));
        const first = node.children[firstIndex];
        if (isElement(first, 'p')) {
          first.children.unshift(...head, { type: 'text', value: ' ' });
        } else {
          node.children.unshift({
            type: 'element',
            tagName: 'p',
            properties: { className: ['theorem__head'] },
            children: head,
          });
        }

        if (kind === 'proof') {
          let lastIndex = node.children.length - 1;
          while (lastIndex >= 0 && isBlank(node.children[lastIndex])) lastIndex -= 1;
          const last = node.children[lastIndex];
          if (isElement(last, 'p')) last.children.push({ type: 'text', value: ' ' }, qed());
          else
            node.children.push({
              type: 'element',
              tagName: 'p',
              properties: { className: ['theorem__qed-line'] },
              children: [qed()],
            });
        }

        node.tagName = 'div';
        node.properties = {
          className: ['theorem', `theorem--${STYLE[kind]}`, `theorem--${kind}`],
          ...(id ? { id } : {}),
          ...(number === undefined ? {} : { dataRefLabel: fullName }),
        };
      }
    };

    walk(tree);
  };
}
