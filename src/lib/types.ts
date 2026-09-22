export interface Author {
  id: string;
  name: string;
  /** Shown under the name on post pages and on the author page. */
  affiliation?: string;
  role?: string;
  bio?: string;
  /**
   * Subjects the author works on, in their own words. The bio says it in prose;
   * this is the keyword form a reader scans, so keep the entries short.
   */
  interests?: string[];
  email?: string;
  /** A path under `public/`, or a URL if it lives somewhere else. */
  cv?: string;
  avatar?: string;
  /**
   * Each value is either a full URL or the bare id the service uses — an ORCID
   * iD, a GitHub username — which `profileLinks` turns into a URL.
   */
  links?: Partial<Record<ProfileKey, string>>;
}

/**
 * Everything the profile row can carry: a service below, plus the two that come
 * from fields of their own rather than from `links` — the CV and the email.
 * This is what `profileLinkKeys` in the config names.
 */
export type ProfileLinkKey = ProfileKey | 'cv' | 'email';

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

/**
 * A talk, lecture or seminar, with wherever its materials live. Everything but
 * the title and the date is optional: a deck with no video is still a deck.
 */
export interface SlideDeck {
  title: string;
  /** ISO date the talk was given, `2026-04-12`. */
  date: string;
  /** The conference, seminar series or course it was given at. */
  event?: string;
  /** A sentence on what it covered. */
  summary?: string;
  /** The deck: a path under `public/`, or a URL if it is hosted elsewhere. */
  slides?: string;
  video?: string;
  code?: string;
  /** A paper the talk is based on. */
  paper?: string;
}

/**
 * One line of news: something that happened, with the date it happened on.
 *
 * Deliberately not a post. An entry is a sentence, so it has no slug, no route
 * and no body — where it points is somewhere that already exists, which is
 * usually a post of yours, a DOI or a venue's page.
 */
export interface NewsItem {
  /** ISO date, `2026-03-12`. Entries may be dated ahead for an announcement. */
  date: string;
  /**
   * What happened, in one sentence. Plain text, except for `[words](where)`,
   * which links those words and is the only markup an entry understands.
   */
  text: string;
  /**
   * Where the entry as a whole points: an app route, a file under `public/`,
   * or a URL. It follows the sentence as "more", whether the text carries
   * links of its own or not; the sentence itself is never made into one.
   */
  href?: string;
}

/** One dated change to a published post. */
export interface Revision {
  date: string;
  /** What changed, in a line. A date on its own tells a reader nothing. */
  note: string;
}

/** What the block describes: a paper, or a thing that was never going to be one. */
export type PublicationKind = 'paper' | 'project';

/**
 * The work a post is about: where it was published, or is on its way to being,
 * or — for a `project` — the software, dataset or ongoing effort it documents,
 * which has a name and a repository but no venue and no year of record.
 */
export interface Publication {
  /** Absent means a paper, which is the common case and the older behaviour. */
  kind?: PublicationKind;
  /** What the work is called. A project needs one; a paper reads better with it. */
  title?: string;
  /**
   * Free text. "Preprint", "Under review", "Published", "To appear" for a
   * paper; "Maintained", "Archived", "In progress" for a project.
   */
  status?: string;
  /** The journal, conference or repository. A project usually has none. */
  venue?: string;
  year?: string;
  doi?: string;
  /** The paper itself, wherever it lives. */
  url?: string;
  pdf?: string;
  code?: string;
  data?: string;
}

/**
 * The picture or video a post opens with, above its title.
 *
 * Normalised by `buildPost`, so everything that renders one reads the same
 * shape rather than working out its own defaults: an author writes
 * `banner: /figures/rig.jpg` and gets the rest.
 */
export interface Banner {
  /** A path under `public/`, a URL, or a YouTube link. */
  src: string;
  /** What it shows. Empty says it is decoration and a screen reader skips it. */
  alt: string;
  /** A still to hold before a video plays. Also the card a shared link shows. */
  poster?: string;
  /**
   * Start a video on load, muted and looping. Held back from a reader who has
   * asked their system for less motion, who gets the first frame and the
   * controls instead.
   */
  autoplay: boolean;
  /**
   * The crop, as a CSS `aspect-ratio`.
   *
   * A picture defaults to `3 / 1`, which is the widest thing that leaves the
   * opening sentence on a 1280x800 screen: the column is fixed at 46rem, so a
   * banner's height follows the column rather than the window, and a 16:9 crop
   * comes out 414px tall and pushes the first paragraph past the fold. A video
   * defaults to `16 / 9` instead, because cropping a picture costs nothing and
   * cropping a video costs the picture.
   */
  ratio: string;
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
  /** One category, by slug or label; see `categories` in the site config. */
  category?: string;
  authors?: string[];
  tags?: string[];
  summary?: string;
  draft?: boolean;
  /** Pins the post to the top of the index. */
  featured?: boolean;
  slug?: string;
  /** Optional DOI or arXiv id for posts that accompany a paper. */
  doi?: string;
  /**
   * The opening picture or video. `banner: /figures/rig.jpg` is the whole of
   * it for most posts; see `Banner` for the longer form.
   */
  banner?: string | Partial<Banner>;
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
  /** The category's slug, or undefined when the post names none. */
  category?: string;
  tags: string[];
  authorIds: string[];
  summary: string;
  readingMinutes: number;
  doi?: string;
  banner?: Banner;
  draft: boolean;
  featured: boolean;
  headings: Heading[];
}

/** A post with its authors resolved, as the components consume it. */
export interface Post extends Omit<PostMeta, 'authorIds' | 'draft'> {
  authors: Author[];
}
