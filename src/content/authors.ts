import type { Author } from '../lib/types';

/**
 * Authors referenced by id in post frontmatter (`authors: [you]`).
 *
 * Everything here is placeholder text. Replace it with your own details
 * before publishing — these records are rendered on post pages, on author
 * pages, and in the BibTeX that readers copy.
 */
export const authors: Record<string, Author> = {
  you: {
    id: 'you',
    name: 'Kiarash Soleimanzadeh',
    role: 'Your role',
    affiliation: 'Your department, your institution',
    bio: 'One or two sentences about what you work on. This appears under every post you write and on your author page.',
    // email: 'you@example.edu',
    links: {
      // website: 'https://example.edu/~you',
      // scholar: 'https://scholar.google.com/citations?user=...',
      // orcid: 'https://orcid.org/0000-0000-0000-0000',
      // github: 'https://github.com/you',
    },
  },
  coauthor: {
    id: 'coauthor',
    name: 'Co-author Name',
    role: 'Your role',
    affiliation: 'Their department, their institution',
    bio: 'Posts can list several authors. Each one gets a byline, a card at the foot of the post, and a page listing what they have written.',
    links: {},
  },
};

const fallbackAuthor = (id: string): Author => ({ id, name: id });

export function getAuthor(id: string): Author {
  return authors[id] ?? fallbackAuthor(id);
}

export function getAuthors(ids: string[] | undefined): Author[] {
  return (ids ?? []).map(getAuthor);
}
