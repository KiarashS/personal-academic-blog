import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { actionFor, isTyping, step, SHORTCUTS } from '../lib/shortcuts';
import { blogIndexPath } from '../lib/routes';

// The index, a tag page and the search results share the card markup; the
// archive is a plainer list of the same thing.
const POST_LINKS = '.post-list .post-card__title a, .archive-list a';

/**
 * Every "previous" and "next" on the site already says so in its markup: the
 * pagination, the newer/older pair at the foot of a post, and the series links
 * above them. Following the relation rather than a place means one pair of keys
 * reads as the page's own sense of forward and back, and a series link wins
 * over the adjacent post because it is rendered first.
 */
const RELATION = { followPrev: 'a[rel~="prev"]', followNext: 'a[rel~="next"]' } as const;

/**
 * The class the cursor leaves on the post it is sitting on.
 *
 * `j` and `k` move focus themselves, and the site's focus ring is drawn on
 * `:focus-visible` — which is not a state but a guess, made independently by
 * each browser, about whether the reader is navigating by keyboard. Browsers
 * disagree about programmatic focus in particular, and Safari generally decides
 * it does not count, so there the cursor moved with nothing to show for it.
 *
 * Saying it outright costs one class and settles it everywhere. The ring is
 * still the same ring: a reader who tabs through the list gets it from
 * `:focus-visible` as before, and this only guarantees it for the keys that
 * move focus without being asked to.
 */
const CURSOR = 'post-cursor';

/**
 * Keyboard shortcuts, and the dialog that documents them. The button is part of
 * the component so that the list has a way in that does not require knowing the
 * shortcut first.
 *
 * Every action is something the page already offers to a mouse; nothing here is
 * the only route to anything.
 */
export function KeyboardShortcuts() {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cycle } = useTheme();

  const open = useCallback(() => dialog.current?.showModal(), []);

  /**
   * A click on the backdrop lands on the dialog element itself, so the target
   * says nothing; the coordinates do. `detail === 0` is a keyboard activation,
   * which reports 0,0 and would otherwise read as a click in the far corner.
   */
  const onClick = useCallback((event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.detail === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) event.currentTarget.close();
  }, []);

  const focusPost = useCallback((by: 1 | -1) => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(POST_LINKS)];
    const next = links[step(links, links.indexOf(document.activeElement as HTMLAnchorElement), by)];
    if (!next) return false;

    for (const marked of document.querySelectorAll(`.${CURSOR}`)) marked.classList.remove(CURSOR);
    next.classList.add(CURSOR);
    // Focus can leave by routes this component never hears about — a click
    // elsewhere, a tab, the page being navigated away from — so the mark is
    // cleaned up by the element that carries it rather than from here.
    next.addEventListener('blur', () => next.classList.remove(CURSOR), { once: true });

    next.focus();
    next.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  }, []);

  /**
   * Where to carry on from once the blog index has rendered. Pressing `j` on a
   * page with no list — the front page, a post — takes the reader to the list
   * and puts them on its first entry, rather than doing nothing at all. The
   * front page used to be the list, so that is where the key is reached for.
   */
  const pending = useRef<1 | -1 | null>(null);

  /** Trailing slashes are noise here: `/blog/` and `/blog` are the same page. */
  const atIndex = useCallback(
    () => pathname.replace(/\/+$/, '') === blogIndexPath().replace(/\/+$/, ''),
    [pathname],
  );

  const move = useCallback(
    (by: 1 | -1) => {
      if (focusPost(by)) return;
      if (atIndex()) return;
      pending.current = by;
      void navigate(blogIndexPath());
    },
    [atIndex, focusPost, navigate],
  );

  useEffect(() => {
    const by = pending.current;
    if (by === null) return;
    pending.current = null;
    focusPost(by);
  }, [focusPost, pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target as HTMLElement | null)) return;
      if (dialog.current?.open && event.key !== '?') return;

      const action = actionFor(event);
      if (!action) return;
      event.preventDefault();

      switch (action) {
        case 'search':
          // The search page focuses its own box when it mounts.
          if (pathname.endsWith('/search')) document.getElementById('search-input')?.focus();
          else void navigate('/search');
          return;
        case 'next':
          return move(1);
        case 'previous':
          return move(-1);
        case 'followPrev':
        case 'followNext':
          // Clicked rather than navigated to: these are router links, and their
          // own handler is what keeps the navigation client-side.
          document.querySelector<HTMLAnchorElement>(RELATION[action])?.click();
          return;
        case 'blog':
          // A later page of the index is a path of its own, so `b` there goes
          // back to the first page; on the first page there is nowhere to go.
          if (!atIndex()) void navigate(blogIndexPath());
          return;
        case 'theme':
          return cycle();
        case 'help':
          return dialog.current?.open ? dialog.current.close() : open();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [atIndex, cycle, move, navigate, open, pathname]);

  return (
    <>
      <button className="shortcuts__open" type="button" onClick={open}>
        Keyboard shortcuts
      </button>
      <dialog
        className="shortcuts"
        ref={dialog}
        aria-labelledby="shortcuts-title"
        onClick={onClick}
      >
        <h2 className="shortcuts__title" id="shortcuts-title">
          Keyboard shortcuts
        </h2>
        <dl className="shortcuts__list">
          {SHORTCUTS.map((shortcut) => (
            <div className="shortcuts__row" key={shortcut.keys}>
              <dt>
                <kbd>{shortcut.keys}</kbd>
              </dt>
              <dd>{shortcut.description}</dd>
            </div>
          ))}
        </dl>
        <form method="dialog">
          <button className="shortcuts__close" type="submit">
            Close
          </button>
        </form>
      </dialog>
    </>
  );
}
