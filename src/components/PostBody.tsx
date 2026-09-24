import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routerPath, shouldRoute } from '../lib/internal-links';
import { postBody } from '../lib/post-content';
import { useResource } from '../lib/resource';
import { reprefix, uniqueIds } from '../lib/svg-ids';
// The build's own stripper, so a diagram drawn in the browser during
// development follows the page theme exactly as the built one does.
import { DIAGRAM_THEMES, withoutPinnedTheme } from '../../scripts/diagram-source.mjs';
import { DiagramViewer } from './DiagramViewer';
import { useTheme } from './ThemeProvider';

/**
 * Renders a post body. The HTML was produced by the build — math, highlighting,
 * citations and diagrams are already in it — so the browser only has to attach
 * the copy buttons and, in development, draw any diagram the build did not.
 */
export function PostBody({ slug }: { slug: string }) {
  const html = useResource(postBody(slug));
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // The diagram the viewer is showing, as markup. Null is closed.
  const [viewing, setViewing] = useState<string | null>(null);
  const viewed = useRef(0);

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

      /*
       * A diagram, opened full size. The whole figure answers a click, since
       * that is what a reader tries first; the button inside it is the one a
       * keyboard can reach, and the build writes it into the static HTML.
       *
       * A link inside a diagram is left alone — Mermaid can make nodes into
       * links, and following one is what a click on it is for.
       */
      const diagram = target.closest('.mermaid-figure');
      if (diagram && !target.closest('a') && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        const copy = diagram.cloneNode(true) as HTMLElement;
        copy.querySelector('.mermaid-figure__expand')?.remove();
        /*
         * Mermaid writes `width="100%"` and caps it with a `max-width`, which
         * is right in a text column and useless in a stage that sizes itself
         * to its contents. Taking those off and leaving `width: auto` is worse
         * still: an SVG with a viewBox and no size has no intrinsic size
         * either, so it falls back to the 300x150 every replaced element gets,
         * and a 1579px drawing renders 300px wide. The viewBox says how big it
         * is; this writes that down, and the transform scales it from there.
         */
        for (const svg of copy.querySelectorAll('svg')) {
          const drawn = svg.viewBox?.baseVal;
          if (!drawn?.width) continue;
          svg.style.width = `${drawn.width}px`;
          svg.style.height = `${drawn.height}px`;
          svg.style.maxWidth = 'none';
        }
        // The copy needs a namespace of its own, or it puts a second element
        // with every id into the document. `reprefix` rather than `uniqueIds`
        // because an SVG styles itself through a selector on its own root id:
        // rename that and leave the style block behind, and the copy loses
        // every fill Mermaid gave it. Counted per open, so two in one session
        // cannot collide either.
        viewed.current += 1;
        setViewing(reprefix(copy.innerHTML, `v${viewed.current}`));
        return;
      }

      /*
       * A YouTube still in the prose. The build draws it as a link to the
       * video on YouTube, which is what a reader without JavaScript gets;
       * here the click is answered with the player in place instead, which is
       * also the first moment anything is asked of Google.
       */
      const play = target.closest<HTMLAnchorElement>('.media-frame__play');
      if (play && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        const embed = play.dataset.embed;
        if (embed) {
          event.preventDefault();
          const frame = document.createElement('iframe');
          frame.src = embed;
          frame.title = play.dataset.title ?? 'YouTube video';
          frame.allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
          frame.allowFullscreen = true;
          play.replaceWith(frame);
          return;
        }
      }

      // A link to a section, or to Figure 2, is worth more on the clipboard
      // than in the address bar: it is what someone pastes into a mail or a
      // citation. The hash is still set, so the page behaves as the link says
      // it will, and a modified click (new tab, save) is left alone.
      const anchor = target.closest<HTMLAnchorElement>('.heading-anchor, .caption-anchor');
      if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        // Any other link in the prose: a plain anchor, because that is what
        // Markdown produces. Routed rather than followed, so a cross-reference
        // between posts does not reload the site.
        const link = target.closest('a');
        if (link && shouldRoute(link, event)) {
          event.preventDefault();
          void navigate(routerPath(link));
        }
        return;
      }

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
  }, [html, navigate]);

  /*
   * A block that scrolls sideways needs to be reachable by keyboard, or the
   * part of it past the edge can only be read with a mouse or a finger. A
   * code block on a phone is the usual case — the same listing fits the column
   * on a desktop and does not scroll at all, which is why this was invisible
   * until the accessibility audit was pointed at a narrow window.
   *
   * Only the ones that actually overflow, and only the ones with nothing
   * focusable inside them already, so a post full of listings does not become
   * a post full of tab stops. Re-measured on resize, because whether a block
   * overflows is a question about the window.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const candidates = [...container.querySelectorAll<HTMLElement>('*')].filter(
      (el) => /auto|scroll/.test(getComputedStyle(el).overflowX) && !el.querySelector(FOCUSABLE),
    );
    if (candidates.length === 0) return;

    const measure = () => {
      for (const el of candidates) {
        if (el.scrollWidth > el.clientWidth + 1) el.setAttribute('tabindex', '0');
        else el.removeAttribute('tabindex');
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      for (const el of candidates) el.removeAttribute('tabindex');
    };
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
        theme: theme === 'dark' ? DIAGRAM_THEMES.dark : DIAGRAM_THEMES.light,
        fontFamily: 'var(--sans)',
      });

      // Shared across the blocks, for the same reason the build shares one per
      // post: a render id keeps two diagrams apart, but not two copies of one.
      const seen = new Set<string>();

      for (const [index, block] of blocks.entries()) {
        const written = block.querySelector('script')?.textContent ?? '';
        const { source } = withoutPinnedTheme(written);
        try {
          const { svg } = await mermaid.render(`mermaid-live-${index}`, source);
          if (cancelled) return;
          block.innerHTML = `<figure class="mermaid-figure">${uniqueIds(svg, seen)}</figure>`;
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

  return (
    <>
      <div className="prose" ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      {viewing === null ? null : (
        <DiagramViewer markup={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
