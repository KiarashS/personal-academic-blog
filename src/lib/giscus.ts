import { canonicalUrl } from './urls';
import type { CommentState } from '../site.config';

/**
 * The stylesheet giscus is told to dress itself in.
 *
 * A built-in name for a thread that takes comments, and a URL of the site's
 * own for one that does not — giscus loads it inside its frame, which is the
 * only way in from out here. It has to be absolute and publicly reachable,
 * because the fetch is made by giscus and not by the reader's page; that is
 * also why a site which has never been deployed cannot preview this.
 */
export function giscusTheme(state: CommentState, dark: boolean): string {
  if (state !== 'readonly') return dark ? 'dark_dimmed' : 'light';
  return canonicalUrl(`/giscus/readonly-${dark ? 'dark' : 'light'}.css`);
}
