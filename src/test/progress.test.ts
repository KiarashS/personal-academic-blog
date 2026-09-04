import { describe, expect, it } from 'vitest';
import { readingProgress } from '../lib/progress';

// An article 3000px tall starting 200px down, read in an 800px window.
const article = { top: 200, height: 3000, viewport: 800 };

describe('readingProgress', () => {
  it('is 0 before the article starts moving', () => {
    expect(readingProgress({ ...article, scrollY: 0 })).toBe(0);
    expect(readingProgress({ ...article, scrollY: 200 })).toBe(0);
  });

  it('reaches 1 when the last line is on screen, not a screen later', () => {
    expect(readingProgress({ ...article, scrollY: 200 + 3000 - 800 })).toBe(1);
  });

  it('runs linearly in between', () => {
    expect(readingProgress({ ...article, scrollY: 200 + 1100 })).toBeCloseTo(0.5, 5);
  });

  it('never leaves 0..1, however far the page is scrolled', () => {
    expect(readingProgress({ ...article, scrollY: 99999 })).toBe(1);
    expect(readingProgress({ ...article, scrollY: -400 })).toBe(0);
  });

  it('counts an article shorter than the window as read once it is on screen', () => {
    const short = { top: 200, height: 400, viewport: 800 };
    expect(readingProgress({ ...short, scrollY: 0 })).toBe(1);
  });

  it('reports nothing read when a short article is still below the fold', () => {
    const short = { top: 2000, height: 400, viewport: 800 };
    expect(readingProgress({ ...short, scrollY: 0 })).toBe(0);
  });
});
