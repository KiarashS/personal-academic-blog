import { mediaKind, youtubeEmbedUrl, youtubeThumbUrl, youtubeWatchUrl } from '../src/lib/media';
import type { Element, ElementContent, Properties, Root, RootContent } from 'hast';

export interface VideoOptions {
  /** Deployment base path, prefixed onto root-relative sources. */
  base: string;
  /** The crop a player is drawn in, as a CSS `aspect-ratio`. */
  ratio?: string;
}

/** The class the figure pass uses to know this block is already finished. */
export const MEDIA_FRAME = 'media-frame';

const element = (
  tagName: string,
  properties: Properties,
  children: ElementContent[] = [],
): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});

/**
 * A lone image in its own paragraph, which is the shape a figure is written
 * in. An image inside a sentence is not one, and is left alone.
 */
function loneImage(node: RootContent): Element | undefined {
  if (node.type !== 'element') return undefined;
  if (node.tagName === 'img') return node;
  if (node.tagName !== 'p') return undefined;

  let found: Element | undefined;
  for (const child of node.children) {
    if (child.type === 'text') {
      if (child.value.trim()) return undefined;
      continue;
    }
    if (child.type !== 'element' || found || child.tagName !== 'img') return undefined;
    found = child;
  }
  return found;
}

/**
 * Video written the way an image is.
 *
 * `![A run of the sampler](/posts/rig/clip.mp4)` and
 * `![The talk](https://youtu.be/…)` both become players. Markdown has no
 * syntax of its own for video, and the alternative — a bare link on its own
 * line — cannot tell a video you want embedded from one you want to link to.
 * An image pointing at an `.mp4` was a broken `<img>` before this, so nothing
 * that used to work means something else now.
 *
 * The result is a `<figure>`, so `rehypeCaptions` numbers it and a
 * `Caption:` paragraph beneath it attaches, the same as a plot or a table.
 * A YouTube video is drawn as its still and a play badge: nothing is asked of
 * Google until the reader clicks, and `PostBody` swaps in the player then.
 * With no JavaScript the still is a link to the video on YouTube.
 */
export function rehypeVideo(options: VideoOptions) {
  const base = options.base.replace(/\/$/, '');
  const ratio = options.ratio ?? '16 / 9';
  const href = (src: string) => (src.startsWith('/') ? `${base}${src}` : src);

  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      // Inside a paragraph every image is part of a sentence. Converting one
      // there would also put a `figure` inside a `p`, which no parser keeps.
      const inline = node.type === 'element' && node.tagName === 'p';
      const children = 'children' in node ? node.children : [];
      children.forEach((child, index) => {
        const image = inline ? undefined : loneImage(child);
        if (!image) {
          if (child.type === 'element') walk(child);
          return;
        }

        const src = String(image.properties?.src ?? '');
        const alt = String(image.properties?.alt ?? '');
        // `![A run](/clip.mp4 "Ten seconds, sped up.")` — the same quoted
        // title that captions a picture, rather than being dropped because
        // this pass got to the image first.
        const caption = String(image.properties?.title ?? '');
        const kind = src ? mediaKind(src) : undefined;
        if (kind !== 'video' && kind !== 'youtube') return;

        /*
         * The frame is a `div` inside the `figure` rather than the figure
         * itself: `aspect-ratio` fixes the element's height, and a caption
         * written under the video is a child of the figure, so on the figure
         * it would squeeze the caption into the player's box.
         */
        // A bare `figcaption` inside the figure, which is the shape the image
        // pass leaves for `rehypeCaptions` to find and number.
        const frame = (inner: Element[]): Element =>
          element('figure', {}, [
            element('div', { className: [MEDIA_FRAME], style: `--media-ratio: ${ratio}` }, inner),
            ...(caption ? [element('figcaption', {}, [{ type: 'text', value: caption }])] : []),
          ]);

        if (kind === 'video') {
          children[index] = frame([
            element('video', {
              src: href(src),
              controls: true,
              playsInline: true,
              preload: 'metadata',
              ...(alt ? { 'aria-label': alt } : {}),
            }),
          ]);
          return;
        }

        children[index] = frame([
          element(
            'a',
            {
              className: ['media-frame__play'],
              href: youtubeWatchUrl(src),
              'aria-label': `Play ${alt || 'the video'}`,
              // Read by `PostBody`, which answers the click with the player
              // rather than letting it leave for YouTube.
              'data-embed': youtubeEmbedUrl(src, { autoplay: true }),
              'data-title': alt || 'YouTube video',
            },
            [
              element('img', {
                src: youtubeThumbUrl(src),
                alt: '',
                loading: 'lazy',
                decoding: 'async',
              }),
              element('span', { className: ['media-frame__badge'], 'aria-hidden': 'true' }),
            ],
          ),
        ]);
      });
    };

    walk(tree);
  };
}
