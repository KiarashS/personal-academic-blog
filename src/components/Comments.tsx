import Giscus from '@giscus/react';
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
export function Comments({ state, term }: { state: CommentState; term: string }) {
  const { giscus } = siteConfig;
  const { theme } = useTheme();
  const configured = commentsConfigured(giscus);

  return (
    <section className="comments" id="comments">
      <h2>Comments</h2>
      {state === 'readonly' ? (
        <p className="comments__closed">
          Comments are closed on this post. The thread below is kept for reading.
        </p>
      ) : null}
      {configured ? (
        <Giscus
          // A post of its own gets a frame of its own, rather than the last
          // post's frame told a new term.
          key={term}
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
          loading="lazy"
        />
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
