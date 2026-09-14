import { describe, expect, it } from 'vitest';
import { PROFILE_ICONS } from '../lib/profile-icons';
import { profileLinks } from '../lib/profiles';
import type { Author } from '../lib/types';

/** Every service `profileLinks` knows how to build, filled with a stub value. */
const everything: Author = {
  id: 'everything',
  name: 'Everything',
  email: 'a@b.c',
  cv: '/cv.pdf',
  links: {
    orcid: '0000-0002-1825-0097',
    scholar: 'x',
    semanticScholar: '1',
    arxiv: 'x_y_1',
    github: 'x',
    linkedin: 'x',
    mastodon: '@x@y.z',
    bluesky: 'x.bsky.social',
    website: 'example.org',
  },
};

describe('PROFILE_ICONS', () => {
  it('has a glyph for every link the profile row can render', () => {
    // The row puts an icon beside each link, so a service added to `profiles.ts`
    // without one here would render a word with a hole next to it.
    const missing = profileLinks(everything)
      .map((link) => link.key)
      .filter((key) => !PROFILE_ICONS[key]);
    expect(missing).toEqual([]);
  });

  it('draws each one on the same 24-unit grid the rest of the icons use', () => {
    for (const [key, icon] of Object.entries(PROFILE_ICONS)) {
      expect(icon.path.length, key).toBeGreaterThan(10);
      expect(['mark', 'line'], key).toContain(icon.kind);

      // Magnitudes, not coordinates: a relative command's numbers are deltas,
      // and a negative one is ordinary. Either way nothing inside a 24-unit box
      // is bigger than the box. A glyph drawn on a 512-unit grid would render
      // as one enormous corner of itself, and this is what catches that.
      const numbers = (icon.path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
      expect(numbers.length, key).toBeGreaterThan(0);
      expect(Math.max(...numbers.map(Math.abs)), key).toBeLessThanOrEqual(24);
    }
  });

  it('keeps the services that have a mark of their own on their mark', () => {
    for (const key of ['orcid', 'scholar', 'semanticScholar', 'arxiv', 'github'] as const) {
      expect(PROFILE_ICONS[key].kind, key).toBe('mark');
    }
  });
});
