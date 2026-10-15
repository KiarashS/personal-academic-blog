import { describe, expect, it } from 'vitest';
import { dateProblems, isDay } from '../lib/post-builder';

const today = '2026-10-15';
const post = (frontmatter: string): string => `---\ntitle: A post\n${frontmatter}---\n\nBody.\n`;

describe('isDay', () => {
  it('takes a day that exists, written YYYY-MM-DD', () => {
    expect(isDay('2026-02-28')).toBe(true);
    expect(isDay('2024-02-29')).toBe(true);
  });

  it('refuses a day that does not exist, another shape, or not a string', () => {
    for (const value of ['2026-02-30', '2026-13-01', '2026-3-2', '02/03/2026', '', 20260302]) {
      expect(isDay(value)).toBe(false);
    }
  });
});

describe('dateProblems', () => {
  const path = 'src/content/posts/undated.md';

  it('is nothing for a post dated in its frontmatter, with or without a prefix', () => {
    expect(dateProblems(path, post('date: 2026-03-02\n'), today)).toEqual([]);
    expect(dateProblems('src/content/posts/2026-03-02-dated.md', post(''), today)).toEqual([]);
  });

  it('names the file and both ways to date it when neither gives a date', () => {
    expect(dateProblems(path, post(''), today)).toEqual([
      'src/content/posts/undated.md has no date. Add `date: 2026-10-15` to its frontmatter, ' +
        'or start the filename with the date: src/content/posts/2026-10-15-undated.md',
    ]);
  });

  it('refuses a date in the frontmatter the build cannot read', () => {
    expect(dateProblems(path, post('date: 2026-02-30\n'), today)).toEqual([
      'src/content/posts/undated.md: date "2026-02-30" is not a day written YYYY-MM-DD, such as 2026-10-15.',
    ]);
    // YAML reads an unbroken run of digits as a number.
    expect(dateProblems(path, post('date: 20260302\n'), today)[0]).toContain('date "20260302"');
  });

  it('refuses a filename prefix that is not a day', () => {
    expect(dateProblems('src/content/posts/2026-13-01-odd.md', post(''), today)[0]).toContain(
      'the date in the filename, 2026-13-01, is not a day that exists',
    );
  });

  it('checks updated and revision dates too, which the feed reads', () => {
    const problems = dateProblems(
      path,
      post('date: 2026-03-02\nupdated: soon\nrevisions:\n  - date: 2026-3-9\n    note: x\n'),
      today,
    );
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('updated "soon"');
    expect(problems[1]).toContain('the revision dated "2026-3-9"');
  });

  it('leaves a draft alone until it is published', () => {
    expect(dateProblems(path, post('draft: true\n'), today)).toEqual([]);
  });
});
