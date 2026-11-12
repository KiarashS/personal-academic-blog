/**
 * The modules of the pages that load on demand (`lazy` in `App.tsx`), by the
 * component's name, which is also its export's.
 *
 * A module may export `preload`, which loads what the page reads before it can
 * draw: its text, for a page whose text is a Markdown module. `main.tsx` calls
 * both, for the page a prerendered document holds, before hydrating it.
 */
export interface PageModule {
  preload?: () => Promise<unknown>;
  [name: string]: unknown;
}

export const PAGE_MODULES = {
  PostPage: () => import('../pages/PostPage'),
  AboutPage: () => import('../pages/AboutPage'),
  SearchPage: () => import('../pages/SearchPage'),
  ResearchPage: () => import('../pages/ResearchPage'),
  PublicationsPage: () => import('../pages/PublicationsPage'),
  ArchivePage: () => import('../pages/ArchivePage'),
  HomePage: () => import('../pages/HomePage'),
  SlidesPage: () => import('../pages/SlidesPage'),
  ContactPage: () => import('../pages/ContactPage'),
  NewsPage: () => import('../pages/NewsPage'),
  PeoplePage: () => import('../pages/PeoplePage'),
  OpeningsPage: () => import('../pages/OpeningsPage'),
} satisfies Record<string, () => Promise<PageModule>>;

export type PageName = keyof typeof PAGE_MODULES;

export const isPageName = (name: string | undefined): name is PageName =>
  name !== undefined && Object.hasOwn(PAGE_MODULES, name);
