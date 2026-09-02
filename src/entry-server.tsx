import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import { App } from './App';
import { ThemeProvider } from './components/ThemeProvider';

export { allRoutes, metaFor } from './lib/route-meta';
export { posts } from './lib/posts';
export { siteConfig } from './site.config';
export { canonicalUrl, withBase } from './lib/urls';
export { loadPostHtml } from './lib/post-content';

/**
 * Renders one route to HTML. `prerenderToNodeStream` waits for suspended
 * boundaries, so lazily loaded routes and post bodies are resolved rather than
 * emitted as their fallbacks.
 */
export async function render(path: string, basename: string): Promise<string> {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <ThemeProvider>
        <StaticRouter location={path} basename={basename === '/' ? undefined : basename}>
          <App />
        </StaticRouter>
      </ThemeProvider>
    </StrictMode>,
  );

  const chunks: Buffer[] = [];
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
