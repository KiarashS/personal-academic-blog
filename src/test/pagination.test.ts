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
  it('lists every page when there are few', () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('collapses the middle with ellipses', () => {
    expect(pageWindow(9, 20)).toEqual([1, null, 8, 9, 10, null, 20]);
  });

  it('does not put an ellipsis where a single page is missing', () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
