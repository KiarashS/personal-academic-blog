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
 * Whether the site uses categories at all: the flag has to be on and there has
 * to be at least one shelf configured, since an empty index is worth no nav
 * entry. It lives here rather than in `categories.ts` so the post index can ask
 * without the two modules importing each other.
 */
export function categoriesEnabled(): boolean {
  return isEnabled('categories') && siteConfig.categories.length > 0;
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
  return filterNav(siteConfig.nav, siteConfig.features)
    .filter((item) => shownIn(item, place) && (place === 'header' || !isNavGroup(item)))
    .map((item) => (item.to === BLOG_INDEX ? { ...item, to: blog } : item));
}
