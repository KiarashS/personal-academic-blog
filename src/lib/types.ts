import type { CommentState } from '../site.config';
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

/** One piece of material an area points at: a paper, a dataset, a repository. */
export interface ResearchLink {
  label: string;
  /** A URL, or a path under `public/` such as `/papers/segmentation.pdf`. */
  href: string;
}

/**
 * A line of work, rendered at `/research` when the `research` feature is on.
 *
 * Only `title` and `summary` are required: an area you have just started has
 * no papers to link and no posts tagged yet, and is still worth saying you
 * work on.
 */
export interface ResearchArea {
  title: string;
  /** What the work is, in a paragraph. */
  summary: string;
  /**
   * Where it is going: the open questions, one per line. This is the part a
   * prospective student or collaborator is actually reading the page for, and
   * the part a publication list cannot tell them.
   */
  questions?: string[];
  /** Who works on it — ids from `src/content/authors.ts`. */
  people?: string[];
  /**
   * Tags whose posts belong to this area. Rendered as links to the tag pages,
   * which is the thing this page can do that a CV cannot: point at the writing.
   */
  tags?: string[];
  links?: ResearchLink[];
  /**
   * `past` moves an area below the current ones under its own heading. Work
   * you have moved on from still explains how you got here, so it is set aside
   * rather than deleted.
   */
  status?: 'current' | 'past';
}

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
  /**
   * The tooltip a pointer gets on hover. Empty is no tooltip, which is how
   * this ships.
   *
   * Not a second `alt`, and not a copy of it. A tooltip is the one label on a
   * page that a keyboard cannot reach, a touch screen never shows and some
   * screen readers read on top of the name the element already has, so
   * anything written here has to be an aside — a credit, a date, where the
   * picture was taken — rather than something the reader needs.
   */
  title: string;
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
  /**
   * Published at its address but left out of every list the site makes: the
   * blog index, the archive, tag, category and author pages, search, related
   * posts, the newer/older links, series navigation, the feeds and the
   * sitemap. The page carries `noindex`. For a post meant to be reached by its
   * link and nothing else.
   */
  unlisted?: boolean;
  slug?: string;
  /** Optional DOI or arXiv id for posts that accompany a paper. */
  doi?: string;
  /**
   * The opening picture or video. `banner: /figures/rig.jpg` is the whole of
   * it for most posts; see `Banner` for the longer form.
   */
  banner?: string | Partial<Banner>;
  /**
   * Whether this post takes comments: `true`, `false`, or `readonly` to keep
   * the thread and take the box away. Unset follows `giscus.comments`.
   */
  comments?: boolean | CommentState;
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
  /** Resolved against the site default, so a component never has to. */
  comments: CommentState;
  draft: boolean;
  featured: boolean;
  /** See `PostFrontmatter.unlisted`. */
  unlisted: boolean;
  headings: Heading[];
}

/** A post with its authors resolved, as the components consume it. */
export interface Post extends Omit<PostMeta, 'authorIds' | 'draft'> {
  authors: Author[];
}

/**
 * What someone is, or was, in the group. Alumni keep the role they had, which
 * is what their card says they were: "PhD student, 2019–2024".
 */
export type MemberRole =
  'pi' | 'management' | 'researcher' | 'postdoc' | 'phd' | 'masters' | 'bachelors';

/** One person on the People page; see `src/content/people.ts`. */
export interface Member {
  name: string;
  role: MemberRole;
  /**
   * The line under the name: "Associate Professor", "Lab manager". Left out,
   * it is the role's own name.
   */
  title?: string;
  /**
   * An id in `src/content/authors.ts`. The name then links to their author
   * page, and anything left out here — photo, bio, interests, links — comes
   * from that record.
   */
  author?: string;
  /**
   * A photo under `public/` (`/people/ada.jpg`) or a URL. It is cropped to a
   * circle, so a square one with the face in the middle works best. Without
   * one the card shows the person's initials.
   */
  photo?: string;
  pronouns?: string;
  /** Another institution, for someone co-supervised or visiting. */
  affiliation?: string;
  /** One or two sentences. */
  bio?: string;
  interests?: string[];
  email?: string;
  /** A path under `public/`, or a URL. */
  cv?: string;
  /** As on an author: a full URL, or the bare id the service uses. */
  links?: Partial<Record<ProfileKey, string>>;
  /** The year they joined, `2023`. */
  joined?: string;
  /** The year they left, `2025`. Setting it makes them alumni. */
  left?: string;
  /** Alumni: where they went, "Postdoc, ETH Zürich". */
  now?: string;
  /** Alumni: a link for `now`. */
  nowUrl?: string;
  /** A thesis written in the group, with a link to it if there is one. */
  thesis?: { title: string; url?: string };
}

/** The kind of position an opening is for, which names its badge. */
export type OpeningKind =
  'phd' | 'postdoc' | 'masters' | 'bachelors' | 'researcher' | 'engineer' | 'intern' | 'other';

/** One position on the Openings page; see `src/content/openings.ts`. */
export interface Opening {
  title: string;
  kind: OpeningKind;
  /** Two or three sentences: the project and why it matters. */
  summary: string;
  /** What the person will do, a few short points. */
  work?: string[];
  /** What they should bring. */
  requirements?: string[];
  /** What the position gives them: funding, supervision, travel. */
  offer?: string[];
  /** Free text: "September 2027", "As soon as possible". */
  start?: string;
  /** Free text: "3 years", "6 months". */
  duration?: string;
  funding?: string;
  location?: string;
  /**
   * The last day to apply, `YYYY-MM-DD`. The position is listed through that
   * day, in UTC, and not after. Left out, it is open until filled.
   */
  deadline?: string;
  /** How to apply. At least one of `url` and `email`. */
  apply: {
    /** An application portal. */
    url?: string;
    /** An address to write to; `subject` fills in the subject line. */
    email?: string;
    subject?: string;
    /** One line on what to send: "A CV, a transcript and a one-page statement." */
    note?: string;
  };
  /** The full advertisement, a path under `public/` or a URL. */
  details?: string;
}
