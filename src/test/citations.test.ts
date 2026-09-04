import { describe, expect, it } from 'vitest';
import { citations, toApa, toIeee, toPlain } from '../lib/citations';
import type { Post } from '../lib/types';

const url = 'https://example.org/blog/posts/bootstrap';
const site = 'Kiarash Soleimanzadeh';

const post = (overrides: Partial<Post> = {}): Post => ({
  slug: 'bootstrap',
  title: 'What the bootstrap estimates',
  date: '2026-02-16',
  tags: [],
  revisions: [],
  authors: [{ id: 'k', name: 'Kiarash Soleimanzadeh' }],
  summary: '',
  readingMinutes: 3,
  featured: false,
  headings: [],
  ...overrides,
});

const two = [
  { id: 'k', name: 'Kiarash Soleimanzadeh' },
  { id: 'a', name: 'Ada King Lovelace' },
];

describe('toApa', () => {
  it('puts the surname first and the given names as initials', () => {
    expect(toApa(post(), url, site)).toBe(
      'Soleimanzadeh, K. (2026, February 16). What the bootstrap estimates. ' +
        `Kiarash Soleimanzadeh. ${url}`,
    );
  });

  it('joins two authors with an ampersand, initialling every given name', () => {
    expect(toApa(post({ authors: two }), url, site)).toContain(
      'Soleimanzadeh, K., & Lovelace, A. K.',
    );
  });

  it('prefers the DOI to the URL, which is what the style asks for', () => {
    expect(toApa(post({ doi: '10.5281/zenodo.123' }), url, site)).toMatch(
      /https:\/\/doi\.org\/10\.5281\/zenodo\.123$/,
    );
  });
});

describe('toIeee', () => {
  it('puts the initials first and abbreviates the month', () => {
    expect(toIeee(post(), url, site)).toBe(
      'K. Soleimanzadeh, "What the bootstrap estimates," ' +
        `Kiarash Soleimanzadeh, Feb. 16, 2026. [Online]. Available: ${url}`,
    );
  });

  it('joins two authors with "and"', () => {
    expect(toIeee(post({ authors: two }), url, site)).toContain(
      'K. Soleimanzadeh and A. K. Lovelace',
    );
  });

  it('appends the DOI rather than replacing the URL', () => {
    const text = toIeee(post({ doi: '10.5281/zenodo.123' }), url, site);
    expect(text).toContain(`Available: ${url}`);
    expect(text).toMatch(/doi: 10\.5281\/zenodo\.123$/);
  });
});

describe('toPlain', () => {
  it('reads as a sentence, with names as they are written', () => {
    expect(toPlain(post({ authors: two }), url, site)).toBe(
      'Kiarash Soleimanzadeh, Ada King Lovelace. “What the bootstrap estimates.” ' +
        `Kiarash Soleimanzadeh, 16 February 2026. ${url}`,
    );
  });
});

describe('every format', () => {
  it('cites the updated version when there is one', () => {
    const updated = post({ updated: '2026-03-02' });
    expect(toApa(updated, url, site)).toContain('(2026, March 2)');
    expect(toIeee(updated, url, site)).toContain('Mar. 2, 2026');
    expect(toPlain(updated, url, site)).toContain('2 March 2026');
  });

  it('takes the DOI from the publication block over the post', () => {
    const published = post({ doi: '10.0/old', publication: { doi: '10.0/new' } });
    for (const citation of citations(published, url, site)) {
      expect(citation.text).toContain('10.0/new');
      expect(citation.text).not.toContain('10.0/old');
    }
  });

  it('handles a single-word name without inventing an initial', () => {
    const mononym = post({ authors: [{ id: 'p', name: 'Plato' }] });
    expect(toApa(mononym, url, site)).toContain('Plato. (2026');
    expect(toIeee(mononym, url, site)).toContain('Plato, "');
  });

  it('offers the four formats in order', () => {
    expect(citations(post(), url, site).map((entry) => entry.id)).toEqual([
      'bibtex',
      'apa',
      'ieee',
      'plain',
    ]);
  });
});
