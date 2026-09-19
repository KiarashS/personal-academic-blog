import { describe, expect, it } from 'vitest';
import { expired, noticeFor, noticeWarnings, surfaceOf } from '../lib/notice';
import { blogIndexPath, postPath } from '../lib/routes';
import { siteConfig } from '../site.config';
import type { NoticeConfig } from '../site.config';

const notice = (overrides: Partial<NoticeConfig> = {}): NoticeConfig => ({
  text: ':mortar_board: Recruiting PhD students. [How to apply](/about)',
  kind: 'important',
  on: ['home'],
  until: '',
  ...overrides,
});

describe('surfaceOf', () => {
  it('knows the three surfaces wherever the routes currently are', () => {
    expect(surfaceOf(blogIndexPath())).toBe('blog');
    expect(surfaceOf(postPath('writing-a-post'))).toBe('post');
    expect(surfaceOf('/')).toBe(siteConfig.features.home ? 'home' : 'blog');
  });

  it('answers the same with or without a trailing slash', () => {
    expect(surfaceOf(`${postPath('writing-a-post')}/`)).toBe('post');
  });

  it('is nothing on a page the notice does not cover', () => {
    for (const path of ['/tags', '/archive', '/search', '/authors/you', '/news']) {
      expect(surfaceOf(path), path).toBeUndefined();
    }
  });
});

describe('expired', () => {
  it('retires the notice on the day named, not after it', () => {
    expect(expired(notice({ until: '2027-03-01' }), '2027-02-28')).toBe(false);
    expect(expired(notice({ until: '2027-03-01' }), '2027-03-01')).toBe(true);
    expect(expired(notice({ until: '2027-03-01' }), '2027-03-02')).toBe(true);
  });

  it('never retires one with no date on it', () => {
    expect(expired(notice({ until: '' }), '2099-01-01')).toBe(false);
  });
});

describe('noticeFor', () => {
  it('shows on a surface it names', () => {
    expect(noticeFor('/', notice({ on: ['home'] }), '2026-01-01')).toBeDefined();
  });

  it('stays off a surface it does not name', () => {
    expect(noticeFor(blogIndexPath(), notice({ on: ['home'] }), '2026-01-01')).toBeUndefined();
  });

  it('stays off every page once it has expired', () => {
    const past = notice({ on: ['home', 'blog', 'post'], until: '2026-01-01' });
    for (const path of ['/', blogIndexPath(), postPath('writing-a-post')]) {
      expect(noticeFor(path, past, '2026-06-01'), path).toBeUndefined();
    }
  });

  it('is off when the text is empty, which is how it ships', () => {
    expect(noticeFor('/', notice({ text: '   ' }), '2026-01-01')).toBeUndefined();
  });

  it('reads the emoji shortcodes in it', () => {
    const shown = noticeFor('/', notice(), '2026-01-01');
    expect(shown?.text.startsWith('🎓')).toBe(true);
    expect(shown?.text).not.toContain(':mortar_board:');
  });
});

describe('noticeWarnings', () => {
  it('says nothing about a notice with nothing wrong', () => {
    expect(noticeWarnings(notice({ until: '2027-03-01' }), '2026-01-01')).toEqual([]);
  });

  it('says nothing at all when there is no notice', () => {
    expect(noticeWarnings(notice({ text: '' }), '2099-01-01')).toEqual([]);
  });

  it('says so once it has expired, and names the day', () => {
    const [message] = noticeWarnings(notice({ until: '2026-03-01' }), '2026-06-01');
    expect(message).toContain('2026-03-01');
    expect(message).toContain('notice.until');
  });

  it('says so when it is written but shown nowhere', () => {
    const [message] = noticeWarnings(notice({ on: [] }), '2026-01-01');
    expect(message).toContain('no surface');
  });

  it('names a target the page will not link', () => {
    const [message] = noticeWarnings(
      notice({ text: 'See [the call](doi.org/10.0000/x)' }),
      '2026-01-01',
    );
    expect(message).toContain('doi.org/10.0000/x');
    expect(message).toContain('https://');
  });

  it('is happy with an external URL, a file, an address and a path', () => {
    const text =
      'A [site](https://example.org), a [file](/cv.pdf), an [address](mailto:a@b.c) and a [page](/about)';
    expect(noticeWarnings(notice({ text }), '2026-01-01')).toEqual([]);
  });
});

describe('the notice the site ships', () => {
  it('has nothing the build would complain about', () => {
    expect(noticeWarnings()).toEqual([]);
  });
});
