import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
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
            <Route
              index
              element={
                <Suspense fallback={<p className="empty">Loading…</p>}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/page/:page" element={<BlogPage />} />
            <Route
              path="blog/:slug"
              element={
                <Suspense fallback={<p className="empty">Loading…</p>}>
                  <PostPage />
                </Suspense>
              }
            />
          </>
        ) : (
          <>
            <Route index element={<BlogPage />} />
            <Route path="page/:page" element={<BlogPage />} />
            <Route
              path="posts/:slug"
              element={
                <Suspense fallback={<p className="empty">Loading…</p>}>
                  <PostPage />
                </Suspense>
              }
            />
          </>
        )}
        {isEnabled('slides') ? (
          <Route
            path="slides"
            element={
              <Suspense fallback={<p className="empty">Loading…</p>}>
                <SlidesPage />
              </Suspense>
            }
          />
        ) : null}
        {isEnabled('contact') ? (
          <Route
            path="contact"
            element={
              <Suspense fallback={<p className="empty">Loading…</p>}>
                <ContactPage />
              </Suspense>
            }
          />
        ) : null}
        {isEnabled('publications') ? (
          <Route
            path="publications"
            element={
              <Suspense fallback={<p className="empty">Loading…</p>}>
                <PublicationsPage />
              </Suspense>
            }
          />
        ) : null}
        {isEnabled('archive') ? (
          <Route
            path="archive"
            element={
              <Suspense fallback={<p className="empty">Loading…</p>}>
                <ArchivePage />
              </Suspense>
            }
          />
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
        <Route
          path="search"
          element={
            <Suspense fallback={<p className="empty">Loading…</p>}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path="about"
          element={
            <Suspense fallback={<p className="empty">Loading…</p>}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
