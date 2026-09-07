/** The parts of an anchor these two need, so both can be tested without a DOM. */
export interface LinkTarget {
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  target: string;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
}

/** The router works in paths without the deployment's base directory. */
export function routerPath(
  anchor: Pick<LinkTarget, 'pathname' | 'search' | 'hash'>,
  base: string = import.meta.env.BASE_URL || '/',
): string {
  const prefix = base.replace(/\/$/, '');
  const path = anchor.pathname.startsWith(prefix)
    ? anchor.pathname.slice(prefix.length) || '/'
    : anchor.pathname;
  return `${path}${anchor.search}${anchor.hash}`;
}

/**
 * Whether a click on this link should be routed rather than left to the
 * browser. Markdown produces plain anchors, so without this every internal link
 * in a post or on the front page reloads the whole site: a new document, the
 * bundle parsed again, the scroll position lost.
 *
 * Everything that is not a plain left click on a same-tab, same-origin link is
 * left alone — a middle click, a modified click, an explicit `target`, a
 * download, an external host, and a bare `#fragment`, which belongs to whatever
 * handles anchors on the page.
 */
export function shouldRoute(
  anchor: LinkTarget,
  event: Pick<
    MouseEvent,
    'defaultPrevented' | 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
  >,
  origin: string = window.location.origin,
): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.origin !== origin) return false;

  const href = anchor.getAttribute('href') ?? '';
  if (href.startsWith('#')) return false;

  return true;
}
