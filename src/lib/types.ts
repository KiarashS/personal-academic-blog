export interface Author {
  id: string;
  name: string;
  /** Shown under the name on post pages and on the author page. */
  affiliation?: string;
  role?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  /**
   * Each value is either a full URL or the bare id the service uses — an ORCID
   * iD, a GitHub username — which `profileLinks` turns into a URL.
   */
  links?: Partial<Record<ProfileKey, string>>;
}

/** The profiles an academic reader looks for, in the order they are shown. */
export type ProfileKey =
  | 'orcid'
  | 'scholar'
  | 'semanticScholar'
  | 'arxiv'
  | 'github'
  | 'linkedin'
  | 'mastodon'
  | 'bluesky'
  | 'website';

/** One dated change to a published post. */
export interface Revision {
  date: string;
  /** What changed, in a line. A date on its own tells a reader nothing. */
  note: string;
}

/** Where a post's underlying work was published, or is on its way to being. */
export interface Publication {
  /** Free text: "Preprint", "Under review", "Published", "To appear". */
  status?: string;
  /** The journal, conference or repository. */
  venue?: string;
  year?: string;
  doi?: string;
  /** The paper itself, wherever it lives. */
  url?: string;
  pdf?: string;
  code?: string;
  data?: string;
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
  publication?: Publication;
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
  publication?: Publication;
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
