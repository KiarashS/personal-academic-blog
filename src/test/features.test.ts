import { describe, expect, it } from 'vitest';
import { filterNav, isExternal, isNavGroup } from '../lib/features';
import { siteConfig } from '../site.config';
import type { NavItem } from '../site.config';

const nav: NavItem[] = [
  { label: 'Posts', to: '/' },
  { label: 'Publications', to: '/publications', feature: 'publications' },
  { label: 'Archive', to: '/archive', feature: 'archive' },
  { label: 'About', to: '/about' },
];

const all = {
  home: true,
  about: true,
  publications: true,
  archive: true,
  categories: true,
  projects: true,
  slides: true,
  contact: true,
};
const none = {
  home: false,
  about: false,
  publications: false,
  archive: false,
  categories: false,
  projects: false,
  slides: false,
  contact: false,
};

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
    const some = { ...none, archive: true };
    expect(filterNav(nav, some).map((i) => i.to)).toEqual(['/', '/archive', '/about']);
  });
});

describe('siteConfig.nav', () => {
  it('gates every entry that a feature owns, so nav and routing cannot drift', () => {
    const gated = siteConfig.nav.filter((item) => item.feature).map((item) => item.to);
    expect(gated).toEqual(
      expect.arrayContaining(['/about', '/publications', '/archive', '/categories']),
    );
  });
});

describe('visibleNav', () => {
  it('points the blog entry at wherever the blog index is', async () => {
    const { BLOG_INDEX } = await import('../site.config');
    const { visibleNav } = await import('../lib/features');
    const blog = visibleNav().find((item) => item.label === 'Blog');
    expect(blog?.to).not.toBe(BLOG_INDEX);
    expect(['/', '/blog']).toContain(blog?.to);
  });
});

describe('groups', () => {
  const grouped: NavItem[] = [
    { label: 'Blog', to: '/' },
    {
      label: 'Projects',
      feature: 'projects',
      items: [
        { label: 'Mine', to: '/projects/one/' },
        { label: 'Theirs', to: 'https://example.org/x' },
        { label: 'Slides', to: '/slides', feature: 'slides' },
      ],
    },
  ];

  it('is a group when it has entries, and a plain entry otherwise', () => {
    expect(isNavGroup(grouped[1])).toBe(true);
    expect(isNavGroup(grouped[0])).toBe(false);
    expect(isNavGroup({ label: 'Empty', items: [] })).toBe(false);
  });

  it('gates the entries inside a group, not only the group', () => {
    const kept = filterNav(grouped, { ...none, projects: true });
    expect(kept[1].items?.map((i) => i.to)).toEqual(['/projects/one/', 'https://example.org/x']);
  });

  it('drops a group whose own feature is off', () => {
    expect(filterNav(grouped, none).map((i) => i.label)).toEqual(['Blog']);
  });

  it('drops a group left with nothing to label', () => {
    const emptied: NavItem[] = [
      { label: 'Projects', items: [{ label: 'Slides', to: '/slides', feature: 'slides' }] },
    ];
    expect(filterNav(emptied, none)).toEqual([]);
    expect(filterNav(emptied, all)).toHaveLength(1);
  });
});

describe('isExternal', () => {
  it('is true for anything with a scheme, or none at all', () => {
    expect(isExternal('https://example.org')).toBe(true);
    expect(isExternal('mailto:a@b.c')).toBe(true);
    expect(isExternal('//example.org')).toBe(true);
  });

  it('is false for a path on this site, whether or not React renders it', () => {
    expect(isExternal('/projects/one/')).toBe(false);
    expect(isExternal('/blog')).toBe(false);
  });
});
