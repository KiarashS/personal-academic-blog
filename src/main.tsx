import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
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
 * A deploy replaces every hashed chunk, so a tab left open across one asks for
 * files that are no longer there and the route it was navigating to fails to
 * load. Vite reports that as `vite:preloadError`; the page is reloaded once to
 * pick up the new build. The flag makes it once — if the chunk is missing for
 * some other reason, a reload loop would be worse than the error.
 */
window.addEventListener('vite:preloadError', () => {
  const key = 'reloaded-after-preload-error';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  window.location.reload();
});

window.addEventListener('load', () => {
  window.setTimeout(() => sessionStorage.removeItem('reloaded-after-preload-error'), 5000);
});

/*
 * The service worker is what lets a browser offer "install" and what keeps the
 * site readable offline. It is registered only in a build: in development it
 * would serve yesterday's bundle back to you. Registration failing is not worth
 * bothering the reader about — the site works without it.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  });
}

// Pages are prerendered, so the usual path is hydration; `createRoot` is the
// fallback for a dev server or a route that was not written out.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
