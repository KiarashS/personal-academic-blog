import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import {
  CHART_SIZES,
  CHART_TOKENS,
  CHART_WIDTH,
  atSize,
  chartConfig,
  prepareSpec,
  sizeFor,
  sizesOf,
  withCrosshair,
} from '../../scripts/chart-theme.mjs';
import { chartHash, rehypeCharts } from '../../plugins/charts';

const css = readFileSync('src/styles/global.css', 'utf8');
const prose = readFileSync('src/styles/prose.css', 'utf8');
const token = (name: string): string | undefined =>
  new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)?.[1]?.toLowerCase();

describe('chart theme', () => {
  it('uses the colours the stylesheet defines', () => {
    for (const mode of ['light', 'dark'] as const) {
      const t = CHART_TOKENS[mode];
      expect(t.bg).toBe(token(`${mode}-bg`));
      expect(t.text).toBe(token(`${mode}-text`));
      expect(t.muted).toBe(token(`${mode}-text-muted`));
      expect(t.rule).toBe(token(`${mode}-rule`));
      expect(t.ruleStrong).toBe(token(`${mode}-rule-strong`));
    }
  });

  it('gives each mode its own palette and axis colours', () => {
    const light = chartConfig('light') as { range: { category: string[] } };
    const dark = chartConfig('dark') as { range: { category: string[] } };
    expect(light.range.category).toHaveLength(8);
    expect(light.range.category[0]).not.toBe(dark.range.category[0]);
  });
});

describe('chart sizes', () => {
  it('picks the drawing nearest the column', () => {
    expect(sizeFor(696).name).toBe('wide');
    expect(sizeFor(600).name).toBe('wide');
    expect(sizeFor(599).name).toBe('mid');
    expect(sizeFor(420).name).toBe('mid');
    expect(sizeFor(419).name).toBe('narrow');
    expect(sizeFor(280).name).toBe('narrow');
  });

  it('matches the container queries in the stylesheet', () => {
    for (const size of CHART_SIZES.slice(1)) {
      expect(prose).toContain(`@container chart (width < ${size.below}px)`);
      expect(prose).toContain(`.chart__size--${size.name}`);
    }
  });

  it('draws a fitted chart at every size and an author-sized one once', () => {
    const fitted = prepareSpec({ mark: 'bar' }, () => '');
    expect(sizesOf(fitted).map((size) => size.name)).toEqual(['wide', 'mid', 'narrow']);
    expect(atSize(fitted, CHART_SIZES[2])).toMatchObject({ width: 320 });
    const own = prepareSpec({ mark: 'bar', width: 300 }, () => '');
    expect(sizesOf(own).map((size) => size.name)).toEqual(['only']);
    expect(atSize(own, sizesOf(own)[0])).toBe(own);
  });
});

describe('prepareSpec', () => {
  it('inlines a file named by data.url and fits a single view to the column', () => {
    const spec = prepareSpec({ data: { url: '/data/x.csv' }, mark: 'bar' }, (path) => {
      expect(path).toBe('/data/x.csv');
      return 'a,b\n1,2';
    });
    expect(spec).toEqual({
      data: { values: 'a,b\n1,2', format: { type: 'csv' } },
      mark: 'bar',
      width: CHART_WIDTH,
      autosize: { type: 'fit-x', contains: 'padding' },
    });
  });

  it('leaves a remote URL, a set width and a composite view as written', () => {
    const remote = prepareSpec({ data: { url: 'https://example.org/x.csv' }, width: 300 }, () => {
      throw new Error('not read');
    });
    expect(remote).toEqual({ data: { url: 'https://example.org/x.csv' }, width: 300 });
    expect(prepareSpec({ hconcat: [] }, () => '')).toEqual({ hconcat: [] });
  });
});

const render = (markdown: string, cache = {}): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeCharts, { cache, publicDir: 'public' })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

const fence = (spec: unknown) => `\`\`\`vega-lite\n${JSON.stringify(spec)}\n\`\`\``;

describe('withCrosshair', () => {
  const line = {
    mark: 'line',
    encoding: {
      x: { field: 'step', type: 'quantitative', title: 'Step' },
      y: { field: 'loss', type: 'quantitative' },
      color: { field: 'run', type: 'nominal' },
    },
  };

  it('adds a hairline that lists every series at the nearest x', () => {
    const out = withCrosshair(line, ['a', 'b']) as unknown as {
      layer: {
        transform?: unknown[];
        encoding: { tooltip?: { field: string }[] };
        params?: unknown[];
      }[];
    };
    const rule = out.layer[1];
    expect(rule.transform).toEqual([{ pivot: 'run', value: 'loss', groupby: ['step'] }]);
    expect(rule.encoding.tooltip?.map((t) => t.field)).toEqual(['step', 'a', 'b']);
    expect(rule.params).toHaveLength(1);
  });

  it('leaves a chart with interaction of its own, or one that is not a line, alone', () => {
    const own = { ...line, params: [{ name: 'p' }] };
    expect(withCrosshair(own, ['a'])).toBe(own);
    const bars = { ...line, mark: 'bar' };
    expect(withCrosshair(bars, ['a'])).toBe(bars);
  });
});

describe('rehypeCharts', () => {
  const spec = {
    description: 'Two bars',
    data: {
      values: [
        { k: 'a', v: 1 },
        { k: 'b', v: 2 },
      ],
    },
    mark: 'bar',
    encoding: { x: { field: 'k' }, y: { field: 'v', type: 'quantitative' } },
  };

  const drawing = { light: '<svg id="a"></svg>', dark: '<svg id="a"></svg>' };

  it('inlines every drawing, the spec and the data as a table', () => {
    // The hash is of the spec as drawn: the prepared one, fitted to the column.
    const drawn = prepareSpec(spec, () => '');
    const html = render(fence(spec), {
      [chartHash(drawn)]: { wide: drawing, mid: drawing, narrow: drawing },
    });
    expect(html).toContain('<div class="chart" role="group" aria-label="Two bars">');
    expect(html).toContain(
      '<div class="chart__light"><div class="chart__size chart__size--wide"><svg id="a"></svg></div>',
    );
    expect(html).toContain(
      '<div class="chart__size chart__size--narrow"><svg id="a-6"></svg></div>',
    );
    expect(html.match(/<svg/g)).toHaveLength(6);
    expect(html).toContain('<script type="application/json" class="chart__spec">');
    expect(html).toContain('<summary>Data (2 rows)</summary>');
    expect(html).toContain('<th scope="col">k</th>');
  });

  it('marks a chart the build did not draw, for the page to draw live', () => {
    expect(render(fence(spec))).toContain('class="chart chart--pending"');
    // Nor one the build drew at only some of the sizes.
    const drawn = prepareSpec(spec, () => '');
    expect(render(fence(spec), { [chartHash(drawn)]: { wide: drawing } })).toContain(
      'chart--pending',
    );
  });

  it('keeps a closing script tag in the data from ending the spec early', () => {
    const html = render(fence({ ...spec, title: '</script><b>' }));
    expect(html).not.toContain('</script><b>');
    expect(html).toContain('\\u003c/script>');
  });

  it('shows the problem for a spec that is not JSON', () => {
    expect(render('```vega-lite\n{ nope\n```')).toContain('chart-error');
  });
});
