import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { cssColor, rehypeColorSwatches } from '../../plugins/color-swatches';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeColorSwatches)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('cssColor', () => {
  it('reads every length of HEX', () => {
    for (const value of ['#f80', '#f80c', '#ff8800', '#FF8800CC'])
      expect(cssColor(value)).toBe(value);
  });

  it('reads rgb and hsl with commas or with spaces, with or without alpha', () => {
    for (const value of [
      'rgb(0, 128, 255)',
      'rgba(0, 128, 255, 0.5)',
      'rgb(0 128 255)',
      'rgb(0 128 255 / 50%)',
      'rgb(0%, 50%, 100%)',
      'hsl(120, 60%, 40%)',
      'hsla(120, 60%, 40%, .3)',
      'hsl(120deg 60% 40%)',
      'hsl(0.5turn 60% 40% / 0.8)',
    ])
      expect(cssColor(value)).toBe(value);
  });

  it('refuses what is not a colour, or not one a browser draws', () => {
    for (const value of [
      '#ff888',
      '#ggg',
      'ff8800',
      'rgb(300, 0, 0)',
      'rgb(0, 0)',
      'rgb(0, 0, 0, 2)',
      'rgb(0 0, 0)',
      'hsl(120, 160%, 40%)',
      'hsl(120, 60, 40)',
      'red',
      'color: #ff8800',
    ])
      expect(cssColor(value)).toBeUndefined();
  });
});

describe('rehypeColorSwatches', () => {
  it('puts a swatch before a colour in inline code', () => {
    const html = render('Use `#ff8800` here.');
    expect(html).toContain(
      '<code class="color-value"><span class="color-swatch" style="--swatch: #ff8800" aria-hidden="true"></span>#ff8800</code>',
    );
  });

  it('leaves code that holds more than the colour alone', () => {
    expect(render('`color: #ff8800`')).not.toContain('color-swatch');
  });

  it('leaves a colour in a block of code alone', () => {
    expect(render('```css\n#ff8800\n```')).not.toContain('color-swatch');
  });

  it('leaves a colour outside code alone', () => {
    expect(render('Bare #ff8800 in a sentence.')).not.toContain('color-swatch');
  });
});
