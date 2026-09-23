import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeVideo } from '../../plugins/video';
import { rehypeFigures } from '../../plugins/figures';
import { rehypeCaptions } from '../../plugins/captions';
import { rehypeContentTweaks } from '../../plugins/content-tweaks';

const render = (markdown: string, base = '/'): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeContentTweaks, { base })
      .use(rehypeVideo, { base })
      .use(rehypeFigures, { publicDir: 'public', base })
      .use(rehypeCaptions)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeVideo', () => {
  it('turns an image whose path is a video into a player', () => {
    const html = render('![A run of the sampler](/posts/rig/clip.mp4)');
    expect(html).toContain('<video');
    expect(html).toContain('src="/posts/rig/clip.mp4"');
    expect(html).toContain('controls');
    expect(html).toContain('aria-label="A run of the sampler"');
    expect(html).not.toContain('<img');
  });

  it('carries the deployment base onto a path of the site', () => {
    expect(render('![](/posts/rig/clip.mp4)', '/blog/')).toContain(
      'src="/blog/posts/rig/clip.mp4"',
    );
  });

  it('asks nothing of YouTube until the reader clicks', () => {
    const html = render('![The talk](https://youtu.be/dQw4w9WgXcQ)');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('i.ytimg.com/vi/dQw4w9WgXcQ');
    expect(html).toContain('data-embed="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    // Without JavaScript the still is still a way to watch the video.
    expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(html).toContain('aria-label="Play The talk"');
  });

  it('numbers a video with the figures, and takes the caption under it', () => {
    const html = render(
      [
        '![](/figures/pipeline.svg "The build stages.")',
        '',
        '![A run](/posts/rig/clip.mp4)',
        '',
        'Caption: Ten seconds, sped up.',
      ].join('\n'),
    );
    expect(html).toContain('Figure 2.');
    expect(html).toContain('Ten seconds, sped up.');
    // The caption is a sibling of the framed player, not a child of it: the
    // frame has a fixed aspect ratio, which would squash a caption inside it.
    expect(html).toContain('</video></div><figcaption');
  });

  it('leaves a picture to the image pass', () => {
    const html = render('![A plot](/figures/pipeline.svg)');
    expect(html).toContain('<img');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('media-frame');
  });

  it('leaves an image inside a sentence alone', () => {
    const html = render('A frame ![](/posts/rig/clip.mp4) of it.');
    expect(html).not.toContain('<video');
  });

  it('does not rewrap the YouTube still as a figure of its own', () => {
    const html = render('![The talk](https://youtu.be/dQw4w9WgXcQ)');
    expect(html).not.toContain('figure-image');
    expect(html).not.toContain('figure-zoom');
    expect(html.match(/<figure/g)).toHaveLength(1);
  });

  it('captions a video from the Markdown title, as it does a picture', () => {
    const html = render('![A run](/posts/rig/clip.mp4 "Ten seconds, sped up.")');
    expect(html).toContain('Figure 1.');
    expect(html).toContain('Ten seconds, sped up.');
    expect(html).toContain('</video></div><figcaption');
  });
});
