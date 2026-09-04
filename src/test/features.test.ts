import { describe, expect, it } from 'vitest';
import { filterNav } from '../lib/features';
import { siteConfig } from '../site.config';
import type { NavItem } from '../site.config';

const nav: NavItem[] = [
  { label: 'Posts', to: '/' },
  { label: 'Publications', to: '/publications', feature: 'publications' },
  { label: 'Archive', to: '/archive', feature: 'archive' },
  { label: 'About', to: '/about' },
];

const all = { publications: true, archive: true, categories: true };
const none = { publications: false, archive: false, categories: false };

describe('filterNav', () => {
  it('keeps gated entries when their features are on', () => {
    expect(filterNav(nav, all).map((i) => i.to)).toEqual([
      '/',
      '/publications',
      '/archive',
      '/about',
    ]);
  });

  it('drops them when the features are off, leaving ungated entries alone', () => {
    expect(filterNav(nav, none).map((i) => i.to)).toEqual(['/', '/about']);
  });

  it('gates each feature independently', () => {
    const some = { publications: false, archive: true, categories: false };
    expect(filterNav(nav, some).map((i) => i.to)).toEqual(['/', '/archive', '/about']);
  });
});

describe('siteConfig.nav', () => {
  it('gates every entry that a feature owns, so nav and routing cannot drift', () => {
    const gated = siteConfig.nav.filter((item) => item.feature).map((item) => item.to);
    expect(gated).toEqual(expect.arrayContaining(['/publications', '/archive', '/categories']));
  });
});
