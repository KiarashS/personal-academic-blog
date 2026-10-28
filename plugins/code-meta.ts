import type { Code, Root } from 'mdast';

/**
 * What a fence says after its language, read while the tree is still Markdown.
 *
 *     ```ts {2,4-6}          lines 2 and 4 to 6 highlighted
 *     ```diff-ts             a change, each line marked + or -, highlighted as TypeScript
 *     ```python tab="Python" one tab of a set; the fences that follow it join it
 *
 * The fence's own words are carried to the HTML as data attributes on the
 * `code` element, because the meta string itself does not survive the raw-HTML
 * pass, and `rehypeCodeBlocks` reads them once the code is highlighted.
 *
 * A `diff-` fence loses its markers here, so the highlighter sees the code it
 * is highlighting and not a column of plus signs. Which lines were added and
 * which removed goes along as one character per line.
 */

/** `{1,3-5}` anywhere in the meta. */
const LINES = /\{([\d,\s-]+)\}/;
/** `tab="Python"`, `tab='Python'` or `tab=Python`. */
const TAB = /\btab=(?:"([^"]*)"|'([^']*)'|(\S+))/;

/** The line numbers a `{…}` names, counted from 1, in order and without repeats. */
export function parseLineRanges(spec: string): number[] {
  const lines = new Set<number>();
  for (const part of spec.split(',')) {
    const [from, to] = part
      .trim()
      .split('-')
      .map((n) => Number.parseInt(n, 10));
    if (!Number.isFinite(from) || from < 1) continue;
    const end = Number.isFinite(to) && to >= from ? to : from;
    for (let line = from; line <= Math.min(end, from + 10_000); line += 1) lines.add(line);
  }
  return [...lines].sort((a, b) => a - b);
}

/**
 * The marker each line of a diff starts with, and the line without it. A line
 * with no marker is unchanged, as a hunk header or a blank line is.
 */
export function splitDiff(value: string): { kinds: string; code: string } {
  const kinds: string[] = [];
  const code = value
    .split('\n')
    .map((line) => {
      const sign = line[0];
      if (sign === '+' || sign === '-') {
        kinds.push(sign);
        return line.slice(1);
      }
      kinds.push(' ');
      return sign === ' ' ? line.slice(1) : line;
    })
    .join('\n');
  return { kinds: kinds.join(''), code };
}

export function remarkCodeMeta() {
  return (tree: Root) => {
    const visit = (node: { type: string; children?: unknown[] }) => {
      if (node.type === 'code') {
        const code = node as Code;
        const props: Record<string, string> = {};

        if (code.lang?.startsWith('diff-') && code.lang.length > 5) {
          const { kinds, code: stripped } = splitDiff(code.value);
          code.lang = code.lang.slice(5);
          code.value = stripped;
          props.dataDiff = kinds;
        }

        const meta = code.meta ?? '';
        const lines = LINES.exec(meta);
        if (lines) {
          const marked = parseLineRanges(lines[1]);
          if (marked.length > 0) props.dataMark = marked.join(',');
        }
        const tab = TAB.exec(meta);
        const tabLabel = tab ? (tab[1] ?? tab[2] ?? tab[3] ?? '').trim() : '';
        if (tabLabel) props.dataTab = tabLabel;

        if (Object.keys(props).length > 0) {
          code.data = {
            ...code.data,
            hProperties: { ...(code.data?.hProperties ?? {}), ...props },
          };
        }
        return;
      }
      for (const child of node.children ?? [])
        visit(child as { type: string; children?: unknown[] });
    };
    visit(tree);
  };
}
