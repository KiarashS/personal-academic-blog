/**
 * Ids the page chrome owns, which a post's own headings may not take.
 *
 * A post page is the post's HTML dropped inside the app's HTML, and both put
 * ids on things. Where they pick the same one the document has it twice, and a
 * browser sent to `#revisions` stops at whichever comes first — the prose
 * heading, since the post body is above the blocks that follow it. That is the
 * wrong one: the update date in the byline links to `#revisions` meaning the
 * list of revisions the site renders, and `#comments` is the anchor the
 * comment widget lives at.
 *
 * So the chrome keeps these ids and a colliding heading is given a suffix. The
 * chrome's are linked to from the UI and from outside; a heading's exists only
 * because rehype-slug makes one for every heading, and a post that writes
 * `## Revisions` about how revisions work is not asking for the anchor.
 */
export const RESERVED_IDS = [
  'comments',
  'main',
  'news-heading',
  'revisions',
  'revisions-heading',
  'search-input',
  'series-heading',
  'share-heading',
  'shortcuts-title',
] as const;

export const isReservedId = (id: string): boolean =>
  (RESERVED_IDS as readonly string[]).includes(id);
