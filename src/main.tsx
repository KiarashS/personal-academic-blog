import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { looksLikeMissingChunk, recoverFromMissingChunk } from './lib/recover';
import { syncServiceWorker } from './lib/pwa-client';
import { siteConfig } from './site.config';
import { ThemeProvider } from './components/ThemeProvider';
import 'katex/dist/katex.min.css';
import './styles/fonts.css';
import './styles/global.css';
import './styles/prose.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const tree = (
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);

/*
 * A chunk that is no longer on the server, because a deploy replaced it while
 * this tab was open. Vite reports the ones it preloads as `vite:preloadError`;
 * a plain `import()` that the preload helper did not wrap surfaces instead as
 * an unhandled rejection, so both are listened for. `RouteBoundary` calls the
 * same recovery for anything that gets as far as a render.
 */
window.addEventListener('vite:preloadError', () => {
  void recoverFromMissingChunk();
});

window.addEventListener('unhandledrejection', (event) => {
  if (looksLikeMissingChunk(event.reason)) void recoverFromMissingChunk();
});

/*
 * The service worker is what lets a browser offer "install" and what keeps the
 * site readable offline. Only in a build: in development it would serve
 * yesterday's bundle back to you.
 *
 * This runs whether or not the feature is on, because both answers need doing.
 * With `pwa.enabled` off it unregisters the worker and clears the caches a
 * returning reader still has, which is the only thing that actually retires an
 * installed copy of the site.
 */
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void syncServiceWorker(siteConfig.pwa.enabled, import.meta.env.BASE_URL);
  });
}

/*
 * Pages are prerendered, so the usual path is hydration; `createRoot` is for a
 * dev server, and for 404.html. The host serves that one file for every
 * address it has no page for, so its markup is the not-found page whatever the
 * address was: a missing post renders "No such post", a tag nobody uses renders
 * a tag page, and hydrating either against it failed with React error #418
 * and a redraw. The prerender marks its root `data-fallback`, and React renders
 * the page the address asks for over the top, as it would on a dev server.
 */
if (container.hasChildNodes() && !container.hasAttribute('data-fallback')) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
