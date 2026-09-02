/// <reference types="vite/client" />

declare module '*.md' {
  /** Rendered by the build-time Markdown plugin. */
  export const html: string;
}
