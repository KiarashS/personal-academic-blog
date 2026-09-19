/// <reference types="vite/client" />

declare module '*.md' {
  /** Rendered by the build-time Markdown plugin. */
  export const html: string;
}

declare module '*.bib' {
  /** Parsed by the build-time bibliography plugin. */
  const entries: import('./lib/bib-parse').BibEntry[];
  export default entries;
}

declare module '*.svg?raw' {
  /** The file's markup, for inlining where a themeable SVG is wanted. */
  const source: string;
  export default source;
}

declare module 'virtual:emoji-map' {
  /**
   * The emoji shortcodes `src/content/news.ts` uses, built by
   * `plugins/emoji-content.ts`. Only the ones that file names, so the browser
   * is never sent the 1,913 gemoji knows to render the four you wrote.
   */
  export const EMOJI: Record<string, string>;
}
