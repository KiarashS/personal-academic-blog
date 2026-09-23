/** An `id` attribute, and the whitespace that proves it is one — not `data-id`. */
const ID_ATTRIBUTE = /(\s)id="([^"]*)"/g;

/**
 * Makes every id in a rendered diagram unique within the page.
 *
 * Mermaid prefixes the ids in an SVG with the render id it was given, which
 * keeps two different diagrams apart, but it does not promise they are unique
 * inside one: its mindmap renderer puts the same `node_0` on the `g` and on
 * the `path` within it, so one mindmap ships two elements with one id and
 * `npm run links` fails the build. The same thing happens, for a different
 * reason, when a post uses one diagram twice — identical source means an
 * identical hash means an identical SVG.
 *
 * It lives here rather than in the plugin because both paths that put an SVG
 * on a page have to use it: the build, which injects the pair rendered by
 * `npm run diagrams`, and the browser, which draws any diagram the build did
 * not. Fixing only the first leaves the bug alive in development, which is
 * where a diagram is written.
 *
 * The first use of an id keeps it, so every `href="#…"` and `url(#…)` in the
 * SVG still resolves to what it resolved to before: under HTML's rules those
 * references already went to the first of a duplicated pair. Later uses are
 * numbered. A second copy of the same diagram therefore points at the first
 * copy's markers and gradients, which are the same drawing by definition.
 */
export function uniqueIds(svg: string, seen: Set<string>): string {
  return svg.replace(ID_ATTRIBUTE, (whole, space: string, id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      return whole;
    }
    let attempt = 2;
    while (seen.has(`${id}-${attempt}`)) attempt += 1;
    const unique = `${id}-${attempt}`;
    seen.add(unique);
    return `${space}id="${unique}"`;
  });
}

/** The root `id` of each `<svg>` in a fragment, in the order they appear. */
const SVG_ROOT = /<svg\b[^>]*?\sid="([^"]+)"/g;

/**
 * Give a copy of a rendered diagram a namespace of its own.
 *
 * `uniqueIds` is the wrong tool for a copy, and the failure is quiet: renaming
 * the root `id` leaves the `<style>` block inside the SVG selecting on the old
 * one, so the copy matches nothing, loses every fill and stroke Mermaid wrote
 * for it, and renders as black shapes on black text.
 *
 * Mermaid derives every id in an SVG from the render id it was given, so one
 * replacement fixes all of them at once: the root, the ids beneath it, the
 * `url(#…)` references between them, and the CSS selectors that style them.
 * The copy then depends on nothing outside itself, which is what a copy that
 * may outlive its original wants.
 */
export function reprefix(markup: string, token: string): string {
  const roots = [...markup.matchAll(SVG_ROOT)].map((match) => match[1]);
  let out = markup;
  for (const root of roots) {
    out = out.split(root).join(`${root}-${token}`);
  }
  return out;
}
