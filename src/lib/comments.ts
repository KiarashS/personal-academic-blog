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
