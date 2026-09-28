import { describe, expect, it } from 'vitest';
import { pageWindow, paginate } from '../lib/pagination';

const items = Array.from({ length: 23 }, (_, i) => i + 1);

describe('paginate', () => {
  it('slices the requested page', () => {
    expect(paginate(items, 2, 5).items).toEqual([6, 7, 8, 9, 10]);
  });

  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 5).page).toBe(5);
    expect(paginate(items, 0, 5).page).toBe(1);
    expect(paginate(items, Number.NaN, 5).page).toBe(1);
  });

  it('reports a single page for an empty list', () => {
    const page = paginate([], 1, 5);
    expect(page).toMatchObject({ items: [], page: 1, totalPages: 1, total: 0 });
  });
});

describe('pageWindow', () => {
  it('lists every page when they all fit', () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses the middle with ellipses', () => {
    expect(pageWindow(9, 20)).toEqual([1, null, 8, 9, 10, null, 20]);
  });

  it('never puts an ellipsis where a single page is missing', () => {
    // Page 4 of 10 used to be 1 … 3 4 5 … 10, with the "…" standing for page 2
    // alone and taking the room the 2 would have taken.
    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const row = pageWindow(page, total);
        row.forEach((entry, i) => {
          if (entry !== null) return;
          const before = row[i - 1] as number;
          const after = row[i + 1] as number;
          expect(
            after - before,
            `page ${page} of ${total}: ${JSON.stringify(row)}`,
          ).toBeGreaterThan(2);
        });
      }
    }
  });

  it('grows into the gap near either end instead', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
    expect(pageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
    expect(pageWindow(7, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
  });

  it('keeps the same number of slots on every page, so the arrows do not move', () => {
    for (let page = 1; page <= 40; page += 1) expect(pageWindow(page, 40)).toHaveLength(7);
  });

  it('always shows the first, last and current page', () => {
    for (let page = 1; page <= 25; page += 1) {
      const row = pageWindow(page, 25);
      expect(row).toContain(1);
      expect(row).toContain(25);
      expect(row).toContain(page);
    }
  });

  it('widens with more siblings', () => {
    expect(pageWindow(10, 20, 2)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
  });
});
