import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeAlgorithms } from '../../plugins/algorithms';
import { rehypeCrossRefs } from '../../plugins/crossrefs';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeAlgorithms, { onWarn: (m: string) => warnings.push(m) })
      .use(rehypeCrossRefs)
      .use(rehypeStringify)
      .processSync(markdown),
  );

const algorithm = (caption: string, label = '') =>
  [
    '```algorithm',
    '\\begin{algorithm}',
    caption ? `\\caption{${caption}}` : '',
    label ? `\\label{${label}}` : '',
    '\\begin{algorithmic}',
    '\\STATE $x \\gets 0$',
    '\\end{algorithmic}',
    '\\end{algorithm}',
    '```',
  ]
    .filter(Boolean)
    .join('\n');

describe('rehypeAlgorithms', () => {
  it('sets an algorithm with its maths at build time, numbered in the post', () => {
    const html = render(`${algorithm('First')}\n\n${algorithm('Second', 'second')}`);
    expect(html).toContain('<span class="ps-keyword">Algorithm 1 </span>First');
    expect(html).toContain('<span class="ps-keyword">Algorithm 2 </span>Second');
    expect(html).toContain('id="alg-1"');
    expect(html).toContain('id="alg-second"');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('language-algorithm');
  });

  it('gives a link to a labelled algorithm its number', () => {
    const html = render(`See [](#alg-gd).\n\n${algorithm('Descent', 'gd')}`);
    expect(html).toContain('<a href="#alg-gd" class="xref">Algorithm 1</a>');
  });

  it('leaves an uncaptioned algorithm out of the count', () => {
    const html = render(`${algorithm('')}\n\n${algorithm('Counted')}`);
    expect(html).toContain('Algorithm 1 </span>Counted');
  });

  it('shows the error and the source for TeX it cannot read, and says so', () => {
    const warnings: string[] = [];
    const html = render(
      '```algorithm\n\\begin{algorithm}\\begin{algorithmic}\\IF{x}\n```',
      warnings,
    );
    expect(html).toContain('algorithm-error');
    expect(warnings).toHaveLength(1);
  });
});
