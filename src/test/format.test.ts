import { describe, expect, it } from 'vitest';
import { dateParts, formatDate, isoDate } from '../lib/format';

describe('formatDate', () => {
  it('writes the long form out', () => {
    expect(formatDate('2026-09-08')).toBe('8 September 2026');
  });

  it('keeps every short month to three letters', () => {
    // en-GB abbreviates only September to four, which in a column of dates
    // carries that row's year a character past the eleven around it.
    const months = Array.from({ length: 12 }, (_, i) =>
      formatDate(`2026-${String(i + 1).padStart(2, '0')}-01`, 'short'),
    );
    expect(months.map((month) => month.split(' ')[1])).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
  });

  it('reads a date in UTC, so it does not slide a day west of Greenwich', () => {
    expect(formatDate('2026-01-01', 'short')).toBe('1 Jan 2026');
    expect(isoDate('2026-01-01')).toBe('2026-01-01');
  });

  it('hands back anything it cannot read, rather than a broken date', () => {
    expect(formatDate('not a date')).toBe('not a date');
    expect(dateParts('not a date')).toBeNull();
  });
});

describe('dateParts', () => {
  it('splits the short form into the pieces the news column sets', () => {
    expect(dateParts('2026-09-08')).toEqual({ day: '8', month: 'Sep', year: '2026' });
  });

  it('joins back to exactly what formatDate writes', () => {
    for (const value of ['2026-11-20', '2026-09-08', '2026-07-02', '2026-05-15']) {
      const parts = dateParts(value);
      expect(`${parts?.day} ${parts?.month} ${parts?.year}`).toBe(formatDate(value, 'short'));
    }
  });

  it('leaves the day unpadded, since the column ranges it right', () => {
    expect(dateParts('2026-07-02')?.day).toBe('2');
  });
});
