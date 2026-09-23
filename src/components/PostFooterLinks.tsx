import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { readingProgress } from '../lib/progress';
import { blogIndexPath } from '../lib/routes';
import { useReducedMotion } from '../lib/reduced-motion';
import { siteConfig } from '../site.config';

/**
 * Two ways out, once the reading is done.
 *
 * They appear when the reader reaches the end of the reading matter — the same
 * block and the same measure the progress bar uses, so the pair arrives exactly
 * as the bar fills — and stay for the tags, the citation, the comments and the
 * related posts below it. Before that they are not rendered at all: a control
 * that floats over a paragraph someone is reading is chrome, and this site does
 * not have much.
 *
 * It stands in the corner opposite the contents rail, which is the one fixed
 * thing it could otherwise collide with on a wide screen.
 */
export function PostFooterLinks({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const [done, setDone] = useState(false);
  const frame = useRef(0);
  const still = useReducedMotion();

  useEffect(() => {
    const measure = () => {
      frame.current = 0;
      const element = target.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      setDone(
        readingProgress({
          top: box.top + window.scrollY,
          height: box.height,
          scrollY: window.scrollY,
          viewport: window.innerHeight,
        }) >= 1,
      );
    };

    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    if (target.current) observer.observe(target.current);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
    };
  }, [target]);

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
