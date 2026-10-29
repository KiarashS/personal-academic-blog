import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { flagsOf, rehypeFigures } from '../../plugins/figures';
import { rehypeCaptions } from '../../plugins/captions';
import { rehypeCrossRefs } from '../../plugins/crossrefs';

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeFigures, {
        publicDir: 'public',
        base: '',
        onWarn: (message: string) => warnings.push(message),
      })
      .use(rehypeCaptions)
      .use(rehypeCrossRefs)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('sub-figures', () => {
  const pair = [
    '![Light](https://example.org/light.png "Light theme")',
    '![Dark](https://example.org/dark.png "Dark theme")',
    '',
    'Caption: The same plot twice. {#fig-themes}',
    '',
    'See [](#fig-themes-b) and [](#fig-themes).',
  ].join('\n');

  it('sets images that share a paragraph side by side, labelled (a) and (b)', () => {
    const html = render(pair);
    expect(html).toContain('<figure class="figure subfigures captioned captioned--figure"');
    expect(html).toContain('style="--subfigures:2"');
    expect(html).toContain(
      '<figcaption class="subfigure__caption"><span class="subfigure__label">(a)</span> Light theme</figcaption>',
    );
    expect(html.match(/class="subfigure"/g)).toHaveLength(2);
  });

  it('gives each part an address that an empty link reads as Figure 1b', () => {
    const html = render(pair);
    expect(html).toContain('id="fig-themes-a"');
    expect(html).toContain('<a href="#fig-themes-b" class="xref">Figure 1b</a>');
    expect(html).toContain('<a href="#fig-themes" class="xref">Figure 1</a>');
  });

  it('marks a #compare pair for the slider and takes the flag off the paths', () => {
    const html = render(
      '![Raw](https://example.org/raw.png#compare "Raw")\n![Clean](https://example.org/clean.png#compare "Denoised")',
    );
    expect(html).toContain('class="figure subfigures compare"');
    expect(html).toContain('src="https://example.org/raw.png"');
    expect(html).not.toContain('#compare');
  });

  it('shows three images flagged #compare side by side, and says why', () => {
    const warnings: string[] = [];
    const html = render(
      ['a', 'b', 'c'].map((n) => `![${n}](https://example.org/${n}.png#compare)`).join('\n'),
      warnings,
    );
    expect(html).not.toContain('compare"');
    expect(warnings[0]).toMatch(/takes two images, not 3/);
  });

  it('leaves a lone image a figure of its own and an inline one in its sentence', () => {
    expect(render('![A](https://example.org/a.png)')).not.toContain('subfigure');
    expect(
      render('Text ![A](https://example.org/a.png) and ![B](https://example.org/b.png).'),
    ).toContain('<p>Text <img');
  });

  it('leaves a paragraph with a video, a sound or a map in it out of sub-figures', () => {
    for (const other of ['/a/clip.mp4', '/a/talk.mp3', 'geo:35.7,51.3']) {
      expect(render(`![A](https://example.org/a.png)\n![B](${other})`)).not.toContain('subfigure');
    }
  });

  it('reads #frame and #compare in either order', () => {
    expect(flagsOf('/a.png#frame#compare')).toEqual({ src: '/a.png', framed: true, compare: true });
    expect(flagsOf('/a.png#compare#frame')).toEqual({ src: '/a.png', framed: true, compare: true });
  });
});
