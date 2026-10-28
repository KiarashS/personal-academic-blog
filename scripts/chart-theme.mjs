// One theme for every chart, read by the build, which draws each chart twice
// (scripts/render-charts.mjs), by the Markdown plugin, which inlines the data
// and writes the table under it (plugins/charts.ts), and by the page, which
// redraws a chart live once the reader reaches for it (src/lib/charts.ts).
// Because all three use this file, the drawing the page arrives with and the
// live one it becomes are the same picture, so nothing moves when it changes.

import { DIAGRAM_FONT } from './diagram-source.mjs';

/** The column's width, 43.5rem at 16px: a chart fills it and scales down with it. */
export const CHART_WIDTH = 696;

/**
 * A chart that fills the column is drawn at three widths, and the page shows
 * the one nearest the column it is in. One drawing scaled from 696px to a
 * phone's 350 would set 11px labels at 5.5; with three, on any phone from
 * 320px up, a tablet or a desktop, they show at 9 to 13. Vega lays each width
 * out afresh, so a narrow chart also has fewer ticks, not the same ones
 * crowded.
 *
 * `below` is the column width under which the next narrower drawing is
 * shown. src/styles/prose.css repeats these numbers as container queries,
 * and a test holds the two to each other.
 */
export const CHART_SIZES = [
  { name: 'wide', width: CHART_WIDTH, below: Infinity },
  { name: 'mid', width: 500, below: 600 },
  // On a phone the legend goes above the plot, which then has the full width.
  { name: 'narrow', width: 320, below: 420, legend: 'top' },
];

/** Whether the spec is one `prepareSpec` fitted to the column, and so is drawn at every size. */
export const isFitted = (spec) => spec.width === CHART_WIDTH && spec.autosize?.type === 'fit-x';

/** The sizes a spec is drawn at: all three if it fills the column, else its own width only. */
export const sizesOf = (spec) =>
  isFitted(spec) ? CHART_SIZES : [{ name: 'only', width: undefined }];

/** Which size the page shows in a column this many pixels wide. */
export function sizeFor(columnWidth) {
  let chosen = CHART_SIZES[0];
  for (const size of CHART_SIZES) if (columnWidth < size.below) chosen = size;
  return chosen;
}

/** The spec as drawn at one size. A legend placed by the spec's own config stays where it is. */
export function atSize(spec, size) {
  if (size.width === undefined || spec.width === size.width) return spec;
  const out = { ...spec, width: size.width };
  if (size.legend) {
    out.config = {
      ...spec.config,
      legend: { orient: size.legend, ...spec.config?.legend },
    };
  }
  return out;
}

export const CHART_FONT = DIAGRAM_FONT;

/**
 * The site's colours, as `src/styles/global.css` defines them. A test holds the
 * two files to each other, so changing one without the other fails the suite.
 */
export const CHART_TOKENS = {
  light: {
    bg: '#fdfdfc',
    text: '#1b1b18',
    muted: '#6a6a62',
    rule: '#e2e2dc',
    ruleStrong: '#c9c9c0',
  },
  dark: {
    bg: '#14140f',
    text: '#e6e4dc',
    muted: '#9b988c',
    rule: '#2e2e26',
    ruleStrong: '#45453a',
  },
};

/**
 * The series colours, in a fixed order that is the colour-blind safety: every
 * neighbouring pair stays apart for protanopia, deuteranopia and tritanopia,
 * on these exact backgrounds, in both modes. Checked with the dataviz
 * validator (worst adjacent CVD ΔE 9.1 light, 8.4 dark; normal-vision 19.6
 * and 19.3). Dark is the same eight hues stepped for the dark ground, not an
 * inversion. Three light steps sit under 3:1 against the page, which is one
 * reason every chart carries its data as a table.
 *
 * A ninth series is not a ninth colour: fold the rest into "Other" or facet.
 */
export const CHART_PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/** The Vega-Lite config for one mode: recessive axes, thin marks, the page's own type. */
export function chartConfig(mode) {
  const t = CHART_TOKENS[mode];
  return {
    background: null,
    font: CHART_FONT,
    padding: 4,
    view: { stroke: null, continuousHeight: 260 },
    range: { category: CHART_PALETTE[mode] },
    axis: {
      domainColor: t.ruleStrong,
      gridColor: t.rule,
      tickColor: t.ruleStrong,
      labelColor: t.muted,
      titleColor: t.muted,
      labelFontSize: 11,
      titleFontSize: 12,
      titleFontWeight: 600,
      labelPadding: 4,
      titlePadding: 8,
    },
    axisX: { grid: false },
    axisY: { domain: false, ticks: false },
    legend: {
      labelColor: t.text,
      titleColor: t.muted,
      labelFontSize: 12,
      titleFontSize: 12,
      titleFontWeight: 600,
      symbolStrokeWidth: 2,
    },
    title: {
      color: t.text,
      subtitleColor: t.muted,
      fontSize: 15,
      fontWeight: 600,
      anchor: 'start',
      offset: 12,
    },
    header: { labelColor: t.text, titleColor: t.muted },
    text: { color: t.text },
    // Every mark answers a pointer with what it encodes.
    mark: { tooltip: { content: 'encoding' } },
    line: { strokeWidth: 2, strokeCap: 'round', strokeJoin: 'round' },
    point: { size: 64, filled: true },
    // A 2px gap of page between neighbouring fills, and rounded data ends.
    bar: { cornerRadiusEnd: 4, stroke: t.bg, strokeWidth: 1 },
    rect: { stroke: t.bg, strokeWidth: 1 },
    rule: { color: t.muted },
    arc: { stroke: t.bg, strokeWidth: 2 },
  };
}

