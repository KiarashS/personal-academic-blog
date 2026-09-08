import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { registerPage } from './lib/page-registry';
import { allContentSlugs, postBody } from './lib/post-content';
import { AboutPage, aboutBody } from './pages/AboutPage';
import { ArchivePage } from './pages/ArchivePage';
import { ContactPage, contactBody } from './pages/ContactPage';
import { HomePage, homeBody } from './pages/HomePage';
import { PostPage } from './pages/PostPage';
import { PublicationsPage } from './pages/PublicationsPage';
import { SearchPage } from './pages/SearchPage';
import { SlidesPage } from './pages/SlidesPage';

/*
 * The routes `App` loads lazily, handed over eagerly. Nothing here suspends, so
 * React writes each page into the shell rather than leaving a fallback there
 * and appending the real markup in a hidden block for a script to swap in — the
 * arrangement that left a reader with JavaScript off looking at the word
 * "Loading…" on the front page and on every post. This file is the server's
 * alone, so the reader's bundle still splits these apart.
 */
registerPage('AboutPage', AboutPage);
registerPage('ArchivePage', ArchivePage);
registerPage('ContactPage', ContactPage);
registerPage('HomePage', HomePage);
registerPage('PostPage', PostPage);
registerPage('PublicationsPage', PublicationsPage);
registerPage('SearchPage', SearchPage);
registerPage('SlidesPage', SlidesPage);

export { allRoutes, metaFor } from './lib/route-meta';
export { posts, postsByTag, tagCounts } from './lib/posts';
export { categoryCounts, postsInCategory } from './lib/categories';
export { tagSlug } from './lib/format';
export { siteConfig } from './site.config';
export { canonicalUrl, withBase } from './lib/urls';
export { blogIndexPath, postPath, postSlugFromPath } from './lib/routes';
export { loadPostHtml } from './lib/post-content';
export { serialiseJsonLd, structuredDataFor } from './lib/structured-data';

/**
 * Every body the pages read, loaded before anything is rendered. After this a
 * resource answers synchronously, so no boundary in the tree suspends.
 */
async function warmContent(): Promise<void> {
  await Promise.all([
    homeBody.warm(),
    aboutBody.warm(),
    contactBody.warm(),
    ...allContentSlugs().map((slug) => postBody(slug).warm()),
  ]);
}

export async function render(path: string, basename: string): Promise<string> {
  await warmContent();

  return renderToString(
    <StrictMode>
      <ThemeProvider>
        <StaticRouter location={path} basename={basename === '/' ? undefined : basename}>
          <App />
        </StaticRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}
