import { describe, expect, it } from 'vitest';
import { bibAuthors, bibUrl, bibVenue, bibYear, parseBib } from '../lib/bib-parse';

const sample = `
% a comment line
@article{knuth1984literate,
  author  = {Knuth, Donald E.},
  title   = {Literate Programming},
  journal = {The Computer Journal},
  volume  = {27},
  pages   = {97--111},
  year    = {1984},
  doi     = {10.1093/comjnl/27.2.97}
}

@inproceedings{two2020authors,
  author    = {Lovelace, Ada and Turing, Alan},
  title     = {On {DNA} and machines},
  booktitle = "Proceedings of Nothing",
  year      = 2020,
  eprint    = {2001.00001}
}
`;

describe('parseBib', () => {
  const entries = parseBib(sample);

  it('reads every entry with its type and key', () => {
    expect(entries.map((e) => [e.type, e.key])).toEqual([
      ['article', 'knuth1984literate'],
      ['inproceedings', 'two2020authors'],
    ]);
  });

  it('accepts brace, quote and bare values', () => {
    expect(entries[0].fields.journal).toBe('The Computer Journal');
    expect(entries[1].fields.booktitle).toBe('Proceedings of Nothing');
    expect(entries[1].fields.year).toBe('2020');
  });

  it('strips capitalisation braces and normalises en dashes', () => {
    expect(entries[1].fields.title).toBe('On DNA and machines');
    expect(entries[0].fields.pages).toBe('97–111');
  });

  it('reorders names into reading order', () => {
    expect(bibAuthors(entries[0])).toEqual(['Donald E. Knuth']);
    expect(bibAuthors(entries[1])).toEqual(['Ada Lovelace', 'Alan Turing']);
  });

  it('prefers a DOI, then an arXiv eprint, for the link', () => {
    expect(bibUrl(entries[0])).toBe('https://doi.org/10.1093/comjnl/27.2.97');
    expect(bibUrl(entries[1])).toBe('https://arxiv.org/abs/2001.00001');
  });

  it('finds the venue whichever field holds it', () => {
    expect(bibVenue(entries[0])).toBe('The Computer Journal');
    expect(bibVenue(entries[1])).toBe('Proceedings of Nothing');
  });

  it('reads the year as a number', () => {
    expect(bibYear(entries[0])).toBe(1984);
  });

  it('returns nothing for an empty file', () => {
    expect(parseBib('')).toEqual([]);
  });
});
