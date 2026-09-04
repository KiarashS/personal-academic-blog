import { describe, expect, it } from 'vitest';
import { profileLinks } from '../lib/profiles';
import type { Author } from '../lib/types';

const author = (overrides: Partial<Author> = {}): Author => ({
  id: 'a',
  name: 'Ada Lovelace',
  ...overrides,
});

const href = (person: Author, key: string) =>
  profileLinks(person).find((link) => link.key === key)?.href;

describe('profileLinks', () => {
  it('builds a URL from the bare id each service uses', () => {
    const person = author({
      links: {
        orcid: '0000-0002-1825-0097',
        scholar: 'abc123',
        semanticScholar: '1741101',
        arxiv: 'lovelace_a_1',
        github: 'ada',
        linkedin: 'ada-lovelace',
        bluesky: 'ada.bsky.social',
      },
    });

    expect(href(person, 'orcid')).toBe('https://orcid.org/0000-0002-1825-0097');
    expect(href(person, 'scholar')).toBe('https://scholar.google.com/citations?user=abc123');
    expect(href(person, 'semanticScholar')).toBe('https://www.semanticscholar.org/author/1741101');
    expect(href(person, 'arxiv')).toBe('https://arxiv.org/a/lovelace_a_1');
    expect(href(person, 'github')).toBe('https://github.com/ada');
    expect(href(person, 'linkedin')).toBe('https://www.linkedin.com/in/ada-lovelace');
    expect(href(person, 'bluesky')).toBe('https://bsky.app/profile/ada.bsky.social');
  });

  it('leaves a full URL alone, whichever field it is in', () => {
    const person = author({
      links: {
        orcid: 'https://orcid.org/0000-0002-1825-0097',
        github: 'https://github.com/ada',
        website: 'https://example.edu/~ada',
      },
    });

    expect(href(person, 'orcid')).toBe('https://orcid.org/0000-0002-1825-0097');
    expect(href(person, 'github')).toBe('https://github.com/ada');
    expect(href(person, 'website')).toBe('https://example.edu/~ada');
  });

  it('keeps a LinkedIn path that already names what it points at', () => {
    expect(href(author({ links: { linkedin: 'company/analytical-engines' } }), 'linkedin')).toBe(
      'https://www.linkedin.com/company/analytical-engines',
    );
  });

  it('turns a @user@host Mastodon address into its profile URL', () => {
    expect(href(author({ links: { mastodon: '@ada@mathstodon.xyz' } }), 'mastodon')).toBe(
      'https://mathstodon.xyz/@ada',
    );
  });

  it('adds the email last, as a mailto', () => {
    const links = profileLinks(author({ email: 'ada@example.edu', links: { github: 'ada' } }));
    expect(links.map((link) => link.key)).toEqual(['github', 'email']);
    expect(links[1].href).toBe('mailto:ada@example.edu');
  });

  it('orders the profiles identity first, then the indexes', () => {
    const person = author({
      links: { website: 'https://e.org', github: 'ada', orcid: '0000', scholar: 'x' },
    });
    expect(profileLinks(person).map((link) => link.key)).toEqual([
      'orcid',
      'scholar',
      'github',
      'website',
    ]);
  });

  it('skips empty and whitespace-only values', () => {
    expect(profileLinks(author({ links: { github: '', orcid: '   ' } }))).toEqual([]);
  });

  it('is empty for an author with nothing to link to', () => {
    expect(profileLinks(author())).toEqual([]);
  });
});
