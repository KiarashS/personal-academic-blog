import { avatarCopyPath, isUrl } from '../lib/avatar';
import { withBase } from '../lib/urls';
import { siteConfig } from '../site.config';

/**
 * The portrait beside the name. A file kept under `public/` needs the
 * deployment's base; a URL is left alone.
 *
 * A build shows the 416px copy the build writes (`src/lib/avatar.ts`); the dev
 * server has no such copy and shows the original. Both bundles of a build see
 * the same `PROD`, so the server's markup and the browser's agree.
 *
 * `decoding="async"` and an explicit aspect ratio in the stylesheet keep it
 * from shifting the banner as it loads, which on a page that is one screen
 * tall would move every line under it.
 *
 * The request that matters is the build's: `portraitPreload` in
 * scripts/prerender.mjs puts a high-priority preload in the head, ahead of the
 * stylesheet and the scripts. React also writes a preload for this `img` at
 * the top of the body, at the low priority images start with; the browser
 * fetches the file once either way.
 */
export function Avatar({ src }: { src: string }) {
  const shown = isUrl(src) ? src : withBase(import.meta.env.PROD ? avatarCopyPath(src) : src);

  return (
    <div className="banner__avatar">
      <img alt={siteConfig.title} className="banner__avatar-image" decoding="async" src={shown} />
    </div>
  );
}
