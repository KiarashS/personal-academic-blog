import { useEffect, useRef, useState } from 'react';
import { currentHeading } from '../lib/contents';
import { siteConfig } from '../site.config';
import type { Heading } from '../lib/types';

/**
 * The contents in the margin, marking the section the reader is in.
 *
 * It is `position: fixed` in the space beside the column, which only exists
 * from 80rem up; below that CSS takes it away and the collapsed list at the
 * top of the post is the whole of the contents. Nothing here knows that — the
 * measuring runs either way, on at most a dozen headings, which is cheaper
 * than asking the window how wide it is on every render and getting hydration
 * wrong for the trouble.
 */
export function ContentsRail({ headings }: { headings: Heading[] }) {
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const frame = useRef(0);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const measure = () => {
      frame.current = 0;
      const boxes = headings
        .map((heading) => {
          const element = document.getElementById(heading.id);
          return element
            ? { id: heading.id, top: element.getBoundingClientRect().top + window.scrollY }
            : undefined;
        })
        .filter((box): box is { id: string; top: number } => box !== undefined);

      setCurrent(
        currentHeading(boxes, {
          scrollY: window.scrollY,
          viewport: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
        }),
      );
    };

    // Scroll events outrun paint; one measurement per frame is enough. The
    // same arrangement the reading progress bar uses.
    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The body arrives in its own chunk and diagrams and images settle after
    // that, so the headings are not where they will end up when this first runs.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
    };
  }, [headings]);

  // A rail longer than the window scrolls inside itself, and the marked
  // heading is the one worth having in view. `nearest` does nothing when it
  // already is, which is the usual case.
  useEffect(() => {
    const rail = list.current;
    if (!current || !rail || rail.scrollHeight <= rail.clientHeight) return;
    rail.querySelector(`[href="#${CSS.escape(current)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  if (headings.length === 0) return null;

  return (
    <nav
      className={`contents-rail contents-rail--${siteConfig.contents.side}`}
      aria-label="Sections"
    >
      <p className="contents-rail__label">Contents</p>
      <ol ref={list}>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'contents-rail__sub' : undefined}>
            <a
              aria-current={heading.id === current ? 'location' : undefined}
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
