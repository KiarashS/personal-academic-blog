import { describe, expect, it } from 'vitest';
import { buildPost } from '../lib/post-builder';
import { licenseWarnings, resolveLicense, siteRights } from '../lib/license';
import { postSchema } from '../lib/structured-data';
import { siteConfig } from '../site.config';

describe('resolveLicense', () => {
  it('links a licence it knows by name, however it is written', () => {
    const deed = 'https://creativecommons.org/licenses/by-sa/4.0/';
    expect(resolveLicense('CC BY-SA 4.0')).toEqual({ name: 'CC BY-SA 4.0', url: deed });
    expect(resolveLicense('CC-BY-SA-4.0')).toEqual({ name: 'CC BY-SA 4.0', url: deed });
    expect(resolveLicense('cc by-sa 4.0')).toEqual({ name: 'CC BY-SA 4.0', url: deed });
    expect(resolveLicense('CC0-1.0')?.url).toBe(
      'https://creativecommons.org/publicdomain/zero/1.0/',
    );
    expect(resolveLicense('mit')).toEqual({
      name: 'MIT',
      url: 'https://opensource.org/license/mit',
    });
  });

  it('keeps a name it does not know, without a link', () => {
    expect(resolveLicense('CC BY 3.0')).toEqual({ name: 'CC BY 3.0' });
    expect(resolveLicense('All rights reserved')).toEqual({ name: 'All rights reserved' });
  });

  it('takes a name and an address, and fills the address in for a known name', () => {
    expect(resolveLicense({ name: 'Custom', url: 'https://example.org/terms' })).toEqual({
      name: 'Custom',
      url: 'https://example.org/terms',
    });
    expect(resolveLicense({ name: 'CC BY 4.0' })?.url).toBe(
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  it('reads nothing from an empty or unreadable value', () => {
    for (const value of ['', '  ', 4, true, [], {}, { url: 'https://x.org' }, null, undefined]) {
      expect(resolveLicense(value)).toBeUndefined();
    }
  });
});

describe('licenseWarnings', () => {
  it('is quiet for a licence it can read and link, or none at all', () => {
    expect(licenseWarnings('p', undefined)).toEqual([]);
    expect(licenseWarnings('p', 'CC BY-NC 4.0')).toEqual([]);
    expect(licenseWarnings('p', 'All rights reserved')).toEqual([]);
    expect(licenseWarnings('p', { name: 'Custom', url: 'https://example.org' })).toEqual([]);
  });

  it('says so for a value it cannot read, and for a name it cannot link', () => {
    expect(licenseWarnings('p', 4)[0]).toContain("is under the site's");
    expect(licenseWarnings('p', 'CC BY 3.0')[0]).toContain('without a link');
  });
});

describe("a post's licence", () => {
  const post = (front: string) =>
    buildPost({
      path: 'src/content/posts/2026-01-01-a.md',
      raw: `---\ntitle: A\n${front}---\nBody.`,
    });

  it('is absent unless the frontmatter names one', () => {
    expect(post('').meta.license).toBeUndefined();
    expect(post('license: CC BY-NC 4.0\n').meta.license).toEqual({
      name: 'CC BY-NC 4.0',
      url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    });
  });
});

describe('the licence in structured data and feeds', () => {
  it("names the site's content licence by its deed", () => {
    expect(siteConfig.license.content).toBe('CC BY 4.0');
    const schema = postSchema({
      slug: 'a',
      title: 'A',
      date: '2026-01-01',
      authors: [],
      tags: [],
    } as never);
    expect(schema.license).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it("writes both of the site's licences into a feed's rights", () => {
    const rights = siteRights('2026');
    expect(rights).toContain(
      'Text and figures: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    );
    expect(rights).toContain('code: MIT (https://opensource.org/license/mit)');
  });
});
