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
    // The keyword form of the bio, shown as one line under it. Optional.
    // interests: ['Machine learning for clinical data', 'Causal inference', 'Bayesian statistics'],
    // email: 'you@example.edu',
    // cv: '/cv.pdf',                        // a file in public/, or a URL
    // Either the bare id a service uses or a full URL — both work.
    links: {
      github: 'KiarashS',
      website: 'https://kiarashs.ir',
      // orcid: '0000-0000-0000-0000',
      // scholar: 'AbCdEfGhIjK',            // the `user=` value on your profile
      // semanticScholar: '1741101',        // the number in the author URL
      // arxiv: 'soleimanzadeh_k_1',
      // github: 'KiarashS',
      // linkedin: 'kiarash-soleimanzadeh', // or 'company/name'
      // mastodon: '@you@mathstodon.xyz',
      // bluesky: 'you.bsky.social',
      // website: 'https://kiarashs.ir',
    },
  },
  coauthor: {
    id: 'coauthor',
    name: 'Co-author Name',
    role: 'Your role',
    affiliation: 'Their department, their institution',
    bio: 'Posts can list several authors. Each one gets a byline, a card at the foot of the post, and a page listing what they have written.',
    interests: ['Their first subject', 'Their second'],
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
