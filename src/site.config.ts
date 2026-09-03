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
export type FeatureName = 'publications';

export interface NavItem {
  label: string;
  to: string;
  /** When set, the entry and its route only exist if that feature is on. */
  feature?: FeatureName;
}

export interface SiteConfig {
  title: string;
  tagline: string;
  description: string;
  url: string;
  postsPerPage: number;
  /**
   * Switching a feature off removes its nav entry, its route and its
   * prerendered page — it is absent from the built site, not merely hidden.
   */
  features: Record<FeatureName, boolean>;
  nav: NavItem[];
  /**
   * Comments are rendered with giscus (GitHub Discussions). Fill these in from
   * https://giscus.app after enabling Discussions on the repository. Leave
   * `repoId` empty to turn comments off site-wide.
   */
  giscus: GiscusConfig;
}

export const siteConfig: SiteConfig = {
  title: 'Kiarash Soleimanzadeh',
  tagline: 'Working notes, drafts, and summaries of what I have been reading.',
  description: 'A personal research notebook: working notes, drafts and reading summaries.',
  // Origin only; the deployment's base path is added by `canonicalUrl`.
  // Canonical links, Open Graph tags, the feed and BibTeX are all built from it.
  url: 'https://kiarashs.github.io',
  // Low on purpose while the archive is small, so the pagination is visible
  // in the sample site. Ten or so is a better number for a real one.
  postsPerPage: 4,
  features: {
    publications: true,
  },
  nav: [
    { label: 'Posts', to: '/' },
    { label: 'Publications', to: '/publications', feature: 'publications' },
    { label: 'Archive', to: '/archive' },
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
};
