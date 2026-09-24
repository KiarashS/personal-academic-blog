/** Types for the one piece of `scripts/` the test suite covers. */

/**
 * The themes mermaid has, mirroring the `theme` union in its own
 * `config.type.d.ts`. A look (`handDrawn`, `classic`) is not one of these;
 * `neo` is both a theme and a look.
 */
export type MermaidTheme =
  | 'base'
  | 'dark'
  | 'default'
  | 'forest'
  | 'neutral'
  | 'neo'
  | 'neo-dark'
  | 'redux'
  | 'redux-dark'
  | 'redux-color'
  | 'redux-dark-color';

export declare const DIAGRAM_THEMES: { light: MermaidTheme; dark: MermaidTheme };
export declare const MERMAID_THEMES: MermaidTheme[];
export declare const DIAGRAM_FONT: string;
export declare const DIAGRAM_FONT_FILE: string;
export declare function withoutPinnedTheme(source: string): { source: string; theme?: string };
