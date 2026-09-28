import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { withBase } from '../lib/urls';

const decoded = (path: string): string => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

/**
 * A bar across the top of the window while the next page is on its way.
 *
 * The router moves between pages inside a transition, so React keeps the page
 * a reader is on until the next one can be shown whole, rather than swapping
 * in "Loading…" and then the page. That is what a reader wants, but it leaves
 * a click on a slow connection with nothing to show for itself. The address
 * bar has already changed (the router writes history before it renders) and
 * the page on screen has not: the gap between the two is exactly "loading".
 *
 * Nothing shows for a page that is ready in the first 150ms, which on a warm
 * cache is all of them; the delay is in the stylesheet.
 *
 * It also marks the document once a reader has moved from the page they
 * arrived on. The front page fades in on arrival, and the stylesheet keeps it
 * to that: coming back to it from a post is going back, not arriving.
 */
export function NavigationProgress() {
  const { pathname } = useLocation();
  const shown = decoded(withBase(pathname));
  const current = useRef(shown);
  // Where the address bar went, and from which page. Keyed to the page it left
  // so that once any page is shown the request is spent, however it was made.
  const [requested, setRequested] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    current.current = shown;
  }, [shown]);

  useEffect(() => {
    // After the event has run: a link's handler, or a shortcut's, writes
    // history during it.
    const check = () =>
      window.setTimeout(
        () => setRequested({ from: current.current, to: decoded(window.location.pathname) }),
        0,
      );
    document.addEventListener('click', check);
    document.addEventListener('keydown', check);
    window.addEventListener('popstate', check);
    return () => {
      document.removeEventListener('click', check);
      document.removeEventListener('keydown', check);
      window.removeEventListener('popstate', check);
    };
  }, []);

  const [arrivedAt] = useState(pathname);
  useEffect(() => {
    if (pathname !== arrivedAt) document.documentElement.dataset.navigated = '';
  }, [pathname, arrivedAt]);

  const pending = requested !== null && requested.from === shown && requested.to !== shown;
  if (!pending) return null;

  return (
    <div className="nav-progress" aria-hidden="true">
      <div className="nav-progress__bar" />
    </div>
  );
}
