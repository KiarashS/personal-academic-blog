import { describe, expect, it } from 'vitest';
import { personSchema, serialiseJsonLd, structuredDataFor } from '../lib/structured-data';
import { siteConfig } from '../site.config';

describe('personSchema', () => {
  const schema = personSchema();

  it('describes a person at the site root', () => {
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Person');
    expect(schema.url).toBe(`${siteConfig.url}/`);
  });

  it('leaves out what the author record does not fill in', () => {
    for (const [key, value] of Object.entries(schema)) {
      expect(value, `${key} is present but empty`).not.toBe('');
      expect(value, `${key} is present but empty`).not.toEqual([]);
    }
  });

  it('lists the profile links as the same person, and nothing else', () => {
    const sameAs = (schema.sameAs ?? []) as string[];
    for (const href of sameAs) expect(href).toMatch(/^https?:\/\//);
    expect(sameAs.some((href) => href.startsWith('mailto:'))).toBe(false);
  });
});

describe('structuredDataFor', () => {
  it('answers on the front page, with or without its trailing slash', () => {
    expect(structuredDataFor('/')).not.toBeNull();
    expect(structuredDataFor('//')).not.toBeNull();
  });

  it('says nothing anywhere else, so no other page claims to be a person', () => {
    for (const path of ['/blog', '/about', '/blog/writing-a-post', '/tags', '/authors/you']) {
      expect(structuredDataFor(path), path).toBeNull();
    }
  });
});

describe('serialiseJsonLd', () => {
  it('escapes the one character that could end the script element early', () => {
    const json = serialiseJsonLd({ name: '</script><img onerror=alert(1)>' });
    expect(json).not.toContain('</script');
    expect(JSON.parse(json)).toEqual({ name: '</script><img onerror=alert(1)>' });
  });
});
