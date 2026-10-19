import { useEffect, type RefObject } from 'react';

/**
 * Brings the mdxcn figures in rendered Markdown to life (`src/mdxcn`).
 *
 * The components, motion, and the figure stylesheet are a chunk of their
 * own, fetched only when the HTML has a figure in it, so a page without one
 * loads none of it. Effects run after hydration, so a figure drawn by the
 * prerenderer is already on screen, finished, while the chunk arrives.
 */
export function useMdxcnFigures(ref: RefObject<HTMLElement | null>, html: string): void {
  useEffect(() => {
    const container = ref.current;
    if (!container || !html.includes('<mdxcn-figure')) return;
    let cancelled = false;
    let unmount: (() => void) | undefined;
    void import('../mdxcn/client').then(({ mountFigures }) => {
      if (!cancelled) unmount = mountFigures(container);
    });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [ref, html]);
}
