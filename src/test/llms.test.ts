import { describe, expect, it } from 'vitest';
import { llmsTxt, type LlmsInput } from '../lib/llms';

const input: LlmsInput = {
  title: 'Ada Lovelace',
  summary: 'Notes on the Analytical Engine.',
  person: {
    name: 'Ada Lovelace',
    role: 'Mathematician',
    affiliation: 'London',
    tagline: 'Working on machines that compute',
    interests: ['Computation', 'Poetical science'],
  },
  note: '',
  profiles: [{ label: 'GitHub', href: 'https://github.com/ada' }],
  pages: [{ title: 'About', url: 'https://example.org/about', note: 'Who I am' }],
  publications: [
    {
      key: 'notes',
      type: 'article',
      fields: {
        title: 'Notes on [the] Engine',
        author:
          'Lovelace, Ada and Babbage, Charles and Menabrea, Luigi and Taylor, Richard and Other, A.',
        journal: 'Scientific Memoirs',
        year: '1843',
        doi: '10.1/notes',
      },
    },
    { key: 'older', type: 'misc', fields: { title: 'An Older Note', year: '1840' } },
  ],
  selected: ['notes', 'missing'],
  posts: [
    {
      title: 'A post',
      url: 'https://example.org/blog/a',
      date: '2026-01-01',
      summary: 'Line one\nline two',
    },
  ],
  more: [{ title: 'Sitemap', url: 'https://example.org/sitemap.xml' }],
};

describe('llmsTxt', () => {
  const out = llmsTxt(input);

  it('opens as llmstxt.org asks: a heading, a quoted summary, then who', () => {
    expect(out.startsWith('# Ada Lovelace\n\n> Notes on the Analytical Engine.\n\n')).toBe(true);
    expect(out).toContain(
      'Ada Lovelace, Mathematician, London. Working on machines that compute. ' +
        'Research interests: Computation; Poetical science.',
    );
  });

  it('lists links as - [Title](url): note, with nothing that breaks the syntax', () => {
    expect(out).toContain(
      '- [Notes on the Engine](https://doi.org/10.1/notes): Ada Lovelace, Charles Babbage, ' +
        'Luigi Menabrea et al. Scientific Memoirs. 1843',
    );
    expect(out).toContain('- [A post](https://example.org/blog/a): 2026-01-01. Line one line two');
    expect(out).toContain('- An Older Note: 1840');
  });

  it('puts selected work first, skipping a key it does not have, and every paper after', () => {
    const selected = out.slice(out.indexOf('## Selected work'), out.indexOf('## Publications'));
    expect(selected.match(/^- /gm)).toHaveLength(1);
    expect(out.indexOf('Notes on the Engine')).toBeLessThan(out.indexOf('An Older Note'));
  });

  it('adds the note, and leaves out a section with nothing in it', () => {
    expect(llmsTxt({ ...input, note: 'Cite the DOI.' })).toContain(
      '\n\nCite the DOI.\n\n## Profiles',
    );
    expect(llmsTxt({ ...input, posts: [] })).not.toContain('## Blog posts');
    expect(out.trimEnd().endsWith('- [Sitemap](https://example.org/sitemap.xml)')).toBe(true);
  });
});
