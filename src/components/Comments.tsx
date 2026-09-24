import { useEffect, useRef } from 'react';
import { commentsConfigured } from '../lib/comments';
import { giscusTheme } from '../lib/giscus';
import { siteConfig } from '../site.config';
import { useTheme } from './ThemeProvider';
import type { CommentState } from '../site.config';

const GISCUS_ORIGIN = 'https://giscus.app';

/**
 * Comments run on giscus, which stores threads as GitHub Discussions on the
 * blog's own repository. Readers sign in with GitHub; nothing is stored here.
 *
 * `readonly` keeps the thread and takes the box away. giscus has no such mode,
 * and its frame is another origin, so the box is hidden by the stylesheet
 * giscus loads for itself — `data-theme` takes a URL as well as a built-in
 * name. That is presentation: the discussion on GitHub still accepts posts,
 * and locking it there is what closes it. The line above the thread says the
 * comments are closed whether or not the stylesheet arrives, which is the part
 * that has to be true.
 */
export function Comments({ state, term }: { state: CommentState; term: string }) {
  const { giscus } = siteConfig;
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const configured = commentsConfigured(giscus);
  const dressing = giscusTheme(state, theme === 'dark');

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
    script.setAttribute('data-theme', dressing);
    script.setAttribute('data-lang', giscus.lang);
    script.setAttribute('data-loading', 'lazy');
    container.appendChild(script);

    return () => container.replaceChildren();
  }, [configured, dressing, giscus, term]);

  // The iframe keeps its own theme, so tell it directly instead of reloading.
  useEffect(() => {
    const frame = containerRef.current?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: dressing } } },
      GISCUS_ORIGIN,
    );
  }, [dressing]);

  return (
    <section className="comments" id="comments">
      <h2>Comments</h2>
      {state === 'readonly' ? (
        <p className="comments__closed">
          Comments are closed on this post. The thread below is kept for reading.
        </p>
      ) : null}
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
