import type { ComponentType } from 'react';

/**
 * Route components the server already has in hand.
 *
 * Every page is `lazy` in `App.tsx`, which is right for a reader — KaTeX,
 * highlight.js and the search index should not be in the first request — and
 * wrong for the prerenderer, which has no network and nothing to defer. Worse
 * than wrong: a boundary that suspends has its fallback written into the shell,
 * and React appends the real markup afterwards in a hidden block with a script
 * to swap the two over, so the page is only complete for a reader running
 * JavaScript. With scripts off, every route rendered as the word "Loading…".
 *
 * So `entry-server.tsx` imports the pages for real and puts them here before it
 * renders anything. `App` asks for the eager one and falls back to the lazy one,
 * which on the server means nothing suspends and the markup goes straight into
 * the shell.
 *
 * The browser registers one page: the one the prerendered document holds,
 * which `main.tsx` loads before hydrating (`data-page` on the root, which the
 * prerenderer writes from `renderedPage`). Hydrating with the page still on
 * its way left its boundary waiting, and the first update to reach it in that
 * time, the reader's dark theme or today's date replacing the build's, made
 * React throw the prerendered page away and draw it again. Every other page
 * keeps its split chunk.
 *
 * This module deliberately imports no pages of its own. It is the one thing
 * both sides share, and an import here would pull every route into the reader's
 * first request, which is the arrangement it exists to avoid.
 */
const eager = new Map<string, ComponentType>();

export function registerPage(name: string, component: ComponentType): void {
  eager.set(name, component);
}

export function getPage(name: string): ComponentType | undefined {
  return eager.get(name);
}

let rendered: string | undefined;

/** Called by `Lazily` as it draws a page it has eagerly. */
export function notePage(name: string): void {
  rendered = name;
}

/** The page the last render drew, for the prerenderer; then forgotten. */
export function renderedPage(): string | undefined {
  const name = rendered;
  rendered = undefined;
  return name;
}
