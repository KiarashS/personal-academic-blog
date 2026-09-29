import Giscus from '@giscus/react';
import { useEffect, useRef, useState } from 'react';
import { commentsConfigured } from '../lib/comments';
import { giscusTheme } from '../lib/giscus';
import { siteConfig } from '../site.config';
import { useTheme } from './ThemeProvider';
import type { CommentState } from '../site.config';

/**
 * Comments run on giscus, which stores threads as GitHub Discussions on the
 * blog's own repository. Readers sign in with GitHub; nothing is stored here.
 *
 * Through `@giscus/react`, giscus's own component for pages that render on the
 * client, rather than by inserting its `client.js`. That script builds the
 * frame and a message listener each time it runs and never takes either down,
 * and this component used to run it again on every change of theme, which
 * happens once on every load for a reader in dark mode, as the theme settles
 * after hydration. A copy that finished loading after it had been removed
 * found the live container and put its own frame there. The component keeps
 * one frame for as long as it is mounted, sends a change of theme to the
 * loaded frame instead of rebuilding it, and removes its listener when the
 * post is left. It renders nothing until it has loaded, on the server and on
 * the first pass in the browser alike, so hydration is untouched.
 *
 * `readonly` keeps the thread and takes the box away. giscus has no such mode,
 * and its frame is another origin, so the box is hidden by the stylesheet
 * giscus loads for itself — `theme` takes a URL as well as a built-in name.
 * That is presentation: what closes the discussion on GitHub is the lock the
 * deploy puts on it (scripts/ensure-discussions.mjs). The line above the
 * thread says the comments are closed whether or not the stylesheet arrives,
 * which is the part that has to be true.
 */
/**
 * The thread itself, created once the section is close to the screen.
 *
 * giscus's own lazy loading is the frame's `loading="lazy"`, and that left
 * the frame to the browser: created at the top of the post, far off screen,
 * and loaded only if the browser noticed it come near. In Safari it could
 * stay empty on a first visit and appear after a reload, which restores the
 * scroll position and so creates the frame already in view. Here the page does
 * the noticing, and the frame it creates loads at once. Nothing is fetched
 * from giscus any earlier than before, and the component's own code now waits
 * for the same moment.
 *
 * Keyed by term where it is used, so moving to another post starts over
 * rather than creating that post's frame at the top of the page.
 */
function Thread({ state, term }: { state: CommentState; term: string }) {
  const { giscus } = siteConfig;
  const { theme } = useTheme();
  const anchor = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = anchor.current;
    if (near || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        observer.disconnect();
      },
      // Most of a screen ahead, so a reader scrolling down arrives at a
      // thread that has already started loading.
      { rootMargin: '600px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={anchor}>
      {near ? (
        <Giscus
          repo={giscus.repo}
          repoId={giscus.repoId}
          category={giscus.category}
          categoryId={giscus.categoryId}
          // `specific` and a term fixed per post (`commentTerm`), never the
          // address bar: the same post is reached with and without a slash.
          mapping="specific"
          term={term}
          strict="1"
          reactionsEnabled={giscus.reactionsEnabled ? '1' : '0'}
          emitMetadata="0"
          inputPosition="top"
          theme={giscusTheme(state, theme === 'dark')}
          lang={giscus.lang}
          loading="eager"
        />
      ) : null}
    </div>
  );
}

export function Comments({ state, term }: { state: CommentState; term: string }) {
  const configured = commentsConfigured(siteConfig.giscus);

  return (
    <section className="comments" id="comments">
      <h2>Comments</h2>
      {state === 'readonly' ? (
        <p className="comments__closed">
          Comments are closed on this post. The thread below is kept for reading.
        </p>
      ) : null}
      {configured ? (
        <Thread key={term} state={state} term={term} />
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
