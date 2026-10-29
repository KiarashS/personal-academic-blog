import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeAlerts } from '../../plugins/alerts';
import { rehypeTheorems } from '../../plugins/theorems';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';
import { rehypeFigures } from '../../plugins/figures';
import { rehypeCaptions } from '../../plugins/captions';
import { rehypeCrossRefs } from '../../plugins/crossrefs';
import { rehypeEquations } from '../../plugins/equations';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(rehypeAlerts)
      .use(rehypeTheorems, { onWarn: (m: string) => warnings.push(m) })
      .use(rehypeEquations, { numbering: 'all' })
      .use(rehypeCodeBlocks)
      .use(rehypeFigures, { publicDir: 'public', base: '/' })
      .use(rehypeCaptions)
      .use(rehypeCrossRefs, { onWarn: (m: string) => warnings.push(m) })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeTheorems', () => {
  it('numbers every kind but the proof in one sequence', () => {
    const html = render(
      [
        '> [!THEOREM] Bayes',
        '> The posterior.',
        '',
        '> [!DEFINITION]',
        '> A prior.',
        '',
        '> [!PROOF]',
        '> Obvious.',
        '',
        '> [!lemma]',
        '> Small.',
      ].join('\n'),
    );
    expect(html).toContain('<span class="theorem__label">Theorem 1</span>');
    expect(html).toContain('<span class="theorem__title"> (Bayes)</span>');
    expect(html).toContain('<span class="theorem__label">Definition 2</span>');
    expect(html).toContain('<span class="theorem__label">Proof</span>');
    expect(html).toContain('<span class="theorem__label">Lemma 3</span>');
    expect(html).toContain('class="theorem theorem--plain theorem--theorem" id="thm-1"');
    expect(html).toContain('theorem--definition theorem--definition" id="thm-2"');
  });

  it('numbers an exercise with the rest and keeps its solution closed', () => {
    const html = render(
      [
        '> [!THEOREM]',
        '> A claim.',
        '',
        '> [!EXERCISE] {#ex-mle}',
        '> Find $\\hat\\mu$.',
        '',
        '> [!SOLUTION] to [](#ex-mle)',
        '> The mean.',
      ].join('\n'),
    );
    expect(html).toContain('<span class="theorem__label">Exercise 2</span>');
    expect(html).toContain('theorem--definition theorem--exercise" id="ex-mle"');
    expect(html).toMatch(
      /<details class="theorem theorem--solution"><summary class="theorem__summary"><span class="theorem__label">Solution<\/span><span class="theorem__title"> to <span class="xref">Exercise 2<\/span><\/span><span class="theorem__stop">\.<\/span><\/summary>\s*<p>The mean\.<\/p>\s*<\/details>/,
    );
  });

  it('runs the heading into the first paragraph and ends a proof with a tombstone', () => {
    const html = render('> [!PROOF]\n> By induction.');
    expect(html).toMatch(
      /<p><span class="theorem__label">Proof<\/span><span class="theorem__stop">\.<\/span> By induction\. <span class="theorem__qed" role="img" aria-label="End of proof">∎<\/span><\/p>/,
    );
  });

  it('takes a name off the title and keeps a title with Markdown in it', () => {
    const html = render('> [!THEOREM] The *central* limit {#thm-clt}\n> Sums converge.');
    expect(html).toContain('id="thm-clt"');
    expect(html).toContain('<span class="theorem__title"> (The <em>central</em> limit)</span>');
    expect(html).not.toContain('{#thm-clt}');
  });

  it('leaves alerts and plain quotations alone', () => {
    const html = render('> [!NOTE]\n> A note.\n\n> A quotation.');
    expect(html).toContain('alert--note');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('theorem');
  });
});

describe('rehypeCrossRefs', () => {
  it('fills an empty link with what the target is called, and links it', () => {
    const html = render(
      [
        'See [](#thm-clt), [](#fig-plot), [](#eq-bayes) and [](#the-method).',
        '',
        '## The method',
        '',
        '> [!THEOREM] {#thm-clt}',
        '> Sums converge.',
        '',
        '<figure><img src="/x.png" alt=""></figure>',
        '',
        'Caption: A plot. {#fig-plot}',
        '',
        '$$',
        'a = b \\label{bayes}',
        '$$',
      ].join('\n'),
    );
    expect(html).toContain('<a href="#thm-clt" class="xref">Theorem 1</a>');
    expect(html).toContain('<a href="#fig-plot" class="xref">Figure 1</a>');
    expect(html).toContain('<a href="#eq-bayes" class="xref">(1)</a>');
    expect(html).toContain('<a href="#the-method" class="xref">The method</a>');
    expect(html).not.toContain('data-ref-label');
  });

  it('writes ?? for a name the post does not have, and says so', () => {
    const warnings: string[] = [];
    const html = render('See [](#fig-missing).', warnings);
    expect(html).toContain('<a href="#fig-missing" class="xref">??</a>');
    expect(warnings.join('\n')).toContain('fig-missing');
  });

  it('leaves a link with words of its own as written', () => {
    expect(render('See [the figure](#fig-1).')).toContain('<a href="#fig-1">the figure</a>');
  });

  it('resolves a reference in a proof title to the theorem it proves', () => {
    const html = render('> [!THEOREM] {#thm-a}\n> A.\n\n> [!PROOF] of [](#thm-a)\n> B.');
    expect(html).toContain(
      '<span class="theorem__title"> of <a href="#thm-a" class="xref">Theorem 1</a></span>',
    );
  });
});
