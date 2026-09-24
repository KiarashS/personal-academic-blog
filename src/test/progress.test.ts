import { describe, expect, it } from 'vitest';
import { exitShown, readingProgress } from '../lib/progress';

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

describe('exitShown', () => {
  const at = (scrollY: number, previous = scrollY, atBottom = false) => ({
    headerBottom: 100,
    scrollY,
    previous,
    atBottom,
  });

  it('stays away while the header is still on screen', () => {
    expect(exitShown(false, at(0))).toBe(false);
    expect(exitShown(false, at(80))).toBe(false);
  });

  it('does not blink for a reader parked on the header boundary', () => {
    expect(exitShown(false, at(110))).toBe(false);
    expect(exitShown(true, at(110))).toBe(true);
    expect(exitShown(true, at(90))).toBe(true);
    expect(exitShown(true, at(70))).toBe(false);
  });

  it('goes away while the reader is going down the page', () => {
    // A fixed control over a column that fills the window covers words, and on
    // a phone the column is the whole width.
    expect(exitShown(true, at(1200, 1100))).toBe(false);
  });

  it('comes back the moment they scroll up', () => {
    expect(exitShown(false, at(1100, 1200))).toBe(true);
  });

  it('ignores a jitter too small to be a change of mind', () => {
    expect(exitShown(true, at(1204, 1200))).toBe(true);
    expect(exitShown(false, at(1196, 1200))).toBe(false);
  });

  it('is there at the bottom however the reader arrived', () => {
    expect(exitShown(false, at(5000, 4000, true))).toBe(true);
  });

  it('is never there at the bottom of a page too short to leave the header', () => {
    expect(exitShown(false, at(20, 0, true))).toBe(false);
  });

  it('follows a header that wrapped onto a second line', () => {
    expect(
      exitShown(false, { headerBottom: 100, scrollY: 130, previous: 200, atBottom: false }),
    ).toBe(true);
    expect(
      exitShown(false, { headerBottom: 180, scrollY: 130, previous: 200, atBottom: false }),
    ).toBe(false);
  });
});
