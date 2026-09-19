import { isExternal } from './features';

/** A path with an extension is a file under `public/`, not a route of the app. */
const FILE = /\.[a-z0-9]{2,5}$/i;

/**
 * Schemes the browser hands to another application rather than opening a page:
 * mail, a phone call, a message, a map.
 *
 * They are "external" in the sense that the router has no route for them, and
 * not in the sense that matters for `target`: nothing navigates, so there is no
 * tab to open. A `mailto:` with `target="_blank"` leaves an empty tab behind on
 * some browsers and does nothing on the rest.
 */
const HANDOFF = /^(?:mailto|tel|sms|geo|bitcoin|magnet):/i;

export type LinkKind = 'handoff' | 'external' | 'file' | 'route';

/**
 * What kind of link a target is, decided by the target alone.
 *
 * Whoever writes a news entry or the site notice says where they want to go and
 * nothing about how; this is what turns that into a plain anchor, a new tab or
 * a client-side navigation. Order matters: a `mailto:` is a scheme and would
 * otherwise be read as an external URL, and `/cv.pdf` is a path that no route
 * of the app answers.
 */
export function linkKind(href: string): LinkKind {
  if (HANDOFF.test(href)) return 'handoff';
  if (isExternal(href)) return 'external';
  if (FILE.test(href)) return 'file';
  return 'route';
}
