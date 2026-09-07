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
