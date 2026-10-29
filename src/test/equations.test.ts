import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { equationId, rehypeEquations } from '../../plugins/equations';

const render = (
  markdown: string,
  onWarn?: (message: string) => void,
  numbering: 'all' | 'labelled' = 'labelled',
): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeEquations, { numbering, onWarn })
      .use(rehypeStringify)
      .processSync(markdown),
  );

const warnings = (markdown: string, numbering: 'all' | 'labelled' = 'labelled'): string[] => {
  const collected: string[] = [];
  render(markdown, (message) => collected.push(message), numbering);
  return collected;
};

const renderAll = (markdown: string): string => render(markdown, undefined, 'all');

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
    expect(html).toContain('<div class="equation" id="eq-one" data-ref-label="(1)">');
    expect(html).toContain('\\tag{1}');
    expect(html).not.toContain('\\label');
  });

  it('wraps the whole block, not the code inside it', () => {
    // remark-math emits `pre > code.math-display` and rehype-katex replaces the
    // `pre`. A wrapper inside it survives as an empty `pre` that the code-block
    // plugin then dresses in a copy button.
    const html = render('$$\nx = 1\n\\label{one}\n$$');
    expect(html).toContain('<div class="equation" id="eq-one" data-ref-label="(1)"><pre>');
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

describe("rehypeEquations with numbering: 'all'", () => {
  it('numbers an unlabelled equation and gives it an id to link to', () => {
    const html = renderAll('$$\nx = 1\n$$');
    expect(html).toContain('\\tag{1}');
    expect(html).toContain('<div class="equation" id="equation-1" data-ref-label="(1)">');
  });

  it('counts labelled and unlabelled equations together, in document order', () => {
    const html = renderAll('$$\na\n$$\n\n$$\nb\n\\label{b}\n$$\n\nSee \\eqref{b}.');
    expect(html).toContain('\\tag{1}');
    expect(html).toContain('\\tag{2}');
    expect(html).toContain('<div class="equation" id="eq-b" data-ref-label="(2)">');
    expect(html).toContain('<a class="eqref" href="#eq-b">(2)</a>');
  });

  it('leaves out an equation marked \\notag or \\nonumber, and the count skips it', () => {
    const html = renderAll('$$\na \\notag\n$$\n\n$$\nb \\nonumber\n$$\n\n$$\nc\n$$');
    expect(html).not.toContain('\\notag');
    expect(html).not.toContain('\\nonumber');
    expect(html).toContain('\\tag{1}');
    expect(html).not.toContain('\\tag{2}');
    expect(html.match(/class="equation"/g)).toHaveLength(1);
  });

  it('does not take \\notagged or a longer command for \\notag', () => {
    expect(renderAll('$$\n\\nonumberx\n$$')).toContain('\\tag{1}');
  });

  it("keeps the author's own \\tag, does not count it, and refers to it by that tag", () => {
    const html = renderAll('$$\na \\tag{A}\n\\label{a}\n$$\n\n$$\nb\n$$\n\n\\eqref{a}');
    expect(html).toContain('\\tag{A}');
    expect(html).toContain('\\tag{1}');
    expect(html).not.toContain('\\tag{2}');
    expect(html).toContain('<a class="eqref" href="#eq-a">(A)</a>');
  });

  it('warns about a reference to an equation marked \\notag', () => {
    const markdown = '$$\na \\notag\n\\label{a}\n$$\n\n\\eqref{a}';
    expect(warnings(markdown, 'all')).toEqual([
      'equation labelled "a" is marked \\notag, so references to it have no number',
    ]);
    expect(renderAll(markdown)).toContain('<a class="eqref" href="#eq-a">(?)</a>');
  });

  it('numbers an aligned block once, after the environment', () => {
    const html = renderAll('$$\n\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}\n$$');
    expect(html.match(/\\tag\{/g)).toHaveLength(1);
    expect(html.indexOf('\\end{aligned}')).toBeLessThan(html.indexOf('\\tag{1}'));
  });

  it('gives a duplicate label its own number and points references at the first', () => {
    const markdown = '$$\na\n\\label{d}\n$$\n\n$$\nb\n\\label{d}\n$$\n\n\\eqref{d}';
    const html = renderAll(markdown);
    expect(html).toContain('\\tag{2}');
    expect(html.match(/id="eq-d"/g)).toHaveLength(1);
    expect(html).toContain('<a class="eqref" href="#eq-d">(1)</a>');
  });
});

describe('subequations', () => {
  const block = [
    '$$',
    '\\label{stats}',
    '\\begin{subequations}',
    '\\mu &= \\frac{1}{n} \\sum_i x_i \\label{mean} \\\\',
    '\\sigma^2 &= \\frac{1}{n} \\sum_i (x_i - \\mu)^2 \\label{var}',
    '\\end{subequations}',
    '$$',
  ].join('\n');

  it('numbers the rows (1a), (1b) as one equation, aligned', () => {
    const html = renderAll(`$$\na = b\n$$\n\n${block}`);
    expect(html).toContain('\\begin{align}');
    expect(html).toContain('\\tag{2a}');
    expect(html).toContain('\\tag{2b}');
    expect(html).not.toContain('subequations');
    expect(html).not.toContain('\\label');
  });

  it('makes each row and the group reachable, for \\eqref and empty links', () => {
    const html = renderAll(`${block}\n\nBy \\eqref{mean} and \\eqref{var}, \\eqref{stats}.`);
    expect(html).toContain('class="equation equation--sub" id="eq-stats" data-ref-label="(1)"');
    expect(html).toContain(
      '<span class="equation__anchor" id="eq-mean" data-ref-label="(1a)"></span>',
    );
    expect(html).toContain('<a class="eqref" href="#eq-mean">(1a)</a>');
    expect(html).toContain('<a class="eqref" href="#eq-var">(1b)</a>');
    expect(html).toContain('<a class="eqref" href="#eq-stats">(1)</a>');
  });

  it('gathers rows with no alignment point, and splits only at row ends', async () => {
    const { rowsOf } = await import('../../plugins/equations');
    expect(rowsOf('a = b \\\\ \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} = c')).toEqual([
      'a = b',
      '\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} = c',
    ]);
    expect(
      renderAll('$$\n\\begin{subequations}\na = b \\\\ c = d\n\\end{subequations}\n$$'),
    ).toContain('\\begin{gather}');
  });
});
