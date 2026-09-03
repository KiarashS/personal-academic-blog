import { parseFrontmatter } from './frontmatter';
import { excerpt, readingMinutes, toPlainText } from './markdown-text';
import type { Heading, PostFrontmatter, PostMeta } from './types';

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

export interface BuiltPost {
  meta: Omit<PostMeta, 'headings'>;
  /** Markdown body, for the renderer. */
  body: string;
  /** Prose only, for search and reading time. */
  plainText: string;
}

/** Everything derivable from a post file without running the render pipeline. */
export function buildPost({ path, raw }: RawPost): BuiltPost {
  const { data, content } = parseFrontmatter<PostFrontmatter>(raw);
  const plainText = toPlainText(content);

  return {
    meta: {
      slug: data.slug ?? slugFromPath(path),
      title: data.title ?? slugFromPath(path),
      date: data.date ?? dateFromPath(path),
      updated: data.updated,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      authorIds: Array.isArray(data.authors) ? data.authors.map(String) : [],
      summary: data.summary ?? excerpt(plainText),
      readingMinutes: readingMinutes(plainText),
      doi: data.doi,
      draft: data.draft === true,
    },
    body: content,
    plainText,
  };
}

export interface SelectOptions {
  /** Drafts and future-dated posts are visible in dev, never in a build. */
  includeUnpublished: boolean;
  /** Today, as `YYYY-MM-DD`. Injected so the test suite is not time-dependent. */
  today: string;
}

function publishable(post: PostMeta, { includeUnpublished, today }: SelectOptions): boolean {
  if (includeUnpublished) return true;
  if (post.draft) return false;
  // A post dated ahead of today waits for its date instead of appearing early.
  return !post.date || post.date <= today;
}

export function selectPosts<T extends PostMeta>(posts: T[], options: SelectOptions): T[] {
  const seen = new Set<string>();

  return (
    posts
      .filter((post) => publishable(post, options))
      .sort((a, b) =>
        a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date),
      )
      // Sorting first means a duplicated slug resolves to the newer post.
      .filter((post) => {
        if (seen.has(post.slug)) {
          console.warn(`Duplicate post slug "${post.slug}" — keeping the newer post.`);
          return false;
        }
        seen.add(post.slug);
        return true;
      })
  );
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Collects the `h2`/`h3` headings a post page turns into its contents list. */
export function tableOfContents(headings: Heading[], minimum = 3): Heading[] {
  return headings.length >= minimum ? headings : [];
}
