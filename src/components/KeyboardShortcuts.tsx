import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { actionFor, isTyping, step, SHORTCUTS } from '../lib/shortcuts';

// The index, a tag page and the search results share the card markup; the
// archive is a plainer list of the same thing.
const POST_LINKS = '.post-list .post-card__title a, .archive-list a';

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

  const move = useCallback((by: 1 | -1) => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(POST_LINKS)];
    const next = links[step(links, links.indexOf(document.activeElement as HTMLAnchorElement), by)];
    if (!next) return;
    next.focus();
    next.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, []);

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
        case 'theme':
          return cycle();
        case 'help':
          return dialog.current?.open ? dialog.current.close() : open();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycle, move, navigate, open, pathname]);

  return (
    <>
      <button className="shortcuts__open" type="button" onClick={open}>
        Keyboard shortcuts
      </button>
      <dialog className="shortcuts" ref={dialog} aria-labelledby="shortcuts-title">
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
