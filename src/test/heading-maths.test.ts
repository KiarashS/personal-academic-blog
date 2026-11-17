import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import type { Element, Root } from 'hast';
import { rehypeCrossRefs } from '../../plugins/crossrefs';
import {
  headingMathsBack,
  headingMathsOut,
  richHeadings,
  texWords,
} from '../../plugins/heading-maths';
import type { Heading } from '../lib/types';

/** What the site's contents list collects, as `collectHeadings` does in plugins/markdown.ts. */
function collect() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    file.data.headings = tree.children
      .filter((node): node is Element => node.type === 'element' && node.tagName === 'h2')
      .map((node) => ({ id: String(node.properties.id), text: 'as typed', depth: 2 }));
  };
}

function render(markdown: string) {
  const file = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(headingMathsOut)
    .use(rehypeSlug)
    .use(headingMathsBack)
    .use(collect)
    .use(rehypeKatex)
    .use(richHeadings)
    .use(rehypeCrossRefs)
    .use(rehypeStringify)
    .processSync(markdown);
  return { html: String(file), headings: file.data.headings as Heading[] };
}

describe('texWords', () => {
  it('keeps what TeX draws and drops what only styles it', () => {
    expect(texWords('\\mathcal{L}(w)')).toBe('L(w)');
    expect(texWords('\\alpha_t')).toBe('alpha t');
    expect(texWords('\\hat{\\beta}^{2}')).toBe('beta 2');
  });
});

describe('maths in a heading', () => {
  const { html, headings } = render(
    '## The loss $\\mathcal{L}(w)$ and its gradient\n\nSee [](#the-loss-lw-and-its-gradient).\n\n## Plain words\n',
  );

  it('makes the id from the letters the maths draws, not its TeX', () => {
    expect(headings.map((heading) => heading.id)).toEqual([
      'the-loss-lw-and-its-gradient',
      'plain-words',
    ]);
  });

  it('gives the contents list the rendered heading and words without TeX', () => {
    const [maths, plain] = headings;
    expect(maths.html).toContain('class="katex"');
    expect(maths.text).toBe('The loss L(w) and its gradient');
    expect(plain.html).toBeUndefined();
    expect(plain.text).toBe('as typed');
  });

  it('writes a reference to the heading with its maths rendered, once', () => {
    const reference = /<a href="#the-loss-lw-and-its-gradient" class="xref">([\s\S]*?)<\/a>/.exec(
      html,
    )?.[1];
    expect(reference).toContain('class="katex"');
    expect(reference).not.toContain('\\mathcal{L}(w)L(w)');
    expect(reference?.match(/class="katex"/g)).toHaveLength(1);
  });
});
