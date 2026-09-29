import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { iframeRatio, rehypeContentTweaks } from '../../plugins/content-tweaks';

const render = (markdown: string, base = '/'): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeContentTweaks, { base })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('iframeRatio', () => {
  it('takes plain numbers', () => {
    expect(iframeRatio('800', '400')).toBe('800 / 400');
    expect(iframeRatio(560, 315)).toBe('560 / 315');
  });

  it('gives nothing for a percentage, a unit or a missing side', () => {
    expect(iframeRatio('100%', '400')).toBeUndefined();
    expect(iframeRatio('800px', '400')).toBeUndefined();
    expect(iframeRatio('800', undefined)).toBeUndefined();
    expect(iframeRatio('0', '400')).toBeUndefined();
  });
});

describe('an iframe in a post', () => {
  it('carries its shape, the class the stylesheet sizes, and lazy loading', () => {
    const html = render(
      '<iframe src="https://maps.test/x" width="800" height="400" title="A map"></iframe>',
    );
    expect(html).toContain('class="embed-frame"');
    expect(html).toContain('style="--embed-ratio: 800 / 400"');
    expect(html).toContain('loading="lazy"');
    // Out of the paragraph Markdown wraps a lone HTML element in.
    expect(html).not.toContain('<p><iframe');
  });

  it('falls back to the stylesheet ratio when it has no numeric size', () => {
    const html = render('<iframe src="https://maps.test/x" title="A map"></iframe>');
    expect(html).toContain('class="embed-frame"');
    expect(html).not.toContain('--embed-ratio');
  });

  it('keeps what the post wrote: its own style, class and loading', () => {
    const html = render(
      '<iframe src="https://maps.test/x" class="wide" style="height: 600px;" loading="eager" width="4" height="3" title="A map"></iframe>',
    );
    expect(html).toContain('class="wide embed-frame"');
    expect(html).toContain('style="height: 600px; --embed-ratio: 4 / 3"');
    expect(html).toContain('loading="eager"');
  });

  it('leaves other elements alone', () => {
    expect(render('<video src="/v.mp4"></video>')).not.toContain('embed-frame');
  });
});
