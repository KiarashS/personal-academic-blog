import { describe, expect, it } from 'vitest';
import { frontPageNews, newsWarning, sortNews } from '../lib/news';
import { siteConfig } from '../site.config';
import type { NewsItem } from '../lib/types';

const items: NewsItem[] = [
  { date: '2026-01-14', text: 'Preprint out' },
  { date: '2026-03-12', text: 'Paper accepted', href: 'https://doi.org/10.0000/example' },
  { date: '2026-02-02', text: 'Talk given' },
  { date: '2025-11-30', text: 'Moved lab' },
];

const options = (over: Partial<Parameters<typeof frontPageNews>[1]> = {}) => ({
  limit: 3,
  freshMonths: 12,
  today: '2026-03-20',
  ...over,
});

describe('sortNews', () => {
  it('puts the newest first', () => {
    expect(sortNews(items).map((item) => item.date)).toEqual([
      '2026-03-12',
      '2026-02-02',
      '2026-01-14',
      '2025-11-30',
    ]);
  });

  it('leaves the caller’s array alone', () => {
    const original = [...items];
    sortNews(items);
    expect(items).toEqual(original);
  });

  it('sorts an entry dated ahead to the top, where an announcement belongs', () => {
    const ahead = [...items, { date: '2026-10-01', text: 'Talk at a thing in October' }];
    expect(sortNews(ahead)[0].text).toBe('Talk at a thing in October');
  });
});

describe('frontPageNews', () => {
  it('takes the newest few and says there are more', () => {
    const { items: shown, more } = frontPageNews(items, options());
    expect(shown.map((item) => item.text)).toEqual([
      'Paper accepted',
      'Talk given',
      'Preprint out',
    ]);
    expect(more).toBe(true);
  });

  it('reports no more when the list fits', () => {
    expect(frontPageNews(items, options({ limit: 4 })).more).toBe(false);
  });

  it('renders nothing when the count is zero', () => {
    expect(frontPageNews(items, options({ limit: 0 }))).toEqual({ items: [], more: false });
  });

  it('renders nothing when there are no entries', () => {
    expect(frontPageNews([], options())).toEqual({ items: [], more: false });
  });

  it('hides the block once the newest entry is outside the window', () => {
    // Fifteen months after the last entry, with a twelve-month window.
    const quiet = frontPageNews(items, options({ today: '2027-06-01' }));
    expect(quiet.items).toEqual([]);
  });

  it('keeps the block while the newest entry is inside the window', () => {
    expect(frontPageNews(items, options({ today: '2027-03-01' })).items).toHaveLength(3);
  });

  it('counts the window in months, not days', () => {
    // 2026-03-12 plus six months is 2026-09-12: still in on the day, out after.
    expect(
      frontPageNews(items, options({ freshMonths: 6, today: '2026-09-12' })).items,
    ).toHaveLength(3);
    expect(frontPageNews(items, options({ freshMonths: 6, today: '2026-09-13' })).items).toEqual(
      [],
    );
  });

  it('never hides the block when the window is zero', () => {
    const forever = options({ freshMonths: 0, today: '2099-01-01' });
    expect(frontPageNews(items, forever).items).toHaveLength(3);
  });
});

describe('newsWarning', () => {
  it('says nothing while the list is current', () => {
    expect(newsWarning(items, options())).toBeUndefined();
  });

  it('names the newest entry and the window once the list goes quiet', () => {
    const message = newsWarning(items, options({ today: '2027-06-01' }));
    expect(message).toContain('2026-03-12');
    expect(message).toContain('12 months');
  });

  it('says nothing about a list nobody asked the front page to show', () => {
    expect(newsWarning(items, options({ limit: 0, today: '2027-06-01' }))).toBeUndefined();
    expect(newsWarning([], options({ today: '2027-06-01' }))).toBeUndefined();
    expect(newsWarning(items, options({ freshMonths: 0, today: '2099-01-01' }))).toBeUndefined();
  });
});

describe('siteConfig.home', () => {
  it('asks for a count and a window the front page can act on', () => {
    expect(Number.isInteger(siteConfig.home.news)).toBe(true);
    expect(siteConfig.home.news).toBeGreaterThanOrEqual(0);
    expect(siteConfig.home.newsFreshMonths).toBeGreaterThanOrEqual(0);
  });
});
