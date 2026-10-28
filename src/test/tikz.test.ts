import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeTikz, renderTikz, textToPaths, themeColours, tikzHash } from '../../plugins/tikz';

describe('themeColours', () => {
  it('makes black the text colour and white the background, and keeps the rest', () => {
    expect(
      themeColours('<path fill="#000" stroke="black"/><path fill="#fff"/><path stroke="#00f"/>'),
    ).toBe(
      '<path fill="currentColor" stroke="currentColor"/><path style="fill:var(--bg)"/><path stroke="#00f"/>',
    );
  });
});

describe('textToPaths', () => {
  it('draws a character from the Computer Modern files, keeping its colour and transform', () => {
    const out = textToPaths(
      '<text x="0" y="0" font-family="cmr10" font-size="10" fill="black" transform="scale(2)">x</text>',
    );
    expect(out).toMatch(/^<path d="M[^"]+" transform="scale\(2\)" fill="black" stroke="none"\/>$/);
  });
});

describe('rehypeTikz', () => {
  it('draws a picture with TeX, with no text left for a font to fill in', async () => {
    const svg = await renderTikz(
      '\\begin{tikzpicture}\\draw (0,0) -- (1,0) node[right] {$x$};\\end{tikzpicture}',
    );
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toContain('<text');
    expect(svg).toContain('currentColor');
    expect(svg).toMatch(/viewBox=/);
  }, 60_000);

  it('uses a cached drawing and carries the alt text to the picture', async () => {
    const source = '% alt: A line\n\\begin{tikzpicture}\\draw (0,0) -- (1,0);\\end{tikzpicture}';
    const cache = { [tikzHash(source)]: '<svg viewBox="0 0 1 1"></svg>' };
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeTikz, { cache })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(`\`\`\`tikz\n${source}\n\`\`\``),
    );
    expect(html).toContain('<div class="tikz" role="img" aria-label="A line">');
    expect(html).toContain('<svg aria-hidden="true" focusable="false" viewBox="0 0 1 1"></svg>');
  });

  it('shows the source for TeX that fails, and says so', async () => {
    const warnings: string[] = [];
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeTikz, { cache: {}, onWarn: (m: string) => warnings.push(m) })
        .use(rehypeStringify)
        .process('```tikz\n\\begin{tikzpicture}\\undefinedthing\\end{tikzpicture}\n```'),
    );
    expect(html).toContain('tikz-error');
    expect(warnings).toHaveLength(1);
  }, 60_000);
});
