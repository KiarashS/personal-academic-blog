import { siteConfig } from '../site.config';

const base = import.meta.env.BASE_URL || '/';

/** Path with the deployment's base directory applied, e.g. `/blog/posts/x`. */
export function withBase(path: string): string {
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Absolute URL, for canonical links, Open Graph tags, the feed and BibTeX. */
export function canonicalUrl(path: string): string {
  return `${siteConfig.url.replace(/\/$/, '')}${withBase(path)}`;
}
