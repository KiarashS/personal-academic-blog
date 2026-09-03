import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';
import { rehypeFigures } from '../../plugins/figures';
import { rehypeCaptions } from '../../plugins/captions';
import { rehypeContentTweaks } from '../../plugins/content-tweaks';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeContentTweaks, { base: '/' })
      .use(rehypeCodeBlocks)
      .use(rehypeFigures, { publicDir: 'public', base: '/' })
      .use(rehypeCaptions)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeCaptions', () => {
  it('numbers figures and tables in separate sequences', () => {
    const html = render(
      [
        '<video src="/a.mp4"></video>',
        '',
        'Caption: A moving picture.',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        'Caption: Some numbers.',
        '',
        '<video src="/b.mp4"></video>',
        '',
        'Caption: Another one.',
      ].join('\n'),
    );

    expect(html).toContain('Figure 1.</span> A moving picture.');
    expect(html).toContain('Table 1.</span> Some numbers.');
    expect(html).toContain('Figure 2.</span> Another one.');
  });

  it('puts a table caption above the table and a figure caption below', () => {
    const table = render(['| a |', '| - |', '| 1 |', '', 'Caption: Above.'].join('\n'));
    expect(table.indexOf('caption__label')).toBeLessThan(table.indexOf('<table'));

    const video = render(['<video src="/a.mp4"></video>', '', 'Caption: Below.'].join('\n'));
    expect(video.indexOf('caption__label')).toBeGreaterThan(video.indexOf('<video'));
  });

  it('leaves a block with no caption alone', () => {
    const html = render('<video src="/a.mp4"></video>\n\nJust a paragraph.');
    expect(html).not.toContain('caption');
    expect(html).toContain('Just a paragraph.');
  });

  it('keeps markup inside a caption and drops the marker', () => {
    const html = render('<video src="/a.mp4"></video>\n\nCaption: *Nine* runs, $n = 9$.');
    expect(html).toContain('<em>Nine</em> runs');
    expect(html).not.toContain('Caption:');
  });

  it('numbers an image whose caption came from the markdown title', () => {
    const html = render('![A plot](/nope.png "The residuals.")');
    expect(html).toContain('Figure 1.</span> The residuals.');
  });

  it('counts code listings in a third sequence, captioned above', () => {
    const html = render(
      [
        '<video src="/a.mp4"></video>',
        '',
        'Caption: A moving picture.',
        '',
        '```python',
        'x = 1',
        '```',
        '',
        'Caption: The first listing.',
        '',
        '```python',
        'y = 2',
        '```',
        '',
        'Caption: The second listing.',
      ].join('\n'),
    );

    expect(html).toContain('Figure 1.</span> A moving picture.');
    expect(html).toContain('Listing 1.</span> The first listing.');
    expect(html).toContain('Listing 2.</span> The second listing.');
    expect(html.indexOf('Listing 1.')).toBeLessThan(html.indexOf('code-block__bar'));
  });

  it('leaves an uncaptioned code block outside a figure', () => {
    const html = render('```python\nx = 1\n```');
    expect(html).toContain('code-block');
    expect(html).not.toContain('captioned');
  });
});
