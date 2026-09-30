import { afterEach, describe, expect, it } from 'vitest';
import {
  archiveEnabled,
  blogEnabled,
  blogWarnings,
  categoriesEnabled,
  isBlogPath,
  navFor,
} from '../lib/features';
import { newsBlogLinks } from '../lib/news';
import { noticeWarnings } from '../lib/notice';
import { allRoutes } from '../lib/route-meta';
import { BLOG_INDEX, siteConfig } from '../site.config';

const features = { ...siteConfig.features };
const nav = siteConfig.nav;
afterEach(() => {
  Object.assign(siteConfig.features, features);
  siteConfig.nav = nav;
});

const set = (blog: boolean, home: boolean) => {
  siteConfig.features.blog = blog;
  siteConfig.features.home = home;
};

describe('blogEnabled', () => {
  it('follows the flag while there is a home page', () => {
    set(true, true);
    expect(blogEnabled()).toBe(true);
    set(false, true);
    expect(blogEnabled()).toBe(false);
  });

  it('keeps the blog when there is no home page to stand in for it, and says so', () => {
    set(false, false);
    expect(blogEnabled()).toBe(true);
    expect(blogWarnings()).toHaveLength(1);
    expect(blogWarnings()[0]).toMatch(/home/);
  });

  it('says nothing when the two agree', () => {
    set(true, false);
    expect(blogWarnings()).toEqual([]);
    set(false, true);
    expect(blogWarnings()).toEqual([]);
  });

  it('takes the archive and categories with it', () => {
    siteConfig.features.archive = true;
    siteConfig.features.categories = true;
    set(false, true);
    expect(archiveEnabled()).toBe(false);
    expect(categoriesEnabled()).toBe(false);
  });
});

describe('isBlogPath', () => {
  it('knows the blog and the pages made of posts', () => {
    for (const path of [
      BLOG_INDEX,
      '/blog',
      '/blog/a-post',
      '/posts/a-post',
      '/tags',
      '/tags/guide',
      '/categories/x',
      '/archive',
      '/search',
    ]) {
      expect(isBlogPath(path)).toBe(true);
    }
  });

  it('leaves everything else alone', () => {
    for (const path of [
      '/',
      '/about',
      '/blogroll',
      '/research',
      'https://example.org/blog',
      undefined,
    ]) {
      expect(isBlogPath(path)).toBe(false);
    }
  });
});

describe('the site without a blog', () => {
  it('drops every nav link into the blog, in groups too', () => {
    siteConfig.nav = [
      { label: 'Blog', to: BLOG_INDEX },
      { label: 'About', to: '/about' },
      { label: 'Tags', to: '/tags', place: 'both' },
      {
        label: 'More',
        items: [
          { label: 'A post', to: '/blog/x' },
          { label: 'CV', to: '/cv' },
        ],
      },
    ];
    set(false, true);
    expect(navFor('header').map((item) => item.label)).toEqual(['About', 'More']);
    expect(navFor('header')[1].items?.map((item) => item.label)).toEqual(['CV']);
    expect(navFor('footer').map((item) => item.label)).toEqual([]);
  });

  it('builds no blog routes', () => {
    set(false, true);
    const routes = allRoutes();
    expect(routes).toContain('/');
    expect(routes.some((route) => isBlogPath(route))).toBe(false);
    expect(routes).toContain('/authors/you');
  });

  it('names news and notice links into the blog', () => {
    expect(
      newsBlogLinks(
        [{ date: '2026-01-01', text: 'Wrote [a post](/blog/x)', href: '/tags/y' }],
        false,
      ),
    ).toHaveLength(2);
    expect(newsBlogLinks([{ date: '2026-01-01', text: 'Wrote [a post](/blog/x)' }], true)).toEqual(
      [],
    );

    set(false, true);
    const warnings = noticeWarnings(
      {
        ...siteConfig.notice,
        text: 'See [the post](/blog/x)',
        on: ['post'],
        until: '',
      },
      '2026-09-30',
    );
    expect(warnings.some((w) => /links to \/blog\/x/.test(w))).toBe(true);
    expect(warnings.some((w) => /shown nowhere/.test(w))).toBe(true);
  });
});
