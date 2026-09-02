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
 * Always keeps the first, last and the pages either side of the current one.
 */
export function pageWindow(current: number, totalPages: number, radius = 1): (number | null)[] {
  const wanted = new Set<number>([1, totalPages]);
  for (let p = current - radius; p <= current + radius; p += 1) {
    if (p >= 1 && p <= totalPages) wanted.add(p);
  }

  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push(null);
    out.push(p);
    previous = p;
  }
  return out;
}
