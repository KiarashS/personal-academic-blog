import { describe, expect, it } from 'vitest';
import { currentHeading, inlineKeptWhenWide, railShown } from '../lib/contents';
import { siteConfig } from '../site.config';
import type { ContentsConfig } from '../site.config';

const contents = (wide: ContentsConfig['wide']): ContentsConfig => ({ wide, side: 'left' });

describe('which contents a wide screen shows', () => {
  it('gives the collapsed list alone, the rail alone, or both', () => {
    expect([railShown(contents('inline')), inlineKeptWhenWide(contents('inline'))]).toEqual([
      false,
      true,
    ]);
    expect([railShown(contents('rail')), inlineKeptWhenWide(contents('rail'))]).toEqual([
      true,
      false,
    ]);
    expect([railShown(contents('both')), inlineKeptWhenWide(contents('both'))]).toEqual([
      true,
      true,
    ]);
  });

  it('never takes the collapsed list away entirely, whatever is configured', () => {
    // It is what a narrow window shows and what a reader with no JavaScript
    // gets, so only CSS above 80rem may hide it.
    for (const wide of ['inline', 'rail', 'both'] as const) {
      expect(railShown(contents(wide)) || inlineKeptWhenWide(contents(wide))).toBe(true);
    }
  });

  it('stands the rail in the margin the config names', () => {
    expect(['left', 'right']).toContain(siteConfig.contents.side);
  });
});

const page = { viewport: 800, documentHeight: 6000 };
const headings = [
  { id: 'one', top: 700 },
  { id: 'two', top: 2000 },
  { id: 'three', top: 3400 },
];

describe('currentHeading', () => {
  it('marks nothing while the reader is still in the opening prose', () => {
    expect(currentHeading(headings, { ...page, scrollY: 0 })).toBeUndefined();
    expect(currentHeading(headings, { ...page, scrollY: 500 })).toBeUndefined();
  });

  it('marks a heading as it reaches the marker, not as it leaves', () => {
    // The first heading sits 700px down and the marker is 96px below the top
    // of the window, so it lights at 604 and not a pixel before.
    expect(currentHeading(headings, { ...page, scrollY: 603 })).toBeUndefined();
    expect(currentHeading(headings, { ...page, scrollY: 604 })).toBe('one');
  });

  it('follows the reader down the page', () => {
    expect(currentHeading(headings, { ...page, scrollY: 1500 })).toBe('one');
    expect(currentHeading(headings, { ...page, scrollY: 1904 })).toBe('two');
    expect(currentHeading(headings, { ...page, scrollY: 3304 })).toBe('three');
  });

  it('marks the last heading at the bottom, which it could never reach', () => {
    // A heading 200px from the end of a 6000px document can never travel to
    // 96px from the top of an 800px window: the page runs out first.
    const near = [
      { id: 'one', top: 700 },
      { id: 'last', top: 5800 },
    ];
    expect(currentHeading(near, { ...page, scrollY: 5200 })).toBe('last');
    // Halfway down it is still the first heading: nothing has been faked.
    expect(currentHeading(near, { ...page, scrollY: 4000 })).toBe('one');
  });

  it('allows a pixel of slack, since fractional zoom rarely lands exactly', () => {
    expect(currentHeading(headings, { ...page, scrollY: 5199.4 })).toBe('three');
  });

  it('has nothing to say about a post with no headings', () => {
    expect(currentHeading([], { ...page, scrollY: 0 })).toBeUndefined();
  });
});
