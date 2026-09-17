import { describe, expect, it } from 'vitest';
import { profileLinks, researchInterests, selectProfileLinks } from '../lib/profiles';
import type { Author, ProfileLinkKey } from '../lib/types';
import { siteConfig } from '../site.config';

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

  it('puts the CV first, before the profiles', () => {
    const person = author({ cv: '/cv.pdf', links: { orcid: '0000' }, email: 'ada@example.edu' });
    expect(profileLinks(person).map((link) => link.key)).toEqual(['cv', 'orcid', 'email']);
  });

  it('takes a CV as a path under public/ or as a URL', () => {
    expect(href(author({ cv: '/cv.pdf' }), 'cv')).toBe('/cv.pdf');
    expect(href(author({ cv: 'https://example.edu/~ada/cv.pdf' }), 'cv')).toBe(
      'https://example.edu/~ada/cv.pdf',
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

describe('researchInterests', () => {
  it('keeps the order the record lists them in', () => {
    expect(researchInterests(author({ interests: ['Causal inference', 'Clinical NLP'] }))).toEqual([
      'Causal inference',
      'Clinical NLP',
    ]);
  });

  it('trims each entry and drops the blanks a trailing comma leaves', () => {
    expect(researchInterests(author({ interests: ['  Bayesian statistics ', '', '   '] }))).toEqual(
      ['Bayesian statistics'],
    );
  });

  it('is empty for an author who lists none', () => {
    expect(researchInterests(author())).toEqual([]);
    expect(researchInterests(author({ interests: [] }))).toEqual([]);
  });
});

describe('selectProfileLinks', () => {
  const full = profileLinks(
    author({
      cv: '/cv.pdf',
      email: 'ada@example.edu',
      links: { orcid: '0000-0002-1825-0097', github: 'ada', website: 'example.edu' },
    }),
  );

  it('keeps every link when no keys are named', () => {
    expect(selectProfileLinks(full, []).map((link) => link.key)).toEqual([
      'cv',
      'orcid',
      'github',
      'website',
      'email',
    ]);
  });

  it('keeps only the keys named', () => {
    expect(selectProfileLinks(full, ['github', 'email']).map((link) => link.key)).toEqual([
      'github',
      'email',
    ]);
  });

  it('reads them in the order written, not the order the record gives', () => {
    expect(selectProfileLinks(full, ['email', 'cv', 'orcid']).map((link) => link.key)).toEqual([
      'email',
      'cv',
      'orcid',
    ]);
  });

  it('skips a key this author has nothing for, rather than leaving a hole', () => {
    const sparse = profileLinks(author({ links: { github: 'ada' } }));
    expect(
      selectProfileLinks(sparse, ['orcid', 'github', 'email']).map((link) => link.key),
    ).toEqual(['github']);
  });

  it('hands back nothing when none of the keys match', () => {
    expect(selectProfileLinks(full, ['scholar', 'bluesky'])).toEqual([]);
  });

  it('never repeats a link, however often it is named', () => {
    expect(selectProfileLinks(full, ['github', 'github']).length).toBe(2);
  });
});

describe('siteConfig.profileLinkKeys', () => {
  it('covers all three surfaces', () => {
    expect(Object.keys(siteConfig.profileLinkKeys).sort()).toEqual([
      'authorCard',
      'contact',
      'home',
    ]);
  });

  it('names only keys the row can actually build', () => {
    // Derived rather than written out: a service added to `SERVICES` is covered
    // here the day it lands, and a key the config names that no record could
    // ever produce fails.
    const everything = profileLinks(
      author({
        cv: '/cv.pdf',
        email: 'ada@example.edu',
        links: {
          orcid: 'x',
          scholar: 'x',
          semanticScholar: 'x',
          arxiv: 'x',
          github: 'x',
          linkedin: 'x',
          mastodon: '@a@b.c',
          bluesky: 'x',
          website: 'example.edu',
        },
      }),
    );
    const known = new Set<ProfileLinkKey>(everything.map((link) => link.key));
    for (const keys of Object.values(siteConfig.profileLinkKeys)) {
      for (const key of keys) expect(known).toContain(key);
    }
  });
});
