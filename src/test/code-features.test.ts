import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { parseLineRanges, remarkCodeMeta, splitDiff } from '../../plugins/code-meta';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';
import { rehypeCaptions } from '../../plugins/captions';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkCodeMeta)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      .use(rehypeCodeBlocks)
      .use(rehypeCaptions)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('parseLineRanges', () => {
  it('reads single lines and ranges, in order, once each', () => {
    expect(parseLineRanges('4-6, 2,5')).toEqual([2, 4, 5, 6]);
    expect(parseLineRanges('0, x, 3')).toEqual([3]);
  });
});

describe('splitDiff', () => {
  it('takes the markers off and keeps which line was which', () => {
    expect(splitDiff('+a\n-b\n c\n@@ d')).toEqual({ kinds: '+-  ', code: 'a\nb\nc\n@@ d' });
  });
});

describe('line marks', () => {
  it('marks the lines a fence names', () => {
    const html = render('```js {2}\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```');
    expect(html).toMatch(/class="numbered code-marked"/);
    expect(html.match(/code-line code-line--mark/g)).toHaveLength(1);
    expect(html).not.toContain('data-mark');
  });

  it('marks the one line of a one-line block, which then carries its number', () => {
    const html = render('```js {1}\nconst a = 1;\n```');
    expect(html).toContain('code-line code-line--mark');
    expect(html).toContain('class="numbered code-marked"');
  });
});

describe('diffs', () => {
  it('highlights a diff- fence as its language and marks each line', () => {
    const html = render('```diff-js\n-const a = 1;\n+const a = 2;\n const b = 3;\n```');
    expect(html).toContain('language-js');
    expect(html).toContain('code-diff');
    expect(html).toContain('code-line code-line--del');
    expect(html).toContain('code-line code-line--ins');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
    expect(html).not.toMatch(/>[+-]<span class="hljs-keyword">/);
  });

  it('leaves a plain diff fence to the highlighter', () => {
    const html = render('```diff\n-a\n+b\n```');
    expect(html).not.toContain('code-diff');
  });
});

describe('code tabs', () => {
  const two = [
    '```python tab="Python"',
    'print(1)',
    '```',
    '',
    '```r tab=R',
    'print(1)',
    '```',
  ].join('\n');

  it('groups consecutive tabbed fences into one set, the first chosen', () => {
    const html = render(two);
    expect(html.match(/class="code-tabs"/g)).toHaveLength(1);
    expect(html).toContain(
      '<input type="radio" name="code-tabs-1" id="code-tabs-1-1" class="code-tabs__input" checked>',
    );
    expect(html).toContain(
      '<label for="code-tabs-1-2" class="code-tabs__tab" data-text="R"><input type="radio" name="code-tabs-1" id="code-tabs-1-2" class="code-tabs__input">R</label>',
    );
    expect(html.match(/class="code-block code-tabs__panel"/g)).toHaveLength(2);
    expect(html).not.toContain('data-tab=');
  });

  it('gives the set one bar, with the tabs and one pair of buttons in it', () => {
    const html = render(two);
    expect(html.match(/class="code-block__bar/g)).toHaveLength(1);
    expect(html).toContain(
      '<div class="code-block__bar code-tabs__bar"><div class="code-tabs__list"',
    );
    expect(html.match(/class="code-block__copy"/g)).toHaveLength(1);
    expect(html.match(/class="code-block__wrap"/g)).toHaveLength(1);
    expect(html).not.toContain('code-block__lang');
  });

  it('leaves a lone tabbed fence as an ordinary block', () => {
    const html = render(
      '```python tab="Python"\nprint(1)\n```\n\nText.\n\n```r tab=R\nprint(1)\n```',
    );
    expect(html).not.toContain('code-tabs');
  });

  it('numbers a set as one listing when it has a caption', () => {
    const html = render(`${two}\n\nCaption: Hello in two languages.`);
    expect(html).toContain('<span class="caption__label">Listing 1.</span>');
    expect(html).toMatch(/<figure id="lst-1"[^>]*captioned--code/);
  });
});
