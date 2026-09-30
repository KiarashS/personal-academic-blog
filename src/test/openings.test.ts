import { afterEach, describe, expect, it } from 'vitest';
import {
  applyHref,
  isOpen,
  kindName,
  openOpenings,
  openingsWarnings,
  validDeadline,
} from '../lib/openings';
import { siteConfig } from '../site.config';
import type { Opening } from '../lib/types';

const enabled = { ...siteConfig.features };
afterEach(() => {
  Object.assign(siteConfig.features, enabled);
});

const base: Opening = {
  title: 'A position',
  kind: 'phd',
  summary: 'What it is.',
  apply: { email: 'lab@example.org' },
};

describe('isOpen', () => {
  it('is open through the deadline day and closed after it', () => {
    const opening = { ...base, deadline: '2027-01-31' };
    expect(isOpen(opening, '2027-01-30')).toBe(true);
    expect(isOpen(opening, '2027-01-31')).toBe(true);
    expect(isOpen(opening, '2027-02-01')).toBe(false);
  });

  it('is open with no deadline', () => {
    expect(isOpen(base, '2099-01-01')).toBe(true);
  });
});

describe('openOpenings', () => {
  it('drops the closed ones and keeps the file order', () => {
    const list = [
      { ...base, title: 'Later', deadline: '2027-06-01' },
      { ...base, title: 'Closed', deadline: '2026-01-01' },
      { ...base, title: 'Rolling' },
    ];
    expect(openOpenings(list, '2026-09-29').map((opening) => opening.title)).toEqual([
      'Later',
      'Rolling',
    ]);
  });
});

describe('applyHref', () => {
  it('prefers the url', () => {
    expect(applyHref({ ...base, apply: { url: 'https://example.org/j', email: 'a@b.c' } })).toBe(
      'https://example.org/j',
    );
  });

  it('falls back to a mail with the subject encoded', () => {
    expect(applyHref({ ...base, apply: { email: 'a@b.c', subject: 'PhD & more' } })).toBe(
      'mailto:a@b.c?subject=PhD%20%26%20more',
    );
    expect(applyHref(base)).toBe('mailto:lab@example.org');
  });

  it('has nothing without either', () => {
    expect(applyHref({ ...base, apply: {} })).toBeUndefined();
  });
});

describe('kindName', () => {
  it('names each kind, and an unknown one generically', () => {
    expect(kindName('postdoc')).toBe('Postdoc');
    expect(kindName('unknown' as Opening['kind'])).toBe('Position');
  });
});

describe('openingsWarnings', () => {
  it('says nothing with the page off', () => {
    siteConfig.features.openings = false;
    expect(openingsWarnings([{ ...base, title: '' }])).toEqual([]);
  });

  it('names each problem', () => {
    siteConfig.features.openings = true;
    const warnings = openingsWarnings(
      [
        { ...base, title: '' },
        { ...base, summary: '' },
        { ...base, apply: {} },
        { ...base, deadline: '31 January' },
        { ...base, deadline: '2026-01-01' },
        { ...base, details: 'ad.pdf' },
      ],
      '2026-09-29',
    );
    expect(warnings).toHaveLength(6);
    expect(warnings[0]).toMatch(/no title/);
    expect(warnings[1]).toMatch(/no summary/);
    expect(warnings[2]).toMatch(/no way to apply/);
    expect(warnings[3]).toMatch(/not a date/);
    expect(warnings[4]).toMatch(/closed on 2026-01-01/);
    expect(warnings[5]).toMatch(/ad\.pdf/);
  });

  it('passes the placeholder file', () => {
    siteConfig.features.openings = true;
    expect(openingsWarnings(undefined, '2026-09-29')).toEqual([]);
  });
});

describe('validDeadline', () => {
  it('accepts a real day and refuses the rest', () => {
    expect(validDeadline('2027-01-31')).toBe(true);
    expect(validDeadline('2028-02-29')).toBe(true);
    expect(validDeadline('2027-02-30')).toBe(false);
    expect(validDeadline('2027-1-31')).toBe(false);
    expect(validDeadline('31 January')).toBe(false);
    expect(validDeadline(undefined)).toBe(false);
  });
});

describe('openings checks, further', () => {
  it('gives a path to apply the base, and leaves a URL alone', () => {
    expect(applyHref({ ...base, apply: { url: '/openings/apply.pdf' } })).toBe(
      '/openings/apply.pdf',
    );
    expect(applyHref({ ...base, apply: { url: 'https://jobs.example.org/1' } })).toBe(
      'https://jobs.example.org/1',
    );
  });

  it('names an impossible date, an unknown kind and an apply link with no root', () => {
    siteConfig.features.openings = true;
    const warnings = openingsWarnings(
      [
        { ...base, deadline: '2027-02-30' },
        { ...base, kind: 'professor' as Opening['kind'] },
        { ...base, apply: { url: 'apply.pdf' } },
      ],
      '2026-09-30',
    );
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatch(/2027-02-30.*never closes/);
    expect(warnings[1]).toMatch(/professor/);
    expect(warnings[2]).toMatch(/apply\.pdf/);
  });
});
