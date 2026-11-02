import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkAbbreviations } from '../../plugins/abbreviations';
import { remarkDefinitionLists } from '../../plugins/definition-lists';
import { remarkQuotes } from '../../plugins/quotes';
import { rehypeCaptions } from '../../plugins/captions';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkDefinitionLists)
      .use(remarkQuotes)
      .use(remarkAbbreviations, { onWarn: (message: string) => warnings.push(message) })
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(markdown),
  );

const abbr = '<abbr title="Markov chain Monte Carlo">MCMC</abbr>';

describe('abbreviations', () => {
  it('takes the definition out and marks every use, spelling out the first', () => {
    const html = render(
      '*[MCMC]: Markov chain Monte Carlo\n\nWe ran MCMC. Then MCMC again, and two MCMCs.',
    );
    expect(html).not.toContain('*[MCMC]');
    expect(html).toContain(`We ran Markov chain Monte Carlo (${abbr}). Then ${abbr} again`);
    expect(html).toContain('<abbr title="Markov chain Monte Carlo">MCMCs</abbr>');
  });

  it('does not spell out a first use already written out', () => {
    const html = render(
      '*[MCMC]: Markov chain Monte Carlo\n\nMarkov chain Monte Carlo (MCMC) is old.',
    );
    expect(html).toContain(`Markov chain Monte Carlo (${abbr}) is old.`);
    expect(html.match(/Markov chain Monte Carlo \(/g)).toHaveLength(1);
  });

  it('marks a heading without spending the first use on it', () => {
    const html = render('*[MCMC]: Markov chain Monte Carlo\n\n## Why MCMC\n\nMCMC works.');
    expect(html).toContain(`<h2>Why ${abbr}</h2>`);
    expect(html).toContain(`<p>Markov chain Monte Carlo (${abbr}) works.</p>`);
  });

  it('leaves code, maths and longer words alone, and warns of one never used', () => {
    const warnings: string[] = [];
    const html = render(
      '*[MCMC]: Markov chain Monte Carlo\n*[ELBO]: evidence lower bound\n\n`MCMC` and $MCMC$ and NMCMC and MCMC-based.',
      warnings,
    );
    expect(html).toContain('<code>MCMC</code>');
    expect(html).toContain('NMCMC');
    expect(html).not.toContain('N<abbr');
    expect(html).toContain(`Markov chain Monte Carlo (${abbr})-based`);
    expect(warnings).toEqual(['the abbreviation ELBO is defined but not used']);
  });
});

describe('definition lists', () => {
  it('turns terms and colon-led definitions into one list', () => {
    const html = render(
      'Prior\n: What is believed *before* the data.\n\nPosterior\n: After it.\n: Or the update.',
    );
    expect(html).toBe(
      '<dl><dt>Prior</dt><dd>What is believed <em>before</em> the data.</dd>' +
        '<dt>Posterior</dt><dd>After it.</dd><dd>Or the update.</dd></dl>',
    );
  });

  it('leaves a paragraph that only happens to have a colon at a line start', () => {
    expect(render(': not a list')).toBe('<p>: not a list</p>');
    expect(render('A sentence\n: then\nmore words')).toContain('<p>');
  });
});

describe('quotes with their source', () => {
  const hamming =
    '> The purpose of computing is insight, not numbers.\n>\n> — Richard Hamming, *Numerical Methods*';

  it('puts the source in a caption outside the quotation, citing the title', () => {
    const html = render(`Text first.\n\n${hamming}`);
    expect(html).toContain(
      '<figure class="quote"><blockquote>\n<p>The purpose of computing is insight, not numbers.</p>\n</blockquote>' +
        '<figcaption class="quote__source">Richard Hamming, <cite>Numerical Methods</cite></figcaption></figure>',
    );
  });

  it('is not numbered as a figure', () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkQuotes)
        .use(remarkRehype)
        .use(rehypeCaptions)
        .use(rehypeStringify)
        .processSync(`Text.\n\n${hamming}`),
    );
    expect(html).not.toContain('Figure 1');
    expect(html).toContain('<figure class="quote">');
  });

  it('makes one that opens the post an epigraph', () => {
    expect(render(`${hamming}\n\nThen the text.`)).toContain(
      '<figure class="quote quote--epigraph">',
    );
  });

  it('takes -- for the dash, and leaves alerts and plain quotes alone', () => {
    expect(render('Text.\n\n> Said.\n>\n> -- Someone')).toContain(
      '<figcaption class="quote__source">Someone</figcaption>',
    );
    expect(render('> [!NOTE]\n> Hi\n>\n> — not a source')).not.toContain('quote__source');
    expect(render('> Just a quote.')).not.toContain('figure');
  });
});
