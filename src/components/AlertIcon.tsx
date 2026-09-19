import { ALERT_ICONS, type AlertType } from '../lib/alerts';

/**
 * The mark that labels an alert, as JSX.
 *
 * The same paths `plugins/alerts.ts` builds into a post's tree, from the same
 * record, so the notice on the front page and a `> [!IMPORTANT]` inside a post
 * are the same drawing rather than two that nearly match.
 *
 * Hidden from the accessibility tree: the word beside it says which kind this
 * is, and says it better.
 */
export function AlertIcon({ of }: { of: AlertType }) {
  return (
    <svg
      className="alert__icon"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ALERT_ICONS[of].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}
