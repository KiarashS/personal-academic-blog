import { renderToString } from 'react-dom/server';
import { fromHtml } from 'hast-util-from-html';
import { childrenOf, Figure, FIGURE_CSS, figureData, figureIds } from './figure';

const FIGURE = /<mdxcn-figure\b([^>]*)>([\s\S]*?)<\/mdxcn-figure>/g;

// An attribute value as rehype-stringify writes it: the few named entities,
// and characters as `&#x22;` or `&#34;`.
const unescape = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const attribute = (attrs: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(attrs);
  return match ? unescape(match[1]) : null;
};

/**
 * A rendered page with each `<mdxcn-figure>` drawn into a declarative shadow
 * root: a `<template shadowrootmode="open">` the HTML parser turns into the
 * element's shadow root as it reads the page, before any script. The light
 * DOM the build wrote stays where it is, for `./client.tsx` to read the
 * children from, and the shadow root hides it.
 *
 * Run by the prerenderer on the finished HTML, not during React's render, so
 * the page React hydrates is the one it rendered; the figures are mounted
 * separately, each a root of its own.
 */
export function fillFigures(html: string): string {
  if (!html.includes('<mdxcn-figure')) return html;
  return html.replace(FIGURE, (whole, attrs: string, inner: string) => {
    const data = figureData(attribute(attrs, 'data-component'), attribute(attrs, 'data-props'));
    if (!data) return whole;
    const children = childrenOf(fromHtml(inner, { fragment: true }));
    const markup = renderToString(
      <Figure data={data} still>
        {children}
      </Figure>,
      { identifierPrefix: figureIds(attribute(attrs, 'data-figure')) },
    );
    return (
      `<mdxcn-figure${attrs}><template shadowrootmode="open">` +
      `<link rel="stylesheet" href="${FIGURE_CSS}"><div class="mdxcn-root">${markup}</div>` +
      `</template>${inner}</mdxcn-figure>`
    );
  });
}
