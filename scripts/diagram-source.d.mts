/** Types for the one piece of `scripts/` the test suite covers. */

/** The themes mermaid actually has. A look (`neo`, `handDrawn`) is not one. */
export type MermaidTheme = 'base' | 'dark' | 'default' | 'forest' | 'neutral';

export declare const DIAGRAM_THEMES: { light: MermaidTheme; dark: MermaidTheme };
export declare const MERMAID_THEMES: MermaidTheme[];
export declare function withoutPinnedTheme(source: string): { source: string; theme?: string };
