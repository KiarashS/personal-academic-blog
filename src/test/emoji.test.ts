import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { emojify, remarkEmoji } from '../../plugins/emoji';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkEmoji)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('emojify', () => {
  it('swaps a shortcode for its character', () => {
    expect(emojify('Shipped it :rocket:')).toBe('Shipped it 🚀');
  });

  it('takes the aliases people actually type', () => {
    expect(emojify(':+1: :-1: :tada: :warning:')).toBe('👍 👎 🎉 ⚠️');
  });

  it('takes as many as the line has', () => {
    expect(emojify(':books: and :microscope:')).toBe('📚 and 🔬');
  });

  it('leaves a name it does not know exactly as written', () => {
    expect(emojify('see :not_an_emoji: there')).toBe('see :not_an_emoji: there');
  });

  it('leaves the colons that are not shortcodes alone', () => {
    // A time, a ratio, a label, a path and a bare pair: every one of them
    // matches the pattern and none of them resolves, which is what keeps them
    // intact without this needing to know what any of them are.
    for (const text of [
      'at 12:30:45 today',
      'a 3:2:1 split',
      'Note: a thing',
      'C:\\Users\\kiarash',
      'ratio 16:9',
      '::',
    ]) {
      expect(emojify(text)).toBe(text);
    }
  });

  it('replaces the very short names too, which is what GitHub does', () => {
    // `:x:` and `:a:` are real shortcodes, so a line that happens to wrap one
    // letter in colons gets an emoji. Matching GitHub is the point, and the
    // alternative — a minimum length this invents — would be a surprise of its
    // own the first time `:ok:` did not render.
    expect(emojify(':x:')).toBe('❌');
    expect(emojify(':ok:')).toBe('🆗');
  });

  it('is case-insensitive about the name, as GitHub is', () => {
    expect(emojify(':ROCKET:')).toBe('🚀');
  });

  it('does nothing to a line with no colon in it', () => {
    expect(emojify('nothing to do here')).toBe('nothing to do here');
  });
});

describe('remarkEmoji', () => {
  it('reads shortcodes in prose', () => {
    expect(render('Shipped it :rocket:')).toContain('Shipped it 🚀');
  });

  it('leaves an inline code span alone, so a post can explain the syntax', () => {
    expect(render('Write `:rocket:` for it')).toContain('<code>:rocket:</code>');
  });

  it('leaves a fenced block alone', () => {
    expect(render('```\n:rocket:\n```')).toContain('<code>:rocket:\n</code>');
  });

  it('does not touch a link target that happens to look like one', () => {
    const html = render('[a](https://example.org/a:rocket:b)');
    expect(html).toContain('https://example.org/a:rocket:b');
  });

  it('reads them inside a heading and a list, as GitHub does', () => {
    expect(render('## Done :tada:')).toContain('Done 🎉');
    expect(render('- one :books:')).toContain('one 📚');
  });

  it('reads them in a table cell', () => {
    expect(render('| a |\n| - |\n| :bulb: |')).toContain('💡');
  });
});
