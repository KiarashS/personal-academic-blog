import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exitShown } from '../lib/progress';
import { blogIndexPath } from '../lib/routes';
import { useReducedMotion } from '../lib/reduced-motion';
import { siteConfig } from '../site.config';

/**
 * Two ways out: back to the top of the post, and back to the index.
 *
 * They arrive when the header leaves and stay for the rest of the page.
 *
 * Below 80rem they are the two icons alone. There is no margin at that width
 * for a fixed control to stand in, so the pair sits over the column whatever
 * corner it is put in; what it can do is be small about it. Two 44px circles
 * cover a quarter of the bottom line where the labelled pair covered well over
 * half. Above 80rem the margin is 272px and the labels cost nothing, so they
 * are there.
 *
 * It stands in the corner opposite the contents rail, which is the one fixed
 * thing it could otherwise collide with on a wide screen.
 */
function Arrow({ paths }: { paths: string[] }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="15"
    >
      {paths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

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
      <button
        aria-label="Back to the top"
        className="post-exit__link"
        onClick={toTop}
        type="button"
      >
        <Arrow paths={['M12 19V5', 'm5 12 7-7 7 7']} />
        <span className="post-exit__label">Top</span>
      </button>
      <Link aria-label="All posts" className="post-exit__link" to={blogIndexPath()}>
        <Arrow paths={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} />
        <span className="post-exit__label">All posts</span>
      </Link>
    </div>
  );
}
