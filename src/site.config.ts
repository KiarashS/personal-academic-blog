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
export type FeatureName = 'publications' | 'archive';

export interface NavItem {
  label: string;
  to: string;
  /** When set, the entry and its route only exist if that feature is on. */
  feature?: FeatureName;
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
  /** Empty means the whole feature is off: no nav entry, no routes. */
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
   * Cloudflare Web Analytics: no cookies, no cross-site identifiers, and
   * nothing to configure beyond the token. Create a site at
   * https://dash.cloudflare.com under Analytics & Logs → Web Analytics and
   * paste the token from the snippet it gives you.
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
  url: 'https://kiarashs.github.io',
  // Low on purpose while the archive is small, so the pagination is visible
  // in the sample site. Ten or so is a better number for a real one.
  postsPerPage: 4,
  features: {
    publications: false,
    archive: true,
  },
  cv: '',
  /**categories: [
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
  ],*/
  nav: [
    { label: 'Posts', to: '/' },
    { label: 'Publications', to: '/publications', feature: 'publications' },
    { label: 'Archive', to: '/archive', feature: 'archive' },
    { label: 'Categories', to: '/categories' },
    { label: 'Tags', to: '/tags' },
    { label: 'Search', to: '/search' },
    { label: 'About', to: '/about' },
  ],
  giscus: {
    repo: 'KiarashS/personal-academic-blog',
    repoId: '',
    category: 'Comments',
    categoryId: '',
    mapping: 'pathname',
    reactionsEnabled: true,
    lang: 'en',
  },
  analytics: {
    cloudflareToken: '',
  },
};
