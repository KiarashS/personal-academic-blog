import { parseFrontmatter } from './frontmatter';
import { excerpt, readingMinutes, toPlainText } from './markdown-text';
import { getAuthors } from '../content/authors';
import type { Post, PostFrontmatter } from './types';

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export function slugFromPath(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.mdx?$/, '').replace(DATE_PREFIX, '');
}

/** Falls back to the filename's date prefix when frontmatter omits `date`. */
function dateFromPath(path: string): string {
  const base = path.split('/').pop() ?? '';
  const match = DATE_PREFIX.exec(base);
  return match ? match[0].slice(0, 10) : '';
}

export interface RawPost {
  path: string;
  raw: string;
}

export function buildPost({ path, raw }: RawPost): Post & { draft: boolean } {
  const { data, content } = parseFrontmatter<PostFrontmatter>(raw);
  const plainText = toPlainText(content);

  return {
    slug: data.slug ?? slugFromPath(path),
    title: data.title ?? slugFromPath(path),
    date: data.date ?? dateFromPath(path),
    updated: data.updated,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    authors: getAuthors(data.authors),
    summary: data.summary ?? excerpt(plainText),
    body: content,
    plainText,
    readingMinutes: readingMinutes(plainText),
    doi: data.doi,
    draft: data.draft === true,
  };
}

export function buildPosts(files: RawPost[], includeDrafts: boolean): Post[] {
  const seen = new Set<string>();

  return files
    .map(buildPost)
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)))
    // Sorting first means a duplicated slug resolves to the newer post.
    .filter((post) => {
      if (seen.has(post.slug)) {
        console.warn(`Duplicate post slug "${post.slug}" — keeping the newer post.`);
        return false;
      }
      seen.add(post.slug);
      return true;
    })
    .map(({ draft: _draft, ...post }) => post);
}
