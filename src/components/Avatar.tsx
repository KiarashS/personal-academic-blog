import { withBase } from '../lib/urls';
import { siteConfig } from '../site.config';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * The portrait beside the name. A file kept under `public/` needs the
 * deployment's base; a URL is left alone.
 *
 * `decoding="async"` and an explicit aspect ratio in the stylesheet keep it
 * from shifting the banner as it loads, which on a page that is one screen
 * tall would move every line under it.
 *
 * No `fetchPriority` here: the build preloads the file from the head at high
 * priority (`portraitPreload` in scripts/prerender.mjs), and with it set React
 * would write a second preload of its own into the body.
 */
export function Avatar({ src }: { src: string }) {
  return (
    <div className="banner__avatar">
      <img
        alt={siteConfig.title}
        className="banner__avatar-image"
        decoding="async"
        src={isUrl(src) ? src : withBase(src)}
      />
    </div>
  );
}
