export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, totalPages, total };
}

/**
 * Page numbers to show, with `null` standing in for an ellipsis.
 *
 * Always the first and last page and `siblings` either side of the current one,
 * and always the same number of slots once there are more pages than fit —
 * seven, at the default of one sibling. Two things follow from that.
 *
 * An ellipsis never stands in for a single page. It is as wide as a number, so
 * `1 … 3 4 5` hides page 2 behind a mark that takes the room the 2 would have:
 * near either end the window grows into that gap instead, `1 2 3 4 5 … 10`.
 *
 * And the row keeps its width from page to page. When it grew and shrank, the
 * arrows at either end moved as the reader paged through, so the next click on
 * "Older" landed somewhere other than where the last one had.
 */
export function pageWindow(current: number, totalPages: number, siblings = 1): (number | null)[] {
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

  // First, last, the current page, its siblings, and a slot either side for an
  // ellipsis or the page it would have hidden.
  const slots = 2 * siblings + 5;
  if (totalPages <= slots) return range(1, totalPages);

  const page = Math.min(Math.max(1, current), totalPages);
  // How many pages sit at an end when the window is pushed against it: the
  // end itself, the gap slot filled with a number, and the window.
  const edge = slots - 2;

  if (page <= siblings + 3) return [...range(1, edge), null, totalPages];
  if (page >= totalPages - siblings - 2)
    return [1, null, ...range(totalPages - edge + 1, totalPages)];
  return [1, null, ...range(page - siblings, page + siblings), null, totalPages];
}
