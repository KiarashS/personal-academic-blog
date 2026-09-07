import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { routerPath, shouldRoute } from '../lib/internal-links';

interface RoutedHtmlProps {
  html: string;
  className?: string;
}

/**
 * Markdown compiled at build time, with its internal links routed.
 *
 * The HTML carries plain `<a href="/blog">` anchors, because that is what
 * Markdown produces and what a crawler and a reader with no JavaScript need.
 * Left alone they reload the whole site. One listener on the container turns
 * them into client-side navigations and leaves every other kind of click to the
 * browser.
 */
export function RoutedHtml({ html, className }: RoutedHtmlProps) {
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || !shouldRoute(anchor, event)) return;
      event.preventDefault();
      void navigate(routerPath(anchor));
    };

    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [html, navigate]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} ref={container} />;
}
