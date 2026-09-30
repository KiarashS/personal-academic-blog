import { BLOG_INDEX, siteConfig } from '../site.config';
import type { FeatureName, NavItem, NavPlace } from '../site.config';

export function isEnabled(feature: FeatureName): boolean {
  return siteConfig.features[feature] === true;
}

/**
 * Nav entries whose feature is on, or which are not gated at all. A group is
 * filtered the same way and then again inside: a group is a label for its
 * entries, so one with none left is a label for nothing and goes too.
 */
export function filterNav(nav: NavItem[], features: Record<FeatureName, boolean>): NavItem[] {
  return nav
    .filter((item) => !item.feature || features[item.feature] === true)
    .map((item) => (item.items ? { ...item, items: filterNav(item.items, features) } : item))
    .filter((item) => !item.items || item.items.length > 0);
}

/** Whether an entry is a group of links rather than a link. */
export function isNavGroup(item: NavItem): item is NavItem & { items: NavItem[] } {
  return Array.isArray(item.items) && item.items.length > 0;
}

/** A link that leaves the app: another site, or a page React does not render. */
export function isExternal(to: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(to) || to.startsWith('//');
}

/**
 * Whether the site has a blog. `blog: false` takes the posts away and with
 * them every page made of posts, which only works if something else stands at
 * `/`: with the home page off, the blog *is* the front page, so it stays on
 * and `blogWarnings` says why rather than leaving the site with no front page.
 */
export function blogEnabled(): boolean {
  return isEnabled('blog') || !isEnabled('home');
}

/** What the build should say about the blog switch. */
export function blogWarnings(): string[] {
  if (isEnabled('blog') || isEnabled('home')) return [];
  return [
    'blog: `features.blog` is off but `features.home` is too, and without a home ' +
      'page the blog is the front page. The blog stays on; turn `home` on to ' +
      'take it away.',
  ];
}

/**
 * Paths that only exist while there is a blog: its index wherever it lives,
 * the posts under it, and the pages made of posts. A nav entry pointing at one
 * goes with the blog, whatever feature it names.
 */
const BLOG_PATH = /^\/(?:blog|posts|tags|categories|archive|search)(?:\/|$)/;

export function isBlogPath(to: string | undefined): boolean {
  return to === BLOG_INDEX || (to !== undefined && BLOG_PATH.test(to));
}

/** Whether the archive exists: its own flag, and a blog to be the archive of. */
export function archiveEnabled(): boolean {
  return isEnabled('archive') && blogEnabled();
}

/**
 * Whether the site uses categories at all: the flag has to be on, there has to
 * be at least one shelf configured, since an empty index is worth no nav
 * entry, and there has to be a blog for the shelves to hold. It lives here
 * rather than in `categories.ts` so the post index can ask without the two
 * modules importing each other.
 */
export function categoriesEnabled(): boolean {
  return isEnabled('categories') && siteConfig.categories.length > 0 && blogEnabled();
}

/** Whether an entry belongs in `place`. Unset means the header. */
export function shownIn(item: NavItem, place: NavPlace): boolean {
  const where = item.place ?? 'header';
  return where === place || where === 'both';
}

/**
 * The nav as rendered, for one place: gated entries dropped, and the blog entry
 * pointed at wherever the blog index currently is. The config names that one
 * symbolically because the `home` feature is what decides between `/` and
 * `/blog`.
 *
 * Groups are header-only. A group is a label with a popover under it, and a
 * footer line has nowhere to put one, so asking for the footer drops them
 * rather than flattening them — flattened, the label that explained the links
 * is the one thing that goes missing.
 */
export function navFor(place: NavPlace): NavItem[] {
  const blog = isEnabled('home') ? '/blog' : '/';
  const nav = blogEnabled() ? siteConfig.nav : withoutBlog(siteConfig.nav);
  return filterNav(nav, siteConfig.features)
    .filter((item) => shownIn(item, place) && (place === 'header' || !isNavGroup(item)))
    .map((item) => (item.to === BLOG_INDEX ? { ...item, to: blog } : item));
}

/** The nav with every link into the blog taken out, inside groups as well. */
function withoutBlog(nav: NavItem[]): NavItem[] {
  return nav
    .filter((item) => !isBlogPath(item.to))
    .map((item) => (item.items ? { ...item, items: withoutBlog(item.items) } : item));
}
