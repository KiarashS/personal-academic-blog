import { describe, expect, it } from 'vitest';
import { metaFor } from '../lib/route-meta';
import { siteConfig } from '../site.config';

describe('metaFor on the front page', () => {
  it('describes the person, not the writing', () => {
    // The two are deliberately different strings: the site's own description is
    // what the blog is, and a link to `/` previews a page about someone.
    expect(metaFor('/').description).toBe(siteConfig.home.description);
    expect(metaFor('/blog').description).toBe(siteConfig.description);
  });

  it('falls back to the site description when the front page has none', () => {
    const own = siteConfig.home.description;
    siteConfig.home.description = '';
    try {
      expect(metaFor('/').description).toBe(siteConfig.description);
    } finally {
      siteConfig.home.description = own;
    }
  });
});

describe('an optional page', () => {
  it('is written out and titled while its feature is on', async () => {
    const { allRoutes, metaFor } = await import('../lib/route-meta');
    expect(allRoutes()).toContain('/about');
    expect(metaFor('/about').title).toContain('About');
  });

  it('is absent from the build and answers as not found when it is off', async () => {
    const { siteConfig } = await import('../site.config');
    const { allRoutes, metaFor } = await import('../lib/route-meta');

    siteConfig.features.about = false;
    try {
      expect(allRoutes()).not.toContain('/about');
      // The catch-all below it, rather than a page with no route behind it.
      expect(metaFor('/about').title).toContain('Not found');
    } finally {
      siteConfig.features.about = true;
    }
  });
});

describe('a tag no post carries', () => {
  it('is "Not found", like any other address that names nothing', () => {
    expect(metaFor('/tags/no-such-tag').title).toMatch(/^Not found/);
    expect(metaFor('/tags/no-such-tag/page/2').title).toMatch(/^Not found/);
  });

  it('leaves a used tag and the index alone', () => {
    expect(metaFor('/tags/guide').title).toMatch(/Tagged/);
    expect(metaFor('/tags').title).toMatch(/^Tags/);
  });
});

describe('a category with nothing in it', () => {
  const on = siteConfig.features.categories;
  const restore = () => {
    siteConfig.features.categories = on;
  };

  it('is "Not found", while a filled one and the index keep their titles', () => {
    siteConfig.features.categories = true;
    try {
      expect(metaFor('/categories/ai-in-healthcare').title).toMatch(/^Not found/);
      expect(metaFor('/categories/no-such-shelf').title).toMatch(/^Not found/);
      expect(metaFor('/categories/tutorials').title).toMatch(/^Tutorials/);
      expect(metaFor('/categories').title).toMatch(/^Categories/);
    } finally {
      restore();
    }
  });
});
