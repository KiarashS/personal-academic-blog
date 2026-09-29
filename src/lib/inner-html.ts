import { useMemo } from 'react';

/**
 * The object for `dangerouslySetInnerHTML`, kept the same until the HTML is.
 *
 * React compares that prop by identity, and a fresh `{ __html }` on every
 * render counts as a change even when the string inside it is not: it writes
 * `innerHTML` again, and every element inside is thrown away and built anew.
 * `PostBody` reads the theme, so switching it with the toggle did that to the
 * whole post: measured on the build, all 107 of the prose's children were
 * replaced, every image in it discarded and started again. Opening a diagram
 * in the viewer re-rendered it the same way, and `DiagramViewer` did it to the
 * drawing on every step of a pan or a zoom. It also undid anything the page
 * had done to the prose since, like the `tabindex` on a code block that
 * scrolls.
 *
 * A module-level constant needs no hook: an object made once outside the
 * component is already the same object on every render.
 */
export function useInnerHtml(html: string): { __html: string } {
  return useMemo(() => ({ __html: html }), [html]);
}
