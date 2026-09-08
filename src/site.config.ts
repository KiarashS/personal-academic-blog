/**
 * Where a nav entry writes "the blog index" without knowing where that is:
 * `visibleNav` resolves it, because the answer depends on the `home` feature.
 * It lives here rather than in `lib/routes.ts` so the config can name it
 * without the two modules importing each other.
 */
export const BLOG_INDEX = '@blog';

export interface GiscusConfig {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'url' | 'title' | 'og:title';
  reactionsEnabled: boolean;
  lang: string;
}

/** Optional parts of the site that can be switched off wholesale. */
export type FeatureName =
  'home' | 'about' | 'publications' | 'archive' | 'categories' | 'projects' | 'slides' | 'contact';

export interface NavItem {
  label: string;
  /**
   * A path, or `BLOG_INDEX` for wherever the blog index currently is. A group
   * has none: it is a label with a list under it rather than a link itself.
   */
  to?: string;
  /** When set, the entry and its route only exist if that feature is on. */
  feature?: FeatureName;
  /**
   * Entries shown under this one — a popover on a wide screen, an indented list
   * in the menu on a narrow one. A group whose entries have all been gated away
   * is dropped along with them.
   *
   * These are links out of the app: a page of your own under `public/`, or
   * another site. They are ordinary anchors and load as documents, which is
   * what a page React does not render needs. `npm run links` still checks the
   * internal ones, so a folder you have not added yet fails the build.
   */
  items?: NavItem[];
}

export interface AnalyticsConfig {
  /**
   * Cloudflare Web Analytics site token. Empty means no analytics script is
   * emitted at all — the tag is absent from the built HTML, not merely inert.
   */
  cloudflareToken: string;
}

/**
 * A category is the coarse shelf a post sits on, above its tags: a post has one
 * category and any number of tags. The list is fixed here rather than taken
 * from whatever posts happen to say, so the set stays small, the navigation has
 * an order to follow, and a misspelled name is caught by the build.
 */
export interface Category {
  /** What the URL says: `/categories/<slug>`. */
  slug: string;
  label: string;
  /** A sentence for the categories index. */
  description?: string;
}

export interface HomeConfig {
  /** Runs into the name: "Hi, I am" then whoever you are. Empty for no lead-in. */
  greeting: string;
  /**
   * The line under the name on the front page. The site's `tagline` describes
   * the writing and sits under the title in the header everywhere else; this is
   * the front page's own, which is usually about you rather than about the
   * posts. Empty falls back to the site's, so one string still covers both.
   */
  tagline: string;
  /**
   * What a link to the front page says about itself when it is shared: the
   * Open Graph and search-result description. The site's `description` is about
   * the writing, and the front page is about the person, so a preview built
   * from it describes the wrong thing. Empty falls back to the site's.
   */
  description: string;
  /**
   * A row of profile links under the lines — ORCID, Google Scholar, GitHub,
   * whatever the owner's record in `src/content/authors.ts` fills in, in the
   * order `profileLinks` puts them. Off leaves the front page as words alone.
   */
  profileLinks: boolean;
  /**
   * Draw `src/content/signature.svg` in place of the name. It is inlined
   * rather than loaded as an image so its ink follows the site's theme,
   * including a manual light/dark choice, which an `img` cannot. Off renders
   * the name as type.
   */
  signature: boolean;
  /** Degrees to tilt the signature, the way a signed page is never quite square. */
  signatureTilt: number;
  /**
   * A portrait beside the text, as a path under `public/` — `/avatar.jpg` — or
   * a URL. It is cropped to a circle with a highlight that travels around the
   * rim. Empty leaves the front page as words alone.
   */
  avatar: string;
}

export interface SiteConfig {
  title: string;
  /** Under a home-screen icon, where a full name will not fit. */
  shortName: string;
  tagline: string;
  description: string;
  url: string;
  postsPerPage: number;
  /**
   * Switching a feature off removes its nav entry, its route and its
   * prerendered page — it is absent from the built site, not merely hidden.
   */
  features: Record<FeatureName, boolean>;
  /**
   * The author this site belongs to, whose profile links the contact page is
   * built from. An id from `src/content/authors.ts`; the first record is used
   * if it names one that does not exist.
   */
  owner: string;
  /** The front page, when the `home` feature is on. */
  home: HomeConfig;
  /**
   * The shelves themselves. The `categories` feature flag switches them on and
   * off; an empty list here does the same, since there would be nothing to show.
   */
  categories: Category[];
  nav: NavItem[];
  /**
   * A CV for the site's owner, shown in the navigation. A path under `public/`
   * — `/cv.pdf` — or a URL if it lives elsewhere. Empty means no link at all.
   */
  cv: string;
  /**
   * Comments are rendered with giscus (GitHub Discussions). Fill these in from
   * https://giscus.app after enabling Discussions on the repository. Leave
   * `repoId` empty to turn comments off site-wide.
   */
  giscus: GiscusConfig;
  /**
   * Cloudflare Web Analytics: no cookies and no cross-site identifiers.
   *
   * Which setup applies depends on how the domain is served. A domain proxied
   * through Cloudflare wants the automatic setup: enable Web Analytics for the
   * zone and the edge injects the beacon itself, so the token stays empty here.
   * A domain that is not behind Cloudflare wants the manual snippet, and its
   * token goes below.
   *
   * Setting a token on a proxied domain is the one combination that fails, and
   * it fails loudly: the manual beacon posts cross-origin to
   * cloudflareinsights.com, which answers 404 with no CORS header, so every
   * page load reports an access-control error in the console.
   */
  analytics: AnalyticsConfig;
}

