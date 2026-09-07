import { afterEach, describe, expect, it, vi } from 'vitest';

// The helpers read the feature flags at call time, so each test says which
// shape of site it is describing rather than depending on the shipped config.
const withHome = async (home: boolean) => {
  vi.resetModules();
  vi.doMock('../lib/features', () => ({
    isEnabled: (feature: string) => (feature === 'home' ? home : false),
  }));
  return import('../lib/routes');
};

afterEach(() => {
  vi.doUnmock('../lib/features');
  vi.resetModules();
});

describe('paths without a home page: the blog is the site', () => {
  it('puts the index at the root and its pages beside it', async () => {
    const { blogIndexPath, blogPagePath } = await withHome(false);
    expect(blogIndexPath()).toBe('/');
    expect(blogPagePath(1)).toBe('/');
    expect(blogPagePath(2)).toBe('/page/2');
  });

  it('keeps posts under /posts', async () => {
    const { postPath, postSlugFromPath } = await withHome(false);
    expect(postPath('writing-a-post')).toBe('/posts/writing-a-post');
    expect(postSlugFromPath('/posts/writing-a-post')).toBe('writing-a-post');
    expect(postSlugFromPath('/blog/writing-a-post')).toBeUndefined();
  });
});

describe('paths with a home page: the blog moves aside', () => {
  it('puts the index and its pages under /blog', async () => {
    const { blogIndexPath, blogPagePath } = await withHome(true);
    expect(blogIndexPath()).toBe('/blog');
    expect(blogPagePath(1)).toBe('/blog');
    expect(blogPagePath(2)).toBe('/blog/page/2');
  });

  it('keeps a post under the index it belongs to', async () => {
    const { postPath, postSlugFromPath } = await withHome(true);
    expect(postPath('writing-a-post')).toBe('/blog/writing-a-post');
    expect(postSlugFromPath('/blog/writing-a-post')).toBe('writing-a-post');
    expect(postSlugFromPath('/posts/writing-a-post')).toBeUndefined();
  });

  it('does not read a numbered page as a post', async () => {
    const { postSlugFromPath } = await withHome(true);
    expect(postSlugFromPath('/blog/page')).toBeUndefined();
    expect(postSlugFromPath('/blog/page/2')).toBeUndefined();
  });

  it('reads nothing out of the index itself', async () => {
    const { postSlugFromPath } = await withHome(true);
    expect(postSlugFromPath('/blog')).toBeUndefined();
    expect(postSlugFromPath('/blog/')).toBeUndefined();
  });
});

describe('reserved slugs', () => {
  it('names what a post may not be called under the blog', async () => {
    const { RESERVED_SLUGS } = await withHome(true);
    expect([...RESERVED_SLUGS].sort()).toEqual(['feed.xml', 'page']);
  });
});
