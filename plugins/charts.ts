import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Element, ElementContent, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { rowsOf } from '../scripts/chart-data.mjs';
import {
  CHART_SIZES,
  chartConfig,
  prepareSpec,
  seriesOf,
  sizesOf,
  withCrosshair,
} from '../scripts/chart-theme.mjs';
import { uniqueIds } from '../src/lib/svg-ids';

/**
 * Charts written as Vega-Lite, in a fence:
 *
 *     ```vega-lite
 *     {
 *       "description": "Validation loss falls faster with warm-up",
 *       "data": { "url": "/data/loss.csv" },
 *       "mark": "line",
 *       "encoding": { … }
 *     }
 *     ```
 *
 * The page arrives with the chart already drawn, in both themes and at each
 * width the column can have, by `npm run diagrams` (scripts/render-charts.mjs),
 * so it costs a reader no script to see one; a container query shows the
 * drawing that fits. Reaching for it, with a pointer or the keyboard, loads
 * Vega and redraws the same spec live, which is what gives it tooltips and any
 * selection the spec defines (src/lib/charts.ts).
 *
 * Under every chart is its data as a table, closed until asked for: a picture
 * cannot be read aloud, and three of the light series colours sit under 3:1
 * against the page. A file named by `data.url` is read from `public/` here and
 * inlined, so the page never fetches it and the table and the drawing agree.
 */

/** For each chart, a drawing per size ("wide", "mid", "narrow", or "only") and theme. */
export interface ChartCache {
  [hash: string]: Record<string, { light: string; dark: string }>;
}

/**
 * Must match `hash` in scripts/render-charts.mjs. Of the spec as drawn, the
 * theme and the sizes it is drawn in, not of the fence: an edit to the CSV beside a post, or
 * to the theme, is a different picture, and a stale one must not be served.
 */
export const chartHash = (spec: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify([spec, chartConfig('light'), chartConfig('dark'), CHART_SIZES]))
    .digest('hex')
    .slice(0, 16);

export function loadChartCache(path: string): ChartCache {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ChartCache;
  } catch {
    return {};
  }
}

const raw = (value: string): ElementContent =>
  ({ type: 'raw', value }) as unknown as ElementContent;

const el = (
  tagName: string,
  properties: Element['properties'],
  children: ElementContent[] = [],
): Element => ({ type: 'element', tagName, properties, children });

const text = (value: string): ElementContent => ({ type: 'text', value });

const MAX_ROWS = 200;

function table(rows: Record<string, unknown>[]): Element {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const shown = rows.slice(0, MAX_ROWS);
  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') return JSON.stringify(value);
    return typeof value === 'symbol' || typeof value === 'function'
      ? ''
      : `${value as string | number | boolean | bigint}`;
  };
  return el('details', { className: ['chart__data'] }, [
    el('summary', {}, [text(`Data (${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`)]),
    el('div', { className: ['table-wrap'] }, [
      el('table', {}, [
        el('thead', {}, [
          el(
            'tr',
            {},
            columns.map((name) => el('th', { scope: 'col' }, [text(name)])),
          ),
        ]),
        el(
          'tbody',
          {},
          shown.map((row) =>
            el(
              'tr',
              {},
              columns.map((name) => el('td', {}, [text(cell(row[name]))])),
            ),
          ),
        ),
      ]),
    ]),
    ...(rows.length > MAX_ROWS
      ? [
          el('p', { className: ['chart__more'] }, [
            text(`The first ${MAX_ROWS} of ${rows.length} rows.`),
          ]),
        ]
      : []),
  ]);
}

/** JSON that is safe inside a `<script>` element. */
const scriptJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export interface ChartOptions {
  cache: ChartCache;
  publicDir: string;
  onWarn?: (message: string) => void;
  onMissing?: () => void;
}

export function rehypeCharts(options: ChartOptions) {
  const readText = (path: string): string =>
    readFileSync(join(options.publicDir, path.replace(/^\/+/, '')), 'utf8');

  return (tree: Root) => {
    const seen = new Set<string>();

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
        if (!code || !Array.isArray(classes) || !classes.map(String).includes('language-vega-lite'))
          return;

        const source = toString(code);
        const replace = (replacement: Element) => {
          (parent.children as ElementContent[])[index] = replacement;
        };

        let spec: Record<string, unknown>;
        let rows: Record<string, unknown>[] | undefined;
        try {
          spec = prepareSpec(JSON.parse(source) as Record<string, unknown>, readText);
          rows = rowsOf(spec);
          spec = withCrosshair(spec, seriesOf(spec, rows));
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          options.onWarn?.(`a chart could not be read: ${message}`);
          replace(
            el('div', { className: ['chart-error'] }, [
              el('strong', {}, [text('Chart could not be drawn.')]),
              el('pre', {}, [text(message)]),
            ]),
          );
          return;
        }

        const cached = options.cache[chartHash(spec)];
        const sizes = sizesOf(spec);
        // A cache written before a size was added is drawn again, not half used.
        const rendered = sizes.every((size) => cached?.[size.name]) ? cached : undefined;
        if (!rendered) options.onMissing?.();
        const drawings = (drawn: ChartCache[string], mode: 'light' | 'dark') =>
          el(
            'div',
            { className: [`chart__${mode}`] },
            sizes.map((size) =>
              el('div', { className: ['chart__size', `chart__size--${size.name}`] }, [
                raw(uniqueIds(drawn[size.name][mode], seen)),
              ]),
            ),
          );
        const description = typeof spec.description === 'string' ? spec.description : undefined;

        replace(
          el(
            'div',
            {
              className: ['chart', ...(rendered ? [] : ['chart--pending'])],
              ...(description ? { role: 'group', ariaLabel: description } : {}),
            },
            [
              ...(rendered ? [drawings(rendered, 'light'), drawings(rendered, 'dark')] : []),
              el('script', { type: 'application/json', className: ['chart__spec'] }, [
                raw(scriptJson(spec)),
              ]),
              ...(rows ? [table(rows)] : []),
            ],
          ),
        );
      });
    };

    walk(tree);
  };
}
