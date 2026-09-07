import { isEnabled } from './features';

export { BLOG_INDEX } from '../site.config';

/**
 * Slugs a post may not use, because something else already answers on that
 * path under the blog. Short list by design: keeping tags, categories and the
 * archive at the top level is what keeps it to one word.
 */
export const RESERVED_SLUGS = new Set(['page', 'feed.xml']);

/**
 * The blog's own root. With a home page the blog moves aside to `/blog` and
 * the front page is the site's; without one the blog is the site, and its
 * index is the front page.
 */
export function blogIndexPath(): string {
  return isEnabled('home') ? '/blog' : '/';
}

/**
 * A post's path. It sits under the blog index when there is a home page and
 * under `/posts` when the blog is the whole site, so the list and its items
 * always share a parent rather than living in two branches of the tree.
 */
export function postPath(slug: string): string {
  return isEnabled('home') ? `/blog/${slug}` : `/posts/${slug}`;
}

/** Page one is the index itself; a numbered page hangs off it. */
export function blogPagePath(page: number): string {
  if (page <= 1) return blogIndexPath();
  return isEnabled('home') ? `/blog/page/${page}` : `/page/${page}`;
}

/**
 * The slug of the post a path names, or nothing if it names something else.
 * The prerenderer and the sitemap both ask this of a route they did not build.
 */
export function postSlugFromPath(path: string): string | undefined {
  const prefix = isEnabled('home') ? '/blog/' : '/posts/';
  if (!path.startsWith(prefix)) return undefined;
  const rest = path.slice(prefix.length);
  return rest && !rest.includes('/') && !RESERVED_SLUGS.has(rest) ? rest : undefined;
}
