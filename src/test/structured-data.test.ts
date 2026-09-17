import { describe, expect, it } from 'vitest';
import {
  personSchema,
  postSchema,
  serialiseJsonLd,
  structuredDataFor,
} from '../lib/structured-data';
import { siteConfig } from '../site.config';
import { posts } from '../lib/posts';
import { postPath } from '../lib/routes';

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

describe('postSchema', () => {
  const post = posts[0];
  const schema = postSchema(post);

  it('describes the post as a BlogPosting at its own URL', () => {
    expect(schema['@type']).toBe('BlogPosting');
    expect(schema.url).toBe(`${siteConfig.url}${postPath(post.slug)}`);
    expect(schema.mainEntityOfPage).toBe(schema.url);
    expect(schema.headline).toBe(post.title);
  });

  it('carries both dates, and says so even when nothing was revised', () => {
    expect(schema.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(schema.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const never = postSchema({ ...post, updated: undefined });
    expect(never.dateModified).toBe(never.datePublished);
  });

  it('names the same person the front page does, by id', () => {
    const owner = (personSchema() as { '@id': string })['@id'];
    const authors = schema.author as { '@id': string; name: string }[];
    expect(authors.length).toBe(post.authors.length);
    expect(authors.map((person) => person['@id'])).toContain(owner);
    for (const person of authors) expect(person.name).toBeTruthy();
  });

  it('points at the social card the build renders for it', () => {
    expect(schema.image).toBe(`${siteConfig.url}/og/${post.slug}.png`);
  });

  it('claims nothing it has no value for', () => {
    for (const [key, value] of Object.entries(schema)) {
      expect(value, `${key} is present but empty`).not.toBe('');
      expect(value, `${key} is present but empty`).not.toEqual([]);
      expect(value, `${key} is present but undefined`).toBeDefined();
    }
  });

  it("does not put the accompanying paper's DOI on the post itself", () => {
    const withDoi = posts.find((candidate) => candidate.publication?.doi ?? candidate.doi);
    expect(withDoi, 'no post in the sample has a DOI to check').toBeDefined();
    const json = JSON.stringify(postSchema(withDoi!));
    expect(json).not.toContain('doi.org');
    expect(json).not.toContain('identifier');
  });
});

describe('structuredDataFor', () => {
  it('answers on the front page, with or without its trailing slash', () => {
    expect(structuredDataFor('/')).not.toBeNull();
    expect(structuredDataFor('//')).not.toBeNull();
  });

  it('gives every post its own block', () => {
    for (const post of posts) {
      const data = structuredDataFor(postPath(post.slug));
      expect(data, post.slug).not.toBeNull();
      expect(data?.['@type'], post.slug).toBe('BlogPosting');
    }
  });

  it('says nothing on a list, so no index claims to be a person or a post', () => {
    for (const path of ['/blog', '/about', '/tags', '/authors/you', '/blog/page/2']) {
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
