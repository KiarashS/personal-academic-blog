import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { rehypeMathPunctuation } from '../../plugins/math-punctuation';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeMathPunctuation)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('punctuation after inline math', () => {
  it('is tied to the formula, so it cannot start a line', () => {
    expect(render('with $x$, the loss')).toMatch(
      /with <span class="math-tie"><span class="katex">.*<\/span>,<\/span> the loss/,
    );
    expect(render('(as $x$).')).toMatch(/<\/span>\)\.<\/span><\/p>/);
  });

  it('ends the drawing with a word joiner, for Safari, after a subscript', () => {
    // The last piece's end, the drawing's, the formula's, and then the comma.
    expect(render('for $x_i$, each')).toMatch(/\u2060<\/span><\/span><\/span>,<\/span> each/);
  });

  it('leaves a space after a formula alone, and display math too', () => {
    expect(render('with $x$ and more')).not.toContain('math-tie');
    expect(render('$$\nx\n$$\n\n, after')).not.toContain('math-tie');
  });
});
