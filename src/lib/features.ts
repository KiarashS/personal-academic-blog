import { siteConfig } from '../site.config';
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

export function visibleNav(): NavItem[] {
  return filterNav(siteConfig.nav, siteConfig.features);
}
