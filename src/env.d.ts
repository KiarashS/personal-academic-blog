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
