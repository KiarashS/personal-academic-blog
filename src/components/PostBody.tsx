import { use, useEffect, useRef } from 'react';
import { loadPostHtml } from '../lib/post-content';
import { useTheme } from './ThemeProvider';

const pending = new Map<string, Promise<string>>();

function htmlFor(slug: string): Promise<string> {
  const hit = pending.get(slug);
  if (hit) return hit;
  const promise = loadPostHtml(slug);
  pending.set(slug, promise);
  return promise;
}

/**
 * Renders a post body. The HTML was produced by the build — math, highlighting,
 * citations and diagrams are already in it — so the browser only has to attach
 * the copy buttons and, in development, draw any diagram the build did not.
 */
export function PostBody({ slug }: { slug: string }) {
  const html = use(htmlFor(slug));
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('.code-block__copy');
      if (!button) return;
      const code = button.closest('.code-block')?.querySelector('pre')?.textContent ?? '';
      navigator.clipboard?.writeText(code).then(
        () => {
          button.firstChild!.textContent = 'copied';
          window.setTimeout(() => {
            button.firstChild!.textContent = 'copy';
          }, 1500);
        },
        () => undefined,
      );
    };

    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [html]);

  // Only reached in development, or if `npm run diagrams` was not run: the
  // build normally inlines both light and dark SVG for every diagram.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const blocks = container.querySelectorAll<HTMLElement>('.mermaid-pending');
    if (blocks.length === 0) return;

    let cancelled = false;
    void (async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: theme === 'dark' ? 'dark' : 'neutral',
        fontFamily: 'var(--sans)',
      });

      for (const [index, block] of blocks.entries()) {
        const source = block.querySelector('script')?.textContent ?? '';
        try {
          const { svg } = await mermaid.render(`mermaid-live-${index}`, source);
          if (cancelled) return;
          block.innerHTML = `<figure class="mermaid-figure">${svg}</figure>`;
        } catch (cause) {
          if (cancelled) return;
          const message = cause instanceof Error ? cause.message : String(cause);
          block.innerHTML = `<div class="mermaid-error"><strong>Diagram could not be rendered.</strong><pre></pre><pre></pre></div>`;
          const [errorNode, sourceNode] = block.querySelectorAll('pre');
          errorNode.textContent = message;
          sourceNode.textContent = source;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html, theme]);

  return <div className="prose" ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
}
