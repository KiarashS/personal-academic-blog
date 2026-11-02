import type { Parent, PhrasingContent, Root, RootContent } from 'mdast';

/**
 * Definition lists in Markdown, the way Pandoc and PHP Markdown Extra write
 * them: a term on its line, its definition on the next after a colon.
 *
 *     Prior
 *     : What is believed before the data.
 *
 *     Posterior
 *     : What is believed after it.
 *
 * A term may have more than one definition, and terms may share one; terms
 * and definitions take inline Markdown. Entries in a run, with or without a
 * blank line between them, make one `<dl>`, which the site already sets as
 * two columns from 40rem (prose.css). Only a paragraph that is all terms and
 * definitions, starting with a term and ending with a definition, is taken,
 * so a sentence that happens to begin a line with a colon is left alone.
 */

type Line = PhrasingContent[];

const MARK = /^:[ \t]+/;

/** A paragraph's inline content cut at its line breaks. */
function linesOf(children: PhrasingContent[]): Line[] {
  const lines: Line[] = [[]];
  for (const child of children) {
    if (child.type === 'break') {
      lines.push([]);
    } else if (child.type === 'text' && child.value.includes('\n')) {
      child.value.split('\n').forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ type: 'text', value: part });
      });
    } else {
      lines[lines.length - 1].push(child);
    }
  }
  return lines;
}

const isDefinition = (line: Line) => line[0]?.type === 'text' && MARK.test(line[0].value);

/** The colon and the space after it taken off a definition's line. */
function unmarked(line: Line): Line {
  const [first, ...rest] = line;
  if (first.type !== 'text') return line;
  const value = first.value.replace(MARK, '');
  return value ? [{ ...first, value }, ...rest] : rest;
}

const element = (hName: string, children: unknown[]) =>
  ({ type: 'definitionListPart', data: { hName }, children }) as unknown as RootContent;

/** The terms and definitions of one paragraph, or nothing if it is not a list. */
function entriesOf(node: RootContent): RootContent[] | undefined {
  if (node.type !== 'paragraph') return undefined;
  const lines = linesOf(node.children).filter((line) => line.length > 0);
  const shape = lines.map((line) => (isDefinition(line) ? 'D' : 'T')).join('');
  if (!/^(T+D+)+$/.test(shape)) return undefined;
  return lines.map((line) =>
    isDefinition(line) ? element('dd', unmarked(line)) : element('dt', line),
  );
}

export function remarkDefinitionLists() {
  return (tree: Root) => {
    const walk = (parent: Parent) => {
      const next: RootContent[] = [];
      let list: RootContent[] | undefined;
      for (const node of parent.children) {
        const entries = entriesOf(node);
        if (entries) {
          if (!list) {
            list = [];
            next.push(element('dl', list));
          }
          list.push(...entries);
          continue;
        }
        list = undefined;
        if ('children' in node && node.type !== 'paragraph') walk(node);
        next.push(node);
      }
      parent.children = next;
    };
    walk(tree);
  };
}
