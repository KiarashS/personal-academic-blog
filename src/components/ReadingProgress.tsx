import { useEffect, useRef, useState } from 'react';
import { readingProgress } from '../lib/progress';

/**
 * How far the reader is through the article, as a rule across the top of the
 * window. It renders at zero on the server and on the first paint, so a reader
 * with no JavaScript gets a page that is missing a decoration and nothing else.
 *
 * The bar is `aria-hidden`: it repeats what the scrollbar already says, and a
 * live progress value announced on every scroll event is noise.
 */
export function ReadingProgress({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const measure = () => {
      frame.current = 0;
      const element = target.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      setProgress(
        readingProgress({
          top: box.top + window.scrollY,
          height: box.height,
          scrollY: window.scrollY,
          viewport: window.innerHeight,
        }),
      );
    };

    // Scroll events outrun paint; one measurement per frame is enough.
    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The body arrives in its own chunk, and diagrams and images settle after
    // that, so the article's height is not final when this first runs.
    const observer = new ResizeObserver(schedule);
    if (target.current) observer.observe(target.current);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
    };
  }, [target]);

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress__bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
