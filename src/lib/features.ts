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
  return filterNav(siteConfig.nav, siteConfig.features);
}
