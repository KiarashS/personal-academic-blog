import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TagPage } from './pages/TagPage';
import { TagsPage } from './pages/TagsPage';
import { AuthorPage } from './pages/AuthorPage';

// KaTeX, highlight.js and the search index are only needed on the routes that
// use them, so they load on navigation instead of on first paint.
const PostPage = lazy(() => import('./pages/PostPage').then((m) => ({ default: m.PostPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="page/:page" element={<HomePage />} />
        <Route
          path="posts/:slug"
          element={
            <Suspense fallback={<p className="empty">Loading…</p>}>
              <PostPage />
            </Suspense>
          }
        />
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
