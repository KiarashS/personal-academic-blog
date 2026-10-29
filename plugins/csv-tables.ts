import type { Element, ElementContent, Root } from 'hast';
import { toString } from 'hast-util-to-string';

/**
 * Tables from data, in a fence tagged `table`:
 *
 *     ```table file=/posts/my-post/results.csv
 *     ```
 *
 * or with the rows written in the fence itself. The file is read the way a
 * code fence's is (plugins/code-meta.ts), from `public/` or from a pinned URL
 * kept in the lock, so the table in the post is the file the results came
 * out in, and cannot be retyped wrong. The first row is the header. Commas
 * separate the cells, or tabs in a `.tsv` file or in rows that have no comma;
 * a cell in double quotes may hold commas, line breaks and `""` for a quote.
 *
 * It comes out as any Markdown table does, in the site's booktabs style, and
 * a `Caption:` after the fence numbers it as a table. A column whose every
 * cell is a number is right-aligned, so its figures line up. A table longer
 * than a screen scrolls in its own box with its header kept in view.
 */

/** Rows longer than this scroll in a box of their own. */
const LONG = 20;

/** A number as a results table writes one: `-1.5`, `1,234`, `3e-4`, `87%`. */
const NUMBER = /^[-+−]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?(?:e[-+]?\d+)?%?$/i;
const isNumber = (cell: string): boolean => /\d/.test(cell) && NUMBER.test(cell.trim());

/** RFC 4180, which is what a spreadsheet writes. */
export function parseDelimited(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const el = (tagName: string, properties: Element['properties'], children: ElementContent[]) =>
  ({ type: 'element', tagName, properties, children }) as Element;

export interface CsvTableOptions {
  onWarn?: (message: string) => void;
}

export function rehypeCsvTables(options: CsvTableOptions = {}) {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      parent.children.forEach((node, index) => {
        if (node.type !== 'element') return;
        if (node.tagName !== 'pre') {
          walk(node);
          return;
        }
        const code = node.children.find(
          (child): child is Element => child.type === 'element' && child.tagName === 'code',
        );
        const classes = code?.properties?.className;
        if (!code || !Array.isArray(classes) || !classes.map(String).includes('language-table')) {
          return;
        }

        const text = toString(code);
        const name = String(code.properties.dataSourceName ?? '');
        const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
        const separator =
          /\.tsv$/i.test(name) || (firstLine.includes('\t') && !firstLine.includes(','))
            ? '\t'
            : ',';
        const rows = parseDelimited(text, separator);
        if (rows.length === 0) {
          options.onWarn?.(`a table${name ? ` from ${name}` : ''} has no rows`);
          return;
        }

        const [header, ...body] = rows;
        const width = header.length;
        if (body.some((row) => row.length !== width)) {
          options.onWarn?.(
            `a table${name ? ` from ${name}` : ''} has rows of more or fewer cells than its ` +
              `${width} headings; they are filled out or cut to fit`,
          );
        }
        const cells = body.map((row) =>
          Array.from({ length: width }, (_, i) => (row[i] ?? '').trim()),
        );
        const numeric = header.map(
          (_, i) =>
            cells.some((row) => row[i] !== '') &&
            cells.every((row) => row[i] === '' || isNumber(row[i])),
        );
        const cls = (i: number) => (numeric[i] ? { className: ['numeric'] } : {});

        const table = el('table', {}, [
          el('thead', {}, [
            el(
              'tr',
              {},
              header.map((cell, i) =>
                el('th', { scope: 'col', ...cls(i) }, [{ type: 'text', value: cell.trim() }]),
              ),
            ),
          ]),
          el(
            'tbody',
            {},
            cells.map((row) =>
              el(
                'tr',
                {},
                row.map((cell, i) => el('td', cls(i), [{ type: 'text', value: cell }])),
              ),
            ),
          ),
        ]);

        (parent.children as ElementContent[])[index] = el(
          'div',
          {
            className: ['table-wrap', ...(body.length > LONG ? ['table-wrap--scroll'] : [])],
          },
          [table],
        );
      });
    };
    walk(tree);
  };
}