const COMPOSITE = ['facet', 'repeat', 'concat', 'hconcat', 'vconcat'];

/**
 * The spec as it is drawn: a file named by `data.url` read and inlined, so the
 * page never fetches it and the drawing and the table agree, and a single or
 * layered view fitted to the column unless the author gave it a width.
 *
 * `readText(path)` returns a file's text for a site path such as `/data/x.csv`,
 * or throws.
 */
export function prepareSpec(spec, readText) {
  const out = structuredClone(spec);
  const inline = (data) => {
    if (!data || typeof data.url !== 'string' || /^[a-z]+:/i.test(data.url)) return;
    const type = data.format?.type ?? data.url.split('.').pop()?.toLowerCase();
    const text = readText(data.url);
    delete data.url;
    data.values = type === 'json' ? JSON.parse(text) : text;
    data.format = { ...(data.format ?? {}), type: type === 'json' ? 'json' : type };
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.data) inline(node.data);
    for (const key of ['layer', 'concat', 'hconcat', 'vconcat']) {
      if (Array.isArray(node[key])) node[key].forEach(walk);
    }
    if (node.spec) walk(node.spec);
  };
  walk(out);

  if (!COMPOSITE.some((key) => key in out) && out.width === undefined) {
    out.width = CHART_WIDTH;
    out.autosize = { type: 'fit-x', contains: 'padding' };
  }
  return out;
}

const fieldOf = (channel) =>
  channel && typeof channel.field === 'string' ? channel.field : undefined;
const titleOf = (channel) => (typeof channel.title === 'string' ? channel.title : channel.field);

/**
 * A line chart answers the pointer anywhere over it, not only on a 2px line:
 * a hairline snaps to the nearest x, the points on it show, and one tooltip
 * lists every series there, value by value. Added to a single-view line chart
 * that has an x and a y field and no interaction of its own; `series` is the
 * colour field's values in the order they first appear in the data.
 */
export function withCrosshair(spec, series = []) {
  const markType = typeof spec.mark === 'string' ? spec.mark : spec.mark?.type;
  const encoding = spec.encoding ?? {};
  const x = encoding.x;
  const y = encoding.y;
  const xField = fieldOf(x);
  const yField = fieldOf(y);
  if (markType !== 'line' || !xField || !yField || spec.params || spec.layer) return spec;
  if (COMPOSITE.some((key) => key in spec)) return spec;

  const color = encoding.color;
  const colorField = fieldOf(color);
  if (colorField && (series.length === 0 || series.length > 8)) return spec;

  const { mark, encoding: _encoding, ...rest } = spec;
  // The legend keys a line with a line, as it would without the hover points.
  const keyed =
    color && color.legend !== null
      ? { ...color, legend: { symbolType: 'stroke', ...(color.legend ?? {}) } }
      : color;
  const lineEncoding = { y, ...(keyed ? { color: keyed } : {}) };
  const xTip = { field: xField, type: x.type ?? 'quantitative', title: titleOf(x) };
  const tooltip = colorField
    ? [
        xTip,
        ...series.map((name) => ({
          field: String(name),
          type: 'quantitative',
          ...(y.format ? { format: y.format } : {}),
        })),
      ]
    : [
        xTip,
        {
          field: yField,
          type: y.type ?? 'quantitative',
          title: titleOf(y),
          ...(y.format ? { format: y.format } : {}),
        },
      ];

  return {
    ...rest,
    encoding: { x },
    layer: [
      {
        encoding: lineEncoding,
        layer: [
          { mark: { ...(typeof mark === 'string' ? { type: mark } : mark), tooltip: false } },
          {
            transform: [{ filter: { param: 'hover', empty: false } }],
            // The hover marks are for the pointer: a screen reader has the
            // line's own description and the table.
            mark: { type: 'point', filled: true, size: 64, tooltip: false, aria: false },
          },
        ],
      },
      {
        ...(colorField
          ? { transform: [{ pivot: colorField, value: yField, groupby: [xField] }] }
          : {}),
        mark: { type: 'rule', strokeWidth: 1, aria: false },
        encoding: {
          opacity: { condition: { param: 'hover', empty: false, value: 0.6 }, value: 0 },
          tooltip,
        },
        params: [
          {
            name: 'hover',
            select: {
              type: 'point',
              fields: [xField],
              nearest: true,
              on: 'pointerover',
              clear: 'pointerout',
            },
          },
        ],
      },
    ],
  };
}

/** The colour field's values, in order of first appearance, for `withCrosshair`. */
export function seriesOf(spec, rows) {
  const field = fieldOf(spec.encoding?.color);
  if (!field || !rows) return [];
  return [
    ...new Set(
      rows.map((row) => row[field]).filter((value) => value !== undefined && value !== null),
    ),
  ];
}
