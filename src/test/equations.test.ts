import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { equationId, rehypeEquations } from '../../plugins/equations';

const render = (markdown: string, onWarn?: (message: string) => void): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeEquations, { onWarn })
      .use(rehypeStringify)
      .processSync(markdown),
  );

const warnings = (markdown: string): string[] => {
  const collected: string[] = [];
  render(markdown, (message) => collected.push(message));
  return collected;
};

describe('equationId', () => {
  it('makes a fragment out of whatever the author typed', () => {
    expect(equationId('bayes')).toBe('eq-bayes');
    expect(equationId('Log Likelihood')).toBe('eq-log-likelihood');
    expect(equationId('eq:2.1')).toBe('eq-eq-2-1');
  });
});

describe('rehypeEquations', () => {
  it('numbers a labelled equation and hands KaTeX the tag', () => {
    const html = render('$$\nx = 1\n\\label{one}\n$$');
    expect(html).toContain('<div class="equation" id="eq-one">');
    expect(html).toContain('\\tag{1}');
    expect(html).not.toContain('\\label');
  });

  it('wraps the whole block, not the code inside it', () => {
    // remark-math emits `pre > code.math-display` and rehype-katex replaces the
    // `pre`. A wrapper inside it survives as an empty `pre` that the code-block
    // plugin then dresses in a copy button.
    const html = render('$$\nx = 1\n\\label{one}\n$$');
    expect(html).toContain('<div class="equation" id="eq-one"><pre>');
    expect(html).not.toContain('<pre><div class="equation"');
  });

  it('leaves an unlabelled equation unnumbered', () => {
    const html = render('$$\nx = 1\n$$');
    expect(html).not.toContain('\\tag');
    expect(html).not.toContain('class="equation"');
  });

  it('counts only the labelled equations, in document order', () => {
    const html = render('$$\na\n\\label{a}\n$$\n\n$$\nb\n$$\n\n$$\nc\n\\label{c}\n$$');
    expect(html).toContain('\\tag{1}');
    expect(html).toContain('\\tag{2}');
    expect(html).not.toContain('\\tag{3}');
    expect(html.indexOf('eq-a')).toBeLessThan(html.indexOf('eq-c'));
  });

  it('turns a reference into a link carrying the number', () => {
    const html = render('$$\nx\n\\label{one}\n$$\n\nSee \\eqref{one}.');
    expect(html).toContain('<a class="eqref" href="#eq-one">(1)</a>');
  });

  it('resolves a reference written above the equation it points at', () => {
    const html = render('See \\eqref{later}.\n\n$$\nx\n\\label{later}\n$$');
    expect(html).toContain('<a class="eqref" href="#eq-later">(1)</a>');
  });

  it('renders an unknown reference as a question and says so', () => {
    const html = render('See \\eqref{nowhere}.');
    expect(html).toContain('>(?)</a>');
    expect(warnings('See \\eqref{nowhere}.')).toEqual([
      '\\eqref{nowhere} has no equation labelled "nowhere"',
    ]);
  });

  it('leaves a reference inside code alone', () => {
    const html = render('$$\nx\n\\label{one}\n$$\n\nWrite `\\eqref{one}` to refer to it.');
    expect(html).toContain('<code>\\eqref{one}</code>');
    expect(html.match(/class="eqref"/g)).toBeNull();
  });

  it('keeps several references to one equation on the same number', () => {
    const html = render('$$\nx\n\\label{one}\n$$\n\n\\eqref{one} and \\eqref{one}.');
    expect(html.match(/href="#eq-one">\(1\)</g)).toHaveLength(2);
  });

  it('points a duplicate label at the first equation and says so', () => {
    const markdown = '$$\na\n\\label{dup}\n$$\n\n$$\nb\n\\label{dup}\n$$';
    expect(warnings(markdown)).toEqual([
      'two equations are labelled "dup"; references will point at the first',
    ]);
    expect(render(markdown).match(/id="eq-dup"/g)).toHaveLength(1);
  });

  it('appends the tag after an environment rather than inside it', () => {
    const html = render('$$\n\\begin{aligned}\na &= b\n\\end{aligned}\n\\label{al}\n$$');
    expect(html.indexOf('\\end{aligned}')).toBeLessThan(html.indexOf('\\tag{1}'));
  });
});
