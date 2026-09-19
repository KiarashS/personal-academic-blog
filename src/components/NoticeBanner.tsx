import { useLocation } from 'react-router-dom';
import { AlertIcon } from './AlertIcon';
import { Target } from './Target';
import { noticeFor } from '../lib/notice';
import type { NoticePlace } from '../site.config';
import { parseInlineLinks } from '../lib/inline-links';

/** The kind's own name, which is also what the label reads. */
const label = (kind: string): string => kind.charAt(0).toUpperCase() + kind.slice(1);

/**
 * The site's one message, set apart from the page.
 *
 * It borrows the box a `> [!IMPORTANT]` makes inside a post — `.alert` and its
 * five accents are not scoped to `.prose`, so the notice is the site's existing
 * idiom rather than a sixth one, already themed and already contrast-checked.
 *
 * `aside` and not `role="alert"`. That role is for something that appears while
 * a reader is already there and interrupts them to say so; this is part of the
 * page from the first paint, and should be read in its turn like everything
 * else. Announcing it over whatever they were doing would be a misuse of the
 * one role that can do that.
 *
 * Rendered in both slots and showing itself in one: `notice.place` says which
 * end of each surface it stands at, so the front page can keep it above the
 * greeting while a post closes with it. The slot it is not in returns nothing,
 * so only one copy is ever in the document — two would be read twice.
 *
 * The sentence takes the same markup a news entry does — `[words](target)`,
 * with emoji shortcodes read by the build — so there is one thing to learn and
 * `Target` decides what each link is: a page navigates, a file under `public/`
 * gets the base path, a URL somewhere else opens in its own tab.
 */
export function NoticeBanner({ slot }: { slot: NoticePlace }) {
  const shown = noticeFor(useLocation().pathname);
  if (!shown || shown.place !== slot) return null;
  const { notice } = shown;

  return (
    <aside className={`alert alert--${notice.kind} site-notice site-notice--${slot}`}>
      <p className="alert__label">
        <AlertIcon of={notice.kind} />
        {label(notice.kind)}
      </p>
      <p className="site-notice__text">
        {parseInlineLinks(notice.text).map((segment, index) =>
          segment.href ? (
            <Target href={segment.href} key={index}>
              {segment.text}
            </Target>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>
    </aside>
  );
}
