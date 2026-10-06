import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { toString } from 'hast-util-to-string';
import type { Element, Root } from 'hast';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeCodeBlocks)
  .use(rehypeStringify);

const fence = (language: string, code: string) => ['```' + language, code, '```'].join('\n');

const tree = (markdown: string): Root => processor.runSync(processor.parse(markdown));

function find(node: Root | Element, match: (element: Element) => boolean): Element[] {
  const found: Element[] = [];
  for (const child of 'children' in node ? node.children : []) {
    if (child.type !== 'element') continue;
    if (match(child)) found.push(child);
    found.push(...find(child, match));
  }
  return found;
}

const classed = (name: string) => (element: Element) => {
  const classes = element.properties?.className;
  return Array.isArray(classes) && classes.includes(name);
};

const lines = (markdown: string) => find(tree(markdown), classed('code-line'));
const pre = (markdown: string) => find(tree(markdown), (element) => element.tagName === 'pre')[0];

describe('rehypeCodeBlocks', () => {
  it('wraps each line so the stylesheet can number it', () => {
    expect(lines(fence('js', 'const a = 1;\nconst b = 2;\nconst c = 3;'))).toHaveLength(3);
  });

  it('sizes the number gutter to the widest line number', () => {
    const digits = (count: number) =>
      pre(fence('js', Array.from({ length: count }, (_, i) => `line ${i};`).join('\n'))).properties
        ?.style;

    // Right-aligning in a gutter this wide is what keeps line 9 and line 10
    // starting their code at the same column.
    expect(digits(9)).toBe('--code-digits:1');
    expect(digits(10)).toBe('--code-digits:2');
    expect(digits(99)).toBe('--code-digits:2');
    expect(digits(100)).toBe('--code-digits:3');
  });

  it('leaves a block too short to number without a gutter', () => {
    expect(pre(fence('js', 'const a = 1;')).properties?.style).toBeUndefined();
  });

  it('leaves the code the copy button reads unchanged', () => {
    const source = 'def f(x):\n    return x + 1\n';
    expect(toString(pre(fence('python', source)))).toBe(source);
  });

  it('carries a token that spans a newline into both of its lines', () => {
    const split = lines(fence('js', '/* one\n   two */\nconst a = 1;'));
    expect(split).toHaveLength(3);
    expect(find(split[0], classed('hljs-comment'))).toHaveLength(1);
    expect(find(split[1], classed('hljs-comment'))).toHaveLength(1);
    expect(toString(split[0])).toBe('/* one\n');
  });

  it('does not number a single-line block', () => {
    expect(lines(fence('bash', 'npm run build'))).toHaveLength(0);
    expect(toString(pre(fence('bash', 'npm run build')))).toBe('npm run build\n');
  });

  it('puts the language and the copy button in a bar above the code', () => {
    const block = find(tree(fence('js', 'const a = 1;\nconst b = 2;')), classed('code-block'))[0];
    expect(block.children[0]).toMatchObject({ properties: { className: ['code-block__bar'] } });
    expect((block.children[1] as Element).tagName).toBe('pre');
    expect(find(block, classed('code-block__lang'))[0]).toMatchObject({
      children: [{ value: 'js' }],
    });
    expect(find(block, classed('code-block__copy'))).toHaveLength(1);
  });

  it('puts a wrap toggle before the copy button, unpressed, with both of its icons', () => {
    const block = find(tree(fence('js', 'const a = 1;\nconst b = 2;')), classed('code-block'))[0];
    const bar = block.children[0] as Element;
    const buttons = bar.children.filter(
      (child): child is Element => child.type === 'element' && child.tagName === 'button',
    );
    expect(buttons.map((button) => button.properties.className)).toEqual([
      ['code-block__wrap'],
      ['code-block__copy'],
    ]);
    expect(buttons[0].properties.ariaPressed).toBe('false');
    expect(find(buttons[0], classed('code-block__wrap-icon--off'))).toHaveLength(1);
    expect(find(buttons[0], classed('code-block__wrap-icon--on'))).toHaveLength(1);
  });

  it('records each line’s indent, counting a tab as four', () => {
    const styles = lines(fence('', 'def f():\n    return 1\n\tpass')).map(
      (line) => line.properties.style,
    );
    expect(styles).toEqual([undefined, '--indent:4', '--indent:4']);
  });

  it('leaves display maths alone', () => {
    const math = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeCodeBlocks)
      .use(rehypeStringify)
      .processSync(fence('math', 'x = 1'));
    expect(String(math)).not.toContain('code-block');
  });
});
