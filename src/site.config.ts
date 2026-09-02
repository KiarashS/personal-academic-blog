export interface GiscusConfig {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'url' | 'title' | 'og:title';
  reactionsEnabled: boolean;
  lang: string;
}

export interface SiteConfig {
  title: string;
  tagline: string;
  description: string;
  url: string;
  postsPerPage: number;
  nav: { label: string; to: string }[];
  /**
   * Comments are rendered with giscus (GitHub Discussions). Fill these in from
   * https://giscus.app after enabling Discussions on the repository. Leave
   * `repoId` empty to turn comments off site-wide.
   */
  giscus: GiscusConfig;
}

export const siteConfig: SiteConfig = {
  title: 'Notes',
  tagline: 'Working notes on statistics, computation and the papers in between.',
  description:
    'A personal research notebook: preprints in progress, method notes, and reading summaries.',
  // Origin only; the deployment's base path is added by `canonicalUrl`.
  // Canonical links, Open Graph tags, the feed and BibTeX are all built from it.
  url: 'https://kiarashs.github.io',
  postsPerPage: 4,
  nav: [
    { label: 'Posts', to: '/' },
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
