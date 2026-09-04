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

/** One dated change to a published post. */
export interface Revision {
  date: string;
  /** What changed, in a line. A date on its own tells a reader nothing. */
  note: string;
}

export interface PostFrontmatter {
  title: string;
  date: string;
  /** Falls back to the newest revision when `revisions` is given. */
  updated?: string;
  revisions?: Revision[];
  /** Name of a multi-part series this post belongs to. */
  series?: string;
  /** Position within the series; without it, date order decides. */
  part?: number;
  authors?: string[];
  tags?: string[];
  summary?: string;
  draft?: boolean;
  /** Pins the post to the top of the index. */
  featured?: boolean;
  slug?: string;
  /** Optional DOI or arXiv id for posts that accompany a paper. */
  doi?: string;
}

export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * What the Markdown plugin emits for each post's `?meta` module: everything the
 * list pages need, without the rendered body.
 */
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  revisions: Revision[];
  series?: string;
  part?: number;
  tags: string[];
  authorIds: string[];
  summary: string;
  readingMinutes: number;
  doi?: string;
  draft: boolean;
  featured: boolean;
  headings: Heading[];
}

/** A post with its authors resolved, as the components consume it. */
export interface Post extends Omit<PostMeta, 'authorIds' | 'draft'> {
  authors: Author[];
}
