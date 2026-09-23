import { useEffect, useRef, useState } from 'react';
import { mediaKind, youtubeEmbedUrl, youtubeThumbUrl, youtubeWatchUrl } from '../lib/media';
import { useReducedMotion } from '../lib/reduced-motion';
import { withBase } from '../lib/urls';
import type { Banner } from '../lib/types';

/** A path under `public/` needs the deployment's base; a URL is already whole. */
const resolve = (src: string): string => (src.startsWith('/') ? withBase(src) : src);

/**
 * The picture or video a post opens with.
 *
 * It renders outside `.post-reading`, so scrolling past a photograph does not
 * count as reading on the progress bar, and the crop is fixed by the post's
 * `ratio` so that a column of posts opens the same way whatever shape their
 * artwork is.
 */
export function PostBanner({ banner }: { banner: Banner }) {
  const kind = mediaKind(banner.src);
  const video = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();
  // A YouTube embed is not loaded until it is wanted: until then the post has
  // made no request to Google and set no cookie of theirs. Autoplay is the one
  // thing that wants it loaded without a click, and a reader who has asked for
  // less motion is not given one — which is also why the server's answer to
  // that question is yes, so the prerendered page never ships a playing embed.
  const [asked, setAsked] = useState(false);
  const playing = asked || (banner.autoplay && !still);

  useEffect(() => {
    if (!banner.autoplay || still || kind !== 'video') return;
    const element = video.current;
    if (!element) return;
    // Autoplay is only allowed muted, and React does not always reflect the
    // `muted` prop onto the element, so it is set here where it has to hold.
    element.muted = true;
    void element.play().catch(() => undefined);
  }, [banner.autoplay, kind, still]);

  if (!kind) return null;

  const style = { '--media-ratio': banner.ratio } as React.CSSProperties;
  /*
   * The tooltip goes on the figure rather than on the picture or the player,
   * so one attribute covers all three kinds and both states of a YouTube
   * banner — the still and the frame that replaces it. The accessible name is
   * separate and stays where it belongs: `alt` on the image, `aria-label` on
   * the video and the play link.
   */
  const frame = {
    className: 'media-frame media-frame--banner',
    style,
    ...(banner.title ? { title: banner.title } : {}),
  };

  if (kind === 'image') {
    return (
      <figure {...frame}>
        <img alt={banner.alt} fetchPriority="high" src={resolve(banner.src)} />
      </figure>
    );
  }

  if (kind === 'video') {
    return (
      <figure {...frame}>
        <video
          aria-label={banner.alt || undefined}
          controls
          loop={banner.autoplay}
          playsInline
          poster={banner.poster ? resolve(banner.poster) : undefined}
          preload="metadata"
          ref={video}
          src={resolve(banner.src)}
        />
      </figure>
    );
  }

  const label = banner.alt || 'the video';

  return (
    <figure {...frame}>
      {playing ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          src={youtubeEmbedUrl(banner.src, { autoplay: true })}
          title={banner.alt || 'YouTube video'}
        />
      ) : (
        /*
         * A link, not a button, so that with no JavaScript it does the one
         * thing left to do — open the video on YouTube. The click is taken
         * over here and answered with the player instead.
         */
        <a
          aria-label={`Play ${label}`}
          className="media-frame__play"
          href={youtubeWatchUrl(banner.src)}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setAsked(true);
          }}
        >
          <img alt="" src={banner.poster ? resolve(banner.poster) : youtubeThumbUrl(banner.src)} />
          <span aria-hidden="true" className="media-frame__badge" />
        </a>
      )}
    </figure>
  );
}
