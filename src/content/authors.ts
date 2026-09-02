import type { Author } from '../lib/types';

/**
 * Authors referenced by id in post frontmatter (`authors: [kiarash]`).
 */
export const authors: Record<string, Author> = {
  kiarash: {
    id: 'kiarash',
    name: 'Kiarash S.',
    role: 'Postdoctoral researcher',
    affiliation: 'Department of Statistics, Example University',
    bio: 'Works on inference under model misspecification and on making simulation studies reproducible. Previously at the Institute for Applied Mathematics.',
    email: 'kiarash@example.org',
    links: {
      website: 'https://example.org',
      scholar: 'https://scholar.google.com/citations?user=example',
      orcid: 'https://orcid.org/0000-0000-0000-0000',
      github: 'https://github.com/KiarashS',
      arxiv: 'https://arxiv.org/a/example_k_1',
    },
  },
  guest: {
    id: 'guest',
    name: 'Ada Reyes',
    role: 'PhD candidate',
    affiliation: 'Numerical Analysis Group, Example University',
    bio: 'Studies preconditioners for large sparse systems arising in climate models.',
    links: {
      github: 'https://github.com/example',
    },
  },
};

const fallbackAuthor = (id: string): Author => ({ id, name: id });

export function getAuthor(id: string): Author {
  return authors[id] ?? fallbackAuthor(id);
}

export function getAuthors(ids: string[] | undefined): Author[] {
  return (ids ?? []).map(getAuthor);
}
