import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exitShown } from '../lib/progress';
import { blogIndexPath } from '../lib/routes';
import { useReducedMotion } from '../lib/reduced-motion';
import { siteConfig } from '../site.config';

/**
 * Two ways out: back to the top of the post, and back to the index.
 *
 * They arrive when the header leaves. The header is not sticky, so scrolling
 * takes the site's name, its nav and the link back to the blog off the screen
 * together — while any of it is on screen the pair repeats what is already
 * there, and the moment it goes there is no way back that is not a scroll.
 *
 * It stands in the corner opposite the contents rail, which is the one fixed
 * thing it could otherwise collide with on a wide screen.
 */
export function PostFooterLinks() {
  const [done, setDone] = useState(false);
  const frame = useRef(0);
  const still = useReducedMotion();

  useEffect(() => {
    const measure = () => {
      frame.current = 0;
      const header = document.querySelector('.site-header');
      if (!header) return;
      const bottom = header.getBoundingClientRect().bottom + window.scrollY;
      setDone((shown) => exitShown(shown, bottom, window.scrollY));
    };

    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // The header wraps onto a second line at some widths, which moves the edge
    // the decision is made against.
    const observer = new ResizeObserver(schedule);
    const header = document.querySelector('.site-header');
    if (header) observer.observe(header);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  if (!done) return null;

  /*
   * Scrolling alone would leave a keyboard at the bottom of the document, so
   * the focus goes with it. `main` carries `tabindex="-1"` for the skip link
   * already, which is the same reason and the same element.
   */
  const toTop = () => {
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  const side = siteConfig.contents.side === 'right' ? 'left' : 'right';

  return (
    <div className={`post-exit post-exit--${side}`}>
      <button className="post-exit__link" onClick={toTop} type="button">
        <svg
          aria-hidden="true"
          fill="none"
          focusable="false"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
        Top
      </button>
      <Link className="post-exit__link" to={blogIndexPath()}>
        All posts
      </Link>
    </div>
  );
}
