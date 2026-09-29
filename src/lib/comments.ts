import { postPath } from './routes';
import { siteConfig } from '../site.config';
import type { CommentState, GiscusConfig } from '../site.config';

/*
 * Nothing here may import `lib/urls`, which reads `import.meta.env` when it is
 * loaded. The markdown plugin uses `commentWarnings`, and a plugin is imported
 * by `vite.config.ts` — which Vite loads in plain Node, where there is no
 * `import.meta.env` to read. `giscusTheme` needs a URL and lives in
 * `lib/giscus.ts` for that reason, next to the component that calls it.
 */

/**
 * Whether comments are set up at all. Clearing `repoId` is the site-wide off
 * switch and predates the per-post one; without it there is nothing to render
 * whatever a post asks for.
 */
export function commentsConfigured(giscus: GiscusConfig = siteConfig.giscus): boolean {
  return Boolean(giscus.repoId && giscus.categoryId);
}

/**
 * What a post's frontmatter asked for, or the site's default.
 *
 * `true` and `false` are the obvious spellings and the ones most posts will
 * use; `'on'`, `'off'` and `'readonly'` are the same three states written out,
 * so the post and the config can say it the same way. Anything else is a typo
 * and falls back to the default rather than guessing — `comments: no` in YAML
 * is the string "no", not a boolean, and silently reading that as off would
 * make the one adjacent typo, `comments: yes`, silently mean on.
 */
export function commentState(
  written: unknown,
  fallback: CommentState = siteConfig.giscus.comments,
): CommentState {
  if (written === true) return 'on';
  if (written === false) return 'off';
  if (written === 'on' || written === 'off' || written === 'readonly') return written;
  return fallback;
}

/** Whether the post shows a thread at all, in either state. */
export function commentsShown(state: CommentState): boolean {
  return state !== 'off';
}

/**
 * The name a post's thread goes by: its path without the leading slash,
 * `blog/writing-a-post`, which is also the discussion's title on GitHub.
 *
 * Fixed per post and handed to giscus as its `specific` term, not read off the
 * address bar. giscus's `pathname` mapping took whatever the location said,
 * and a post is reached both as `/blog/x` (a link inside the site) and as
 * `/blog/x/` (GitHub Pages redirects a directory to its slash): two terms, so
 * two threads for one post, each holding half its comments.
 */
export function commentTerm(slug: string): string {
  return postPath(slug).replace(/^\//, '');
}

/**
 * The body of the discussion that holds a post's thread, as giscus writes it
 * when the first comment creates one: the term as a heading, the description,
 * the page's address, then a comment carrying the SHA-1 of the term. That last
 * line is what giscus searches for in `strict` mode, so a discussion made by
 * `scripts/ensure-discussions.mjs` is found exactly as one giscus made is.
 */
export function discussionBody(term: string, description: string, url: string, sha1: string) {
  return `# ${term}\n\n${description}\n\n${url}\n\n<!-- sha1: ${sha1} -->`;
}

/**
 * What the build should say about a post's comment setting.
 *
 * A value nobody can read is the failure worth catching: it leaves the post on
 * the site's default, which is usually "on", so a post meant to have its
 * comments closed quietly keeps taking them.
 */
export function commentWarnings(slug: string, written: unknown): string[] {
  if (written === undefined || written === null) return [];
  if (typeof written === 'boolean') return [];
  if (written === 'on' || written === 'off' || written === 'readonly') return [];
  return [
    `${slug}: \`comments: ${JSON.stringify(written)}\` is not one of true, false or ` +
      `"readonly", so the post keeps the site default (${siteConfig.giscus.comments}).`,
  ];
}
