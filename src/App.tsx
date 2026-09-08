import { createElement, Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getPage } from './lib/page-registry';
import { Layout } from './components/Layout';
import { categoriesEnabled } from './lib/categories';
import { isEnabled } from './lib/features';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryPage } from './pages/CategoryPage';
import { BlogPage } from './pages/BlogPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TagPage } from './pages/TagPage';
import { TagsPage } from './pages/TagsPage';
import { AuthorPage } from './pages/AuthorPage';

// KaTeX, highlight.js and the search index are only needed on the routes that
// use them, so they load on navigation instead of on first paint.
//
// The prerenderer registers the same components eagerly and `Lazily` picks
// those up, because a boundary that suspends during a prerender leaves its
// fallback in the shell and the real markup in a block only a script can
// reveal. See `src/lib/page-registry.ts`.
const PostPage = lazy(() => import('./pages/PostPage').then((m) => ({ default: m.PostPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const PublicationsPage = lazy(() =>
  import('./pages/PublicationsPage').then((m) => ({ default: m.PublicationsPage })),
);
const ArchivePage = lazy(() =>
  import('./pages/ArchivePage').then((m) => ({ default: m.ArchivePage })),
);
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const SlidesPage = lazy(() =>
  import('./pages/SlidesPage').then((m) => ({ default: m.SlidesPage })),
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
);

/**
 * One route's page, with its boundary. The lazy component is the reader's path
 * and the registered one is the prerenderer's; the markup is the same either
 * way, so hydration matches whichever wrote it.
 */
function Lazily({ name, of: Lazy }: { name: string; of: ComponentType }) {
  // `createElement` rather than JSX: both components are module-level constants
  // and the choice between them is fixed for the lifetime of a build — the
  // server always has the eager one, the browser never does — but written as
  // `<Page />` it reads to the linter as a component made up during a render.
  const Page = getPage(name) ?? Lazy;
  return <Suspense fallback={<p className="empty">Loading…</p>}>{createElement(Page)}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* With a home page the blog moves aside to /blog and takes its posts
            with it, so a list and its items never live in two branches of the
            tree. Without one the blog is the site, and its index is the front
            page. `postPath` and `blogPagePath` say the same thing in links. */}
        {isEnabled('home') ? (
          <>
            <Route index element={<Lazily name="HomePage" of={HomePage} />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/page/:page" element={<BlogPage />} />
            <Route path="blog/:slug" element={<Lazily name="PostPage" of={PostPage} />} />
          </>
        ) : (
          <>
            <Route index element={<BlogPage />} />
            <Route path="page/:page" element={<BlogPage />} />
            <Route path="posts/:slug" element={<Lazily name="PostPage" of={PostPage} />} />
          </>
        )}
        {isEnabled('slides') ? (
          <Route path="slides" element={<Lazily name="SlidesPage" of={SlidesPage} />} />
        ) : null}
        {isEnabled('contact') ? (
          <Route path="contact" element={<Lazily name="ContactPage" of={ContactPage} />} />
        ) : null}
        {isEnabled('publications') ? (
          <Route
            path="publications"
            element={<Lazily name="PublicationsPage" of={PublicationsPage} />}
          />
        ) : null}
        {isEnabled('archive') ? (
          <Route path="archive" element={<Lazily name="ArchivePage" of={ArchivePage} />} />
        ) : null}
        {categoriesEnabled() ? (
          <>
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/:category" element={<CategoryPage />} />
            <Route path="categories/:category/page/:page" element={<CategoryPage />} />
          </>
        ) : null}
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/:tag" element={<TagPage />} />
        <Route path="tags/:tag/page/:page" element={<TagPage />} />
        <Route path="authors/:id" element={<AuthorPage />} />
        <Route path="search" element={<Lazily name="SearchPage" of={SearchPage} />} />
        {isEnabled('about') ? (
          <Route path="about" element={<Lazily name="AboutPage" of={AboutPage} />} />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
