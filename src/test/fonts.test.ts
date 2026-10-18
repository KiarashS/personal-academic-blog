import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeSectionFonts } from '../../plugins/fonts';
import { FONT_NAMES, SECTION_FONTS, fontClass, sectionFont, sectionFontsIn } from '../lib/fonts';
import { buildPost, fontWarnings } from '../lib/post-builder';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSectionFonts, { onWarn: (message: string) => warnings.push(message) })
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeSectionFonts', () => {
  it('sets a block in the face it names, with Markdown working inside', () => {
    const html = render('<div font="garamond">\n\nSome **bold** words.\n\n</div>');
    expect(html).toContain('<div class="font-garamond">');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('font="');
  });

  it('works inline, keeps classes already there, and reads data-font too', () => {
    expect(render('A <span font="libertinus">few words</span>.')).toContain(
      '<span class="font-libertinus">few words</span>',
    );
    expect(render('<p class="lede" font="Garamond">x</p>')).toContain(
      '<p class="lede font-garamond">',
    );
    expect(render('<span data-font="garamond">x</span>')).toContain(
      '<span class="font-garamond">x</span>',
    );
  });

  it('leaves a name it does not know in the body face, and says which names it has', () => {
    const warnings: string[] = [];
    const html = render('<div font="comic">\n\nText.\n\n</div>', warnings);
    expect(html).toContain('<div>');
    expect(html).not.toContain('comic');
    expect(warnings[0]).toContain('font="comic" is not a font this site has');
    expect(warnings[0]).toContain('garamond, libertinus');
  });
});

describe('fonts', () => {
  it('reads a name in any case, and nothing else', () => {
    expect(sectionFont(' Garamond ')).toBe('garamond');
    expect(sectionFont('comic')).toBeUndefined();
    expect(sectionFont(3)).toBeUndefined();
  });

  it('finds the faces a page uses, for the preload', () => {
    expect(sectionFontsIn('<div class="lede font-libertinus">x</div>')).toEqual(['libertinus']);
    expect(sectionFontsIn('<p>font-garamond is a class name</p>')).toEqual([]);
  });

  it('has a stylesheet rule, a declared face and a vendored file for every name', () => {
    const prose = readFileSync(new URL('../styles/prose.css', import.meta.url), 'utf8');
    const fonts = readFileSync(new URL('../styles/fonts.css', import.meta.url), 'utf8');
    for (const name of FONT_NAMES) {
      expect(prose).toContain(`.${fontClass(name)} {`);
      expect(fonts).toContain(`./fonts/${SECTION_FONTS[name].preload}.woff2`);
      expect(() =>
        readFileSync(
          new URL(`../styles/fonts/${SECTION_FONTS[name].preload}.woff2`, import.meta.url),
        ),
      ).not.toThrow();
    }
  });
});

describe('font in frontmatter', () => {
  const fontOf = (fm: string) =>
    buildPost({ path: 'a.md', raw: `---\ntitle: A\n${fm}\n---\nBody.` }).meta.font;

  it('sets the whole post in a face it has, and leaves the rest alone', () => {
    expect(fontOf('font: garamond')).toBe('garamond');
    expect(fontOf('font: Libertinus')).toBe('libertinus');
    expect(fontOf('')).toBeUndefined();
    expect(fontOf('font: comic')).toBeUndefined();
  });

  it('warns about a name it does not have', () => {
    expect(fontWarnings('p', 'comic')[0]).toContain('`font: "comic"` is not a font this site has');
    expect(fontWarnings('p', 'garamond')).toEqual([]);
    expect(fontWarnings('p', undefined)).toEqual([]);
  });
});
