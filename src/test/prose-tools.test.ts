import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { rehypeSmartQuotes, smarten } from '../../plugins/smart-quotes';
import { rehypePostLinks } from '../../plugins/post-links';
import { rehypeSectionNumbers } from '../../plugins/section-numbers';
import { rehypeCrossRefs } from '../../plugins/crossrefs';
import { mathMacros } from '../../plugins/math-macros';

describe('smarten', () => {
  it('turns quotes the way the text around them says', () => {
    expect(smarten('"Figure 2" and \'this\'', ' ')).toBe('“Figure 2” and ‘this’');
    expect(smarten("it's the reader's", ' ')).toBe('it’s the reader’s');
    expect(smarten('(“nested ‘quotes’”)', ' ')).toBe('(“nested ‘quotes’”)');
  });

  it('reads TeX dashes and an ellipsis', () => {
    expect(smarten('pages 10--12 --- and so on...', ' ')).toBe('pages 10–12 — and so on…');
  });

  it("knows an apostrophe that starts a word: 'tis, the '90s", () => {
    expect(smarten("'tis the '90s", ' ')).toBe('’tis the ’90s');
  });

  it('opens or closes by what came before, across nodes', () => {
    expect(smarten('"', 'd')).toBe('”');
    expect(smarten('"', ' ')).toBe('“');
  });
});

const render = (markdown: string, enabled = true): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeSmartQuotes, { enabled })
      .use(rehypeKatex)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeSmartQuotes', () => {
  it('leaves code, maths and attributes as typed', () => {
    const html = render('A "quote", `print("x")`, $a\'$ and [a "link"](/x "a \'title\'").');
    expect(html).toContain('A “quote”');
    expect(html).toContain('<code>print("x")</code>');
    expect(html).toContain('title="a &#x27;title&#x27;"');
    expect(html).toContain('a “link”');
    expect(html).not.toMatch(/a’<\/annotation>/);
  });

  it('closes a quote that follows emphasis or code', () => {
    expect(render('"*so*" and "`x`"')).toContain('“<em>so</em>” and “<code>x</code>”');
  });

  it('does nothing when the post or the site turns it off', () => {
    expect(render('"a" -- b', false)).toContain('"a" -- b');
  });
});

describe('rehypePostLinks', () => {
  const titles = new Map([['/blog/math', 'Math and citations']]);
  const run = (markdown: string, warnings: string[] = []) =>
    String(
      unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypePostLinks, {
          titles,
          unpublished: new Set(['/blog/draft']),
          onWarn: (m: string) => warnings.push(m),
        })
        .use(rehypeStringify)
        .processSync(markdown),
    );

  it("writes a linked post's title, with or without a section", () => {
    expect(run('See [](/blog/math).')).toContain(
      '<a href="/blog/math" class="post-link">Math and citations</a>',
    );
    expect(run('See [](/blog/math/#sums).')).toContain('>Math and citations</a>');
  });

  it('leaves a link with words of its own, and reports one to no post', () => {
    const warnings: string[] = [];
    expect(run('[my words](/blog/math)')).toContain('>my words</a>');
    expect(run('[](/blog/nope) [](/blog/draft)', warnings)).toContain('>??</a>');
    expect(warnings).toEqual([
      '[](/blog/nope) points at no post',
      '[](/blog/draft) points at a post that is not published',
    ]);
  });
});

describe('rehypeSectionNumbers', () => {
  const run = (markdown: string, enabled = true) =>
    String(
      unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeSectionNumbers, { enabled })
        .use(rehypeCrossRefs)
        .use(rehypeStringify)
        .processSync(markdown),
    );

  it('numbers sections and their subsections, keeping the ids', () => {
    const html = run('## Intro\n\n## Method\n\n### Model\n\n#### Prior\n\n## End');
    expect(html).toContain(
      '<h2 id="intro" data-section-number="1"><span class="section-number">1</span> Intro</h2>',
    );
    expect(html).toContain(
      '<h3 id="model" data-section-number="2.1"><span class="section-number">2.1</span> Model</h3>',
    );
    expect(html).toContain('<span class="section-number">2.1.1</span> Prior');
    expect(html).toContain('<span class="section-number">3</span> End');
  });

  it('makes an empty link to a section read its number', () => {
    expect(run('## Intro\n\n### Model\n\nSee [](#model).')).toContain(
      '<a href="#model" class="xref">Section 1.1</a>',
    );
  });

  it('leaves a post that did not ask alone', () => {
    expect(run('## Intro', false)).toBe('<h2 id="intro">Intro</h2>');
  });
});

describe('mathMacros', () => {
  it("adds a post's macros to the site's, with or without the backslash", () => {
    const warnings: string[] = [];
    const macros = mathMacros(
      { '\\R': '\\mathbb{R}' },
      { KL: 'D_{\\mathrm{KL}}', '\\R': '\\mathbf{R}', 'no good': 'x', empty: null },
      (m) => warnings.push(m),
    );
    expect(macros).toEqual({ '\\R': '\\mathbf{R}', '\\KL': 'D_{\\mathrm{KL}}' });
    expect(warnings).toHaveLength(2);
  });

  it("gives each post a fresh copy, so one post's \\gdef stays its own", () => {
    const site = { '\\R': '\\mathbb{R}' };
    expect(mathMacros(site, undefined)).not.toBe(mathMacros(site, undefined));
  });
});
