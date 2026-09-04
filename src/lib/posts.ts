import { selectPosts, seriesParts, todayUtc } from './post-builder';
import { getAuthors } from '../content/authors';
import { tagSlug } from './format';
import type { Post, PostMeta } from './types';

// Only metadata is eager. Post bodies and the search text live in their own
// modules so the list pages do not carry the whole archive.
// Annotated rather than asserted: the glob's own type is not specific enough,
// and an annotation still gets checked.
const metaModules: Record<string, PostMeta> = import.meta.glob('../content/posts/*.md', {
  query: '?meta',
  import: 'default',
  eager: true,
});

const selected = selectPosts(Object.values(metaModules), {
  includeUnpublished: import.meta.env.DEV,
  today: todayUtc(),
});

export const posts: Post[] = selected.map(({ authorIds, draft: _draft, ...meta }) => ({
  ...meta,
  authors: getAuthors(authorIds),
}));

export const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

export function getPost(slug: string | undefined): Post | undefined {
  return slug ? postsBySlug.get(slug) : undefined;
}

/** `tag` may be either the display form or its slug. */
export function postsByTag(tag: string): Post[] {
  const needle = tagSlug(tag);
  return posts.filter((post) => post.tags.some((t) => tagSlug(t) === needle));
}

export function displayTag(slug: string): string | undefined {
  const needle = tagSlug(slug);
  for (const post of posts) {
    const match = post.tags.find((t) => tagSlug(t) === needle);
    if (match) return match;
  }
  return undefined;
}

export function postsByAuthor(authorId: string): Post[] {
  return posts.filter((post) => post.authors.some((author) => author.id === authorId));
}

export interface TagCount {
  tag: string;
  count: number;
}

export function tagCounts(): TagCount[] {
  const counts = new Map<string, TagCount>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tagSlug(tag);
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) =>
    b.count === a.count ? a.tag.localeCompare(b.tag) : b.count - a.count,
  );
}

export interface Series {
  name: string;
  parts: Post[];
  /** Where this post sits, counting from 1. */
  position: number;
  previous?: Post;
  next?: Post;
}

/**
 * The series a post belongs to, in reading order, once there is more than one
 * published part. Multi-part work is read forwards, which is the opposite of
 * what the newer/older links at the foot of a post offer, so it needs its own
 * navigation rather than a relabelling.
 */
export function seriesFor(slug: string): Series | undefined {
  const post = postsBySlug.get(slug);
  if (!post?.series) return undefined;

  const parts = seriesParts(posts, post.series);
  // A series of one is not a series: part 1 written before part 2 exists, or a
  // series name misspelled. Either way there is nothing to navigate.
  if (parts.length < 2) return undefined;

  const index = parts.findIndex((candidate) => candidate.slug === slug);
  if (index === -1) return undefined;

  return {
    name: post.series,
    parts,
    position: index + 1,
    previous: parts[index - 1],
    next: parts[index + 1],
  };
}

/** Adjacent posts in reverse-chronological order, for the post footer. */
export function neighbours(slug: string): { previous?: Post; next?: Post } {
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return {};
  return { previous: posts[index + 1], next: posts[index - 1] };
}

/**
 * Posts sharing the most tags with this one, newest first among ties. Tags are
 * the only signal available without a similarity index, and for a research
 * notebook they are usually the right one.
 */
export function relatedPosts(slug: string, limit = 3): Post[] {
  const post = postsBySlug.get(slug);
  if (!post || post.tags.length === 0) return [];

  const wanted = new Set(post.tags.map((tag) => tagSlug(tag)));

  return posts
    .filter((candidate) => candidate.slug !== slug)
    .map((candidate) => ({
      post: candidate,
      shared: candidate.tags.filter((tag) => wanted.has(tagSlug(tag))).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((entry) => entry.post);
}
