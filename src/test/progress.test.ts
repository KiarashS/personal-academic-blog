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
  const header = 100;

  it('stays away while the header is still on screen', () => {
    expect(exitShown(false, header, 0)).toBe(false);
    expect(exitShown(false, header, 80)).toBe(false);
  });

  it('arrives once the header has gone, not at the end of the post', () => {
    expect(exitShown(false, header, 125)).toBe(true);
  });

  it('does not blink for a reader parked on the boundary', () => {
    // Hidden, it waits until well past the edge; shown, it waits until well
    // before it. The gap between the two is what stops a small scroll at 100
    // flipping it on and off, and it animates as it arrives.
    expect(exitShown(false, header, 110)).toBe(false);
    expect(exitShown(true, header, 110)).toBe(true);
    expect(exitShown(true, header, 90)).toBe(true);
    expect(exitShown(true, header, 70)).toBe(false);
  });

  it('follows a header that wrapped onto a second line', () => {
    expect(exitShown(false, 100, 130)).toBe(true);
    expect(exitShown(false, 180, 130)).toBe(false);
  });
});
