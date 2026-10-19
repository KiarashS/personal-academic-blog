import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { propValue, rehypeMdxcn, rehypeMdxcnRestore } from '../../plugins/mdxcn';
import { MDXCN_COMPONENTS } from '../mdxcn/names';
import { fillFigures } from '../mdxcn/server';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeMdxcn, { onWarn: (message: string) => warnings.push(message) })
      // Stands in for the rest of the pipeline, which must not see inside.
      .use(rehypeSlug)
      .use(rehypeMdxcnRestore)
      .use(rehypeStringify)
      .processSync(markdown),
  );

const timeline = `<GraphTimeline title="NIGHT">

- 14:02: p95 crossed 800ms
- **14:11: rolled back the cache flag**

</GraphTimeline>`;

describe('rehypeMdxcn', () => {
  it('turns a tag into a figure naming the component and its props', () => {
    const html = render(timeline);
    expect(html).toContain(
      '<mdxcn-figure data-component="GraphTimeline" data-props="{&#x22;title&#x22;:&#x22;NIGHT&#x22;}" data-figure="1">',
    );
  });

  it('keeps the Markdown children inside, as plain HTML for a feed or no script', () => {
    const html = render(timeline);
    expect(html).toContain('<li><strong>14:11: rolled back the cache flag</strong></li>');
    expect(html).toContain('</ul>\n</mdxcn-figure>');
  });

  it('keeps the rest of the pipeline out of the children', () => {
    const html = render('<Faq>\n\n### Is the code available?\n\nYes.\n\n</Faq>\n\n## Outside');
    expect(html).toContain('<h3>Is the code available?</h3>');
    expect(html).toContain('<h2 id="outside">Outside</h2>');
  });

  it('reads every component in any case, and leaves other tags alone', () => {
    expect(render('<graphmeter>\n\n67%\n\n</graphmeter>')).toContain('data-component="GraphMeter"');
    expect(render('<details>\n\nx\n\n</details>')).not.toContain('mdxcn-figure');
  });

  it('gives back the camelCase props the HTML parser lowercased', () => {
    const html = render(
      '<GraphSlope fromLabel="before" toLabel="after">\n\n- read: 1 → 2\n\n</GraphSlope>',
    );
    expect(html).toContain('&#x22;fromLabel&#x22;:&#x22;before&#x22;');
    expect(html).toContain('&#x22;toLabel&#x22;:&#x22;after&#x22;');
  });

  it('numbers the figures in a file, for the ids React makes inside each', () => {
    const html = render(`${timeline}\n\n${timeline}`);
    expect(html).toContain('data-figure="1"');
    expect(html).toContain('data-figure="2"');
    const filled = fillFigures(html);
    expect(filled).toContain('id="_mdxcn-1-R_0_"');
    expect(filled).toContain('id="_mdxcn-2-R_0_"');
  });

  it('says so when a figure holds another', () => {
    const warnings: string[] = [];
    render('<Callout>\n\n<GraphMeter>\n\n50%\n\n</GraphMeter>\n\n</Callout>', warnings);
    expect(warnings[0]).toContain('<GraphMeter> inside <Callout> is not drawn');
  });

  it('knows each of the 46 components, and each one is in the registry', () => {
    expect(Object.keys(MDXCN_COMPONENTS)).toHaveLength(46);
    for (const folder of Object.values(MDXCN_COMPONENTS)) {
      expect(() =>
        readFileSync(new URL(`../mdxcn/registry/default/${folder}/${folder}.tsx`, import.meta.url)),
      ).not.toThrow();
    }
  });
});

describe('propValue', () => {
  it('reads what HTML can only write as text', () => {
    expect(propValue('title', 'NIGHT')).toBe('NIGHT');
    expect(propValue('legend', '')).toBe(true);
    expect(propValue('legend', 'false')).toBe(false);
    expect(propValue('columns', '["a","b"]')).toEqual(['a', 'b']);
    expect(propValue('year', '2026')).toBe(2026);
    // A title that is a number stays the text it was written as.
    expect(propValue('title', '2026')).toBe('2026');
    expect(propValue('columns', '[not json')).toBe('[not json');
  });
});

describe('fillFigures', () => {
  it('draws each figure into a declarative shadow root and keeps the light DOM', () => {
    const html = fillFigures(render(timeline));
    // The stylesheet's address is the build's; under the test runner it is empty.
    expect(html).toMatch(
      /<mdxcn-figure[^>]*><template shadowrootmode="open"><link rel="stylesheet" href="[^"]*">/,
    );
    expect(html).toContain('<div class="mdxcn-root"><figure');
    expect(html).toContain('[ <!-- -->NIGHT<!-- --> ]');
    expect(html).toContain('<li><strong>14:11: rolled back the cache flag</strong></li>');
  });

  it('draws the rows where their motion ends, not hidden for an animation', () => {
    expect(fillFigures(render(timeline))).not.toMatch(/opacity:\s*0[;"]/);
  });

  it('leaves a page without figures, and a figure it cannot name, as they were', () => {
    expect(fillFigures('<p>plain</p>')).toBe('<p>plain</p>');
    const unknown = '<mdxcn-figure data-component="Nope" data-props="{}"></mdxcn-figure>';
    expect(fillFigures(unknown)).toBe(unknown);
  });
});
