import { useEffect, useRef } from 'react';
import { siteConfig } from '../site.config';
import { useTheme } from './ThemeProvider';

const GISCUS_ORIGIN = 'https://giscus.app';

/**
 * Comments run on giscus, which stores threads as GitHub Discussions on the
 * blog's own repository. Readers sign in with GitHub; nothing is stored here.
 */
export function Comments({ term }: { term: string }) {
  const { giscus } = siteConfig;
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const configured = Boolean(giscus.repoId && giscus.categoryId);

  useEffect(() => {
    const container = containerRef.current;
    if (!configured || !container) return;

    container.replaceChildren();
    const script = document.createElement('script');
    script.src = `${GISCUS_ORIGIN}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', giscus.repo);
    script.setAttribute('data-repo-id', giscus.repoId);
    script.setAttribute('data-category', giscus.category);
    script.setAttribute('data-category-id', giscus.categoryId);
    script.setAttribute('data-mapping', giscus.mapping);
    script.setAttribute('data-term', term);
    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', giscus.reactionsEnabled ? '1' : '0');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', theme === 'dark' ? 'dark_dimmed' : 'light');
    script.setAttribute('data-lang', giscus.lang);
    script.setAttribute('data-loading', 'lazy');
    container.appendChild(script);

    return () => container.replaceChildren();
  }, [configured, giscus, term, theme]);

  // The iframe keeps its own theme, so tell it directly instead of reloading.
  useEffect(() => {
    const frame = containerRef.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: theme === 'dark' ? 'dark_dimmed' : 'light' } } },
      GISCUS_ORIGIN,
    );
  }, [theme]);

  return (
    <section className="comments" id="comments">
      <h2>Comments</h2>
      {configured ? (
        <div ref={containerRef} />
      ) : (
        <p className="notice">
          Comments are switched off until giscus is configured. Enable Discussions on the
          repository, run <a href="https://giscus.app">giscus.app</a>, and paste the
          <code> repoId</code> and <code> categoryId</code> into <code>src/site.config.ts</code>.
        </p>
      )}
    </section>
  );
}
