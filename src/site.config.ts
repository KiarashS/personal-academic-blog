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
  nav: [
    { label: 'Posts', to: '/' },
    { label: 'Publications', to: '/publications', feature: 'publications' },
    { label: 'Archive', to: '/archive', feature: 'archive' },
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
