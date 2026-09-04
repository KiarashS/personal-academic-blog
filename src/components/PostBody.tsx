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

    const flash = (element: HTMLElement) => {
      element.dataset.copied = 'true';
      window.setTimeout(() => delete element.dataset.copied, 1500);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const button = target.closest('.code-block__copy');
      if (button) {
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
        return;
      }

      // A section link is worth more on the clipboard than in the address bar:
      // it is what someone pastes into a mail or a citation. The hash is still
      // set, so the page behaves as the link says it will, and a modified click
      // (new tab, save) is left alone.
      const anchor = target.closest<HTMLAnchorElement>('.heading-anchor');
      if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const id = anchor.getAttribute('href')?.slice(1) ?? '';
      if (!id) return;

      event.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      history.replaceState(null, '', `#${id}`);
      document.getElementById(id)?.scrollIntoView();

      navigator.clipboard?.writeText(url).then(
        () => flash(anchor),
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
