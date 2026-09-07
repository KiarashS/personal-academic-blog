import { BLOG_INDEX, siteConfig } from '../site.config';
import type { FeatureName, NavItem } from '../site.config';

export function isEnabled(feature: FeatureName): boolean {
  return siteConfig.features[feature] === true;
}

/** Nav entries whose feature is on, or which are not gated at all. */
export function filterNav(nav: NavItem[], features: Record<FeatureName, boolean>): NavItem[] {
  return nav.filter((item) => !item.feature || features[item.feature] === true);
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

/**
 * The nav as rendered: gated entries dropped, and the blog entry pointed at
 * wherever the blog index currently is. The config names it symbolically
 * because the `home` feature is what decides between `/` and `/blog`.
 */
export function visibleNav(): NavItem[] {
  const blog = isEnabled('home') ? '/blog' : '/';
  return filterNav(siteConfig.nav, siteConfig.features).map((item) =>
    item.to === BLOG_INDEX ? { ...item, to: blog } : item,
  );
}
