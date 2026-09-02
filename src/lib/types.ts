export interface Author {
  id: string;
  name: string;
  /** Shown under the name on post pages and on the author page. */
  affiliation?: string;
  role?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  links?: {
    website?: string;
    scholar?: string;
    orcid?: string;
    github?: string;
    mastodon?: string;
    arxiv?: string;
  };
}

export interface PostFrontmatter {
  title: string;
  date: string;
  updated?: string;
  authors?: string[];
  tags?: string[];
  summary?: string;
  draft?: boolean;
  slug?: string;
  /** Optional DOI or arXiv id for posts that accompany a paper. */
  doi?: string;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  tags: string[];
  authors: Author[];
  summary: string;
  body: string;
  /** Markdown stripped down to words, used for search and reading time. */
  plainText: string;
  readingMinutes: number;
  doi?: string;
}
