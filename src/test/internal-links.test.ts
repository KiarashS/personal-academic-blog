import { describe, expect, it } from 'vitest';
import { routerPath, shouldRoute } from '../lib/internal-links';
import type { LinkTarget } from '../lib/internal-links';

const SITE = 'https://blog.example.org';

const anchor = (href: string, overrides: Partial<LinkTarget> = {}): LinkTarget => {
  const url = new URL(href, `${SITE}/`);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    origin: url.origin,
    target: '',
    getAttribute: (name) => (name === 'href' ? href : null),
    hasAttribute: () => false,
    ...overrides,
  };
};

const click = (overrides: Partial<MouseEvent> = {}) =>
  ({
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  }) as MouseEvent;

describe('routerPath', () => {
  it('hands the router the path it understands', () => {
    expect(routerPath(anchor('/blog'), '/')).toBe('/blog');
    expect(routerPath(anchor('/blog?q=1#top'), '/')).toBe('/blog?q=1#top');
  });

  it('strips the deployment base, which the router adds back', () => {
    expect(routerPath(anchor('/personal-academic-blog/blog'), '/personal-academic-blog/')).toBe(
      '/blog',
    );
    expect(routerPath(anchor('/personal-academic-blog/'), '/personal-academic-blog/')).toBe('/');
  });

  it('leaves a path that does not start with the base alone', () => {
    expect(routerPath(anchor('/elsewhere'), '/personal-academic-blog/')).toBe('/elsewhere');
  });
});

describe('shouldRoute', () => {
  it('routes a plain left click on an internal link', () => {
    expect(shouldRoute(anchor('/blog'), click(), SITE)).toBe(true);
  });

  it('leaves another origin to the browser', () => {
    expect(shouldRoute(anchor('https://profile.example.org/'), click(), SITE)).toBe(false);
  });

  it('leaves a modified or middle click alone, so new tabs still work', () => {
    expect(shouldRoute(anchor('/blog'), click({ metaKey: true }), SITE)).toBe(false);
    expect(shouldRoute(anchor('/blog'), click({ ctrlKey: true }), SITE)).toBe(false);
    expect(shouldRoute(anchor('/blog'), click({ shiftKey: true }), SITE)).toBe(false);
    expect(shouldRoute(anchor('/blog'), click({ button: 1 }), SITE)).toBe(false);
  });

  it('leaves a link that asks for another tab, or a download', () => {
    expect(shouldRoute(anchor('/blog', { target: '_blank' }), click(), SITE)).toBe(false);
    expect(shouldRoute(anchor('/cv.pdf', { hasAttribute: () => true }), click(), SITE)).toBe(false);
  });

  it('leaves a bare fragment to whatever handles anchors on the page', () => {
    expect(shouldRoute(anchor('#setup'), click(), SITE)).toBe(false);
  });

  it('leaves a click another handler has already taken', () => {
    expect(shouldRoute(anchor('/blog'), click({ defaultPrevented: true }), SITE)).toBe(false);
  });
});
