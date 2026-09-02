import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import { posts } from './posts';
import type { Post } from './types';

interface SearchRecord {
  post: Post;
  title: string;
  summary: string;
  tags: string;
  authors: string;
  body: string;
}

const records: SearchRecord[] = posts.map((post) => ({
  post,
  title: post.title,
  summary: post.summary,
  tags: post.tags.join(' '),
  authors: post.authors.map((a) => a.name).join(' '),
  body: post.plainText,
}));

const options: IFuseOptions<SearchRecord> = {
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  useExtendedSearch: true,
  threshold: 0.3,
  minMatchCharLength: 3,
  keys: [
    { name: 'title', weight: 5 },
    { name: 'tags', weight: 3 },
    { name: 'summary', weight: 2 },
    { name: 'authors', weight: 2 },
    { name: 'body', weight: 1 },
  ],
};

/**
 * Fuzzy matching a four-letter word against a whole post body matches
 * everything, so short tokens are required to appear literally (`'token` is
 * fuse's exact-match operator) and only longer ones are allowed to be fuzzy.
 */
export function toPattern(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^['^!|=]+/, ''))
    .filter(Boolean)
    .map((token) => (token.length < 6 ? `'${token}` : token))
    .join(' ');
}

let fuse: Fuse<SearchRecord> | null = null;

function index(): Fuse<SearchRecord> {
  if (!fuse) fuse = new Fuse(records, options);
  return fuse;
}

export interface SearchHit {
  post: Post;
  /** A snippet of body text around the first match, when the body matched. */
  snippet?: string;
}

export function search(query: string, limit = 25): SearchHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = toPattern(trimmed);
  if (!pattern) return [];

  return index()
    .search(pattern, { limit })
    .map(({ item, matches }) => {
      const bodyMatch = matches?.find((m) => m.key === 'body' && m.indices.length > 0);
      return {
        post: item.post,
        snippet: bodyMatch ? snippetAround(item.body, bodyMatch.indices[0][0]) : undefined,
      };
    });
}

function snippetAround(text: string, at: number, radius = 110): string {
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius);
  const head = start > 0 ? '…' : '';
  const tail = end < text.length ? '…' : '';
  return `${head}${text.slice(start, end).trim()}${tail}`;
}
