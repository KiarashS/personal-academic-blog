import { parseFrontmatter } from './frontmatter';
import { excerpt, readingMinutes, toPlainText } from './markdown-text';
import type { Heading, PostFrontmatter, PostMeta, Publication, Revision } from './types';

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

/**
 * The post's revision history, newest first. What a returning reader wants to
 * know is what changed since they last read it, and the header's "updated"
 * date links straight to this block, so the entry that date names belongs at
 * the top rather than at the end of a list. An entry without a date is
 * dropped: it has nothing to sort or display.
 */
function revisionsFrom(entries: unknown): Revision[] {
  if (!Array.isArray(entries)) return [];

  // Frontmatter is whatever the author typed, so a field that is not a string
  // is treated as absent rather than stringified into the page.
  const text = (value: unknown): string => (typeof value === 'string' ? value : '');

  return entries
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({ date: text(entry.date), note: text(entry.note) }))
    .filter((revision) => revision.date !== '')
    .sort((a, b) => b.date.localeCompare(a.date));
}

const PUBLICATION_FIELDS = [
  'status',
  'venue',
  'year',
  'doi',
  'url',
  'pdf',
  'code',
  'data',
] as const;

/**
 * The publication block, keeping only the fields we know and only the values
 * that are text. A `year:` written as a number in YAML is still a year, so it
 * is read as one; anything else is dropped rather than printed as `[object
 * Object]` on the page.
 */
function publicationFrom(value: unknown): Publication | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;

  const entries = PUBLICATION_FIELDS.map((field): [string, string] | undefined => {
    const raw = source[field];
    if (typeof raw === 'string' && raw.trim()) return [field, raw.trim()];
    if (typeof raw === 'number' && Number.isFinite(raw)) return [field, String(raw)];
    return undefined;
  }).filter((entry): entry is [string, string] => entry !== undefined);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
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
  const revisions = revisionsFrom(data.revisions);
  const newest = revisions[0]?.date;

  return {
    meta: {
      slug: data.slug ?? slugFromPath(path),
      title: data.title ?? slugFromPath(path),
      date: data.date ?? dateFromPath(path),
      // One `updated` still drives the header, the feed and the sitemap; a
      // history just means it no longer has to be maintained by hand.
      updated: data.updated ?? newest,
      revisions,
      series:
        typeof data.series === 'string' && data.series.trim() ? data.series.trim() : undefined,
      part: typeof data.part === 'number' ? data.part : undefined,
      publication: publicationFrom(data.publication),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      authorIds: Array.isArray(data.authors) ? data.authors.map(String) : [],
      summary: data.summary ?? excerpt(plainText),
      readingMinutes: readingMinutes(plainText),
      doi: data.doi,
      draft: data.draft === true,
      featured: data.featured === true,
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

/**
 * The index order: featured posts first, newest first within each group, which
 * a stable sort on the flag alone gives us. The feed, the archive, the tag
 * pages and a post's neighbours stay chronological, so pinning changes what the
 * front page leads with and nothing else.
 */
export function featuredFirst<T extends { featured: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
}

export interface SeriesMember {
  series?: string;
  part?: number;
  date: string;
}

/**
 * The posts of one series, in reading order: by `part` where an author has
 * numbered them, by date otherwise. A numbered post always comes before an
 * unnumbered one, so half-numbered series still read sensibly rather than
 * interleaving.
 */
export function seriesParts<T extends SeriesMember>(list: readonly T[], name: string): T[] {
  return list
    .filter((post) => post.series === name)
    .sort((a, b) => {
      if (a.part !== undefined && b.part !== undefined) return a.part - b.part;
      if (a.part !== undefined) return -1;
      if (b.part !== undefined) return 1;
      return a.date.localeCompare(b.date);
    });
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Collects the `h2`/`h3` headings a post page turns into its contents list. */
export function tableOfContents(headings: Heading[], minimum = 3): Heading[] {
  return headings.length >= minimum ? headings : [];
}
