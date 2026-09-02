import { selectPosts, todayUtc } from './post-builder';
import { getAuthors } from '../content/authors';
import { tagSlug } from './format';
import type { Post, PostMeta } from './types';

// Only metadata is eager. Post bodies and the search text live in their own
// modules so the list pages do not carry the whole archive.
const metaModules = import.meta.glob('../content/posts/*.md', {
  query: '?meta',
  import: 'default',
  eager: true,
}) as Record<string, PostMeta>;

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

/** Adjacent posts in reverse-chronological order, for the post footer. */
export function neighbours(slug: string): { previous?: Post; next?: Post } {
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return {};
  return { previous: posts[index + 1], next: posts[index - 1] };
}
