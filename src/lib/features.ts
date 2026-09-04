import { siteConfig } from '../site.config';
import type { FeatureName, NavItem } from '../site.config';

export function isEnabled(feature: FeatureName): boolean {
  return siteConfig.features[feature] === true;
}

/** Nav entries whose feature is on, or which are not gated at all. */
export function filterNav(nav: NavItem[], features: Record<FeatureName, boolean>): NavItem[] {
  return nav.filter((item) => !item.feature || features[item.feature] === true);
}

export function visibleNav(): NavItem[] {
  // Categories are not a feature flag: they exist if any are configured, and
  // the entry would otherwise lead to a page listing nothing.
  const nav =
    siteConfig.categories.length > 0
      ? siteConfig.nav
      : siteConfig.nav.filter((item) => item.to !== '/categories');

  return filterNav(nav, siteConfig.features);
}
