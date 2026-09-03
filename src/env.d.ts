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