export const siteConfig: SiteConfig = {
  title: 'Kiarash Soleimanzadeh',
  shortName: 'Kiarash S.',
  tagline: 'Working notes, drafts, and summaries of what I have been reading.',
  description: 'A personal research notebook: working notes, drafts and reading summaries.',
  // Origin only; the deployment's base path is added by `canonicalUrl`.
  // Canonical links, Open Graph tags, the feed and BibTeX are all built from it.
  url: 'https://blog.kiarashs.ir',
  // Low on purpose while the archive is small, so the pagination is visible
  // in the sample site. Ten or so is a better number for a real one.
  postsPerPage: 4,
  features: {
    // Off: the blog is the whole site and its index is the front page. On: the
    // front page is the site's own and the blog moves to /blog. See the README.
    home: true,
    about: true,
    publications: false,
    archive: true,
    categories: false,
    // On once `nav`'s Projects group lists work of yours rather than the
    // example that ships with it.
    projects: true,
    slides: false,
    contact: false,
  },
  owner: 'you',
  home: {
    greeting: 'Hi, I am',
    tagline: 'A curious mind working on AI for health',
    description: 'Kiarash Soleimanzadeh: a curious mind working on AI for health.',
    profileLinks: false,
    signature: true,
    signatureTilt: -3,
    avatar: '/avatar.jpg',
  },
  cv: '',
  categories: [
    {
      slug: 'ai-in-healthcare',
      label: 'AI in Healthcare',
      description: 'Clinical data, models that touch patients, and what it takes to trust one.',
    },
    {
      slug: 'machine-learning',
      label: 'Machine Learning',
      description: 'Methods, training runs and the parts of them that did not work.',
    },
    {
      slug: 'research-notes',
      label: 'Research Notes',
      description: 'Working notes, reading summaries and unfinished arguments.',
    },
    {
      slug: 'tutorials',
      label: 'Tutorials',
      description: 'How something is done, start to finish.',
    },
    {
      slug: 'mathematics',
      label: 'Mathematics',
      description: 'Derivations, proofs and the notation they need.',
    },
  ],
  nav: [
    { label: 'Home', to: '/', feature: 'home' },
    { label: 'Blog', to: BLOG_INDEX },
    { label: 'Publications', to: '/publications', feature: 'publications' },
    { label: 'Slides', to: '/slides', feature: 'slides' },
    { label: 'Archive', to: '/archive', feature: 'archive' },
    { label: 'Categories', to: '/categories', feature: 'categories' },
    {
      // A label with a list under it rather than a link: standalone pages of
      // your own kept in `public/projects/<name>/`, and work that lives
      // somewhere else. Replace these two with your own and turn the flag on.
      label: 'Projects',
      feature: 'projects',
      items: [
        { label: 'An example project', to: '/projects/example/' },
        { label: 'Something hosted elsewhere', to: 'https://example.org/a-project' },
      ],
    },
    { label: 'Tags', to: '/tags' },
    { label: 'Search', to: '/search' },
    { label: 'About', to: '/about', feature: 'about' },
    { label: 'Contact', to: '/contact', feature: 'contact' },
  ],
  giscus: {
    repo: 'KiarashS/personal-academic-blog',
    repoId: 'R_kgDOUMUy0Q',
    category: 'Comments',
    categoryId: 'DIC_kwDOUMUy0c4DE8gX',
    mapping: 'pathname',
    reactionsEnabled: true,
    lang: 'en',
  },
  analytics: {
    // Empty: blog.kiarashs.ir is proxied through Cloudflare, so the beacon is
    // the zone's to inject. Enable Web Analytics for the zone rather than
    // pasting a token here.
    cloudflareToken: '',
  },
};
