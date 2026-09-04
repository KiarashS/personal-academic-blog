import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeFigures } from '../../plugins/figures';

const publicDir = mkdtempSync(join(tmpdir(), 'figures-'));

/** A PNG header is enough: the size reader never looks past it. */
function png(name: string, width: number, height: number): void {
  const data = new Uint8Array(32);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(data.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  writeFileSync(join(publicDir, name), data);
}

png('wide.png', 1600, 900);
png('wide.dark.png', 1600, 900);
png('narrow.png', 480, 320);
writeFileSync(join(publicDir, 'plot.svg'), '<svg width="2000" height="800"></svg>');

const render = (markdown: string, base = ''): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeFigures, { publicDir, base })
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeFigures, full-size links', () => {
  it('links an image wider than the column to its own file', () => {
    const html = render('![A plot](/wide.png)');
    expect(html).toContain('<a class="figure-zoom" href="/wide.png"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('leaves an image the column can already show alone', () => {
    const html = render('![A plot](/narrow.png)');
    expect(html).not.toContain('figure-zoom');
    expect(html).toContain('<img');
  });

  it('never links a vector image, which the page can scale itself', () => {
    expect(render('![A diagram](/plot.svg)')).not.toContain('figure-zoom');
  });

  it('points each theme variant at its own file', () => {
    const html = render('![A plot](/wide.png)');
    expect(html).toContain('href="/wide.png"');
    expect(html).toContain('href="/wide.dark.png"');
    expect(html.match(/figure-zoom/g)).toHaveLength(2);
  });

  it('carries the deployment base path into the link', () => {
    expect(render('![A plot](/wide.png)', '/blog')).toContain(
      '<a class="figure-zoom" href="/blog/wide.png"',
    );
  });

  it('keeps the caption outside the link', () => {
    const html = render('![A plot](/wide.png "What it shows.")');
    expect(html).toContain('<figcaption>What it shows.</figcaption>');
    expect(html.indexOf('</a>')).toBeLessThan(html.indexOf('<figcaption>'));
  });

  it('respects a threshold the site sets for itself', () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeFigures, { publicDir, base: '', fullSizeFrom: 400 })
        .use(rehypeStringify)
        .processSync('![A plot](/narrow.png)'),
    );
    expect(html).toContain('figure-zoom');
  });
});
