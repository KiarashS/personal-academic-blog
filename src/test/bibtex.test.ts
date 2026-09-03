import { describe, expect, it } from 'vitest';
import { toBibtex } from '../lib/bibtex';
import type { Post } from '../lib/types';

const post = (overrides: Partial<Post> = {}): Post => ({
  slug: 'a-post',
  title: 'What the bootstrap estimates',
  date: '2026-08-19',
  tags: [],
  authors: [{ id: 'a', name: 'Ada Lovelace' }],
  summary: '',
  readingMinutes: 3,
  headings: [],
  ...overrides,
});

describe('toBibtex', () => {
  it('puts names in BibTeX order and joins them with "and"', () => {
    const entry = toBibtex(
      post({
        authors: [
          { id: 'a', name: 'Ada Lovelace' },
          { id: 'b', name: 'Alan Turing' },
        ],
      }),
      'https://example.org/posts/a-post',
    );
    expect(entry).toContain('author  = {Lovelace, Ada and Turing, Alan}');
  });

  it('builds a key from surname, year and the first meaningful word', () => {
    expect(toBibtex(post(), 'https://example.org/x')).toMatch(/^@misc\{lovelace2026bootstrap,/);
  });

  it('includes a DOI only when the post has one', () => {
    expect(toBibtex(post(), 'https://example.org/x')).not.toContain('doi');
    expect(toBibtex(post({ doi: '10.5281/zenodo.1' }), 'https://example.org/x')).toContain(
      'doi     = {10.5281/zenodo.1}',
    );
  });

  it('leaves a single-word name alone rather than inventing a surname', () => {
    const entry = toBibtex(
      post({ authors: [{ id: 'a', name: 'Prince' }] }),
      'https://example.org/x',
    );
    expect(entry).toContain('author  = {Prince}');
  });
});
