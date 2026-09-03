import { describe, expect, it } from 'vitest';
import { filterNav } from '../lib/features';
import { siteConfig } from '../site.config';
import type { NavItem } from '../site.config';

const nav: NavItem[] = [
  { label: 'Posts', to: '/' },
  { label: 'Publications', to: '/publications', feature: 'publications' },
  { label: 'About', to: '/about' },
];

describe('filterNav', () => {
  it('keeps a gated entry when its feature is on', () => {
    expect(filterNav(nav, { publications: true }).map((i) => i.to)).toEqual([
      '/',
      '/publications',
      '/about',
    ]);
  });

  it('drops it when the feature is off, leaving ungated entries alone', () => {
    expect(filterNav(nav, { publications: false }).map((i) => i.to)).toEqual(['/', '/about']);
  });
});

describe('siteConfig.nav', () => {
  it('gates every entry that a feature owns, so nav and routing cannot drift', () => {
    const gated = siteConfig.nav.filter((item) => item.feature).map((item) => item.to);
    expect(gated).toContain('/publications');
  });
});
