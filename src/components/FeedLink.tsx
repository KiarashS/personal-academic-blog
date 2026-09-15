import { withBase } from '../lib/urls';

/**
 * The Atom feed, said out loud. Browsers stopped showing the address-bar feed
 * button years ago, so `<link rel="alternate">` alone means only a reader that
 * already guesses `/feed.xml` finds it.
 */
export function FeedLink({ path = '/feed.xml', label = 'Atom feed', icon = false }) {
  return (
    <a
      className={icon ? 'feed-link feed-link--icon header-icon' : 'feed-link'}
      href={withBase(path)}
      /* The same string the label carries, not a second one: a `title` that
         differs from a link's name gets read out after it, and "Atom feed, RSS
         for this blog" is worse than silence. Matching, it is a tooltip for a
         mouse and nothing extra for a screen reader. */
      title={icon ? label : undefined}
    >
      {icon ? (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 11a9 9 0 0 1 9 9" />
          <path d="M4 4a16 16 0 0 1 16 16" />
          <circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      ) : null}
      <span className={icon ? 'visually-hidden' : undefined}>{label}</span>
    </a>
  );
}
