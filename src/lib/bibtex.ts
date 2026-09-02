import type { Post } from './types';

function citationKey(post: Post): string {
  const surname = post.authors[0]?.name.split(/\s+/).pop()?.toLowerCase() ?? 'anon';
  const year = post.date.slice(0, 4);
  const word = post.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .find((candidate) => candidate.length > 3 && !STOPWORDS.has(candidate));
  return `${surname.replace(/[^a-z0-9]/g, '')}${year}${word ?? 'post'}`;
}

const STOPWORDS = new Set(['this', 'that', 'with', 'from', 'what', 'when', 'your', 'their', 'about']);

/** "Family, Given" is what BibTeX wants; a single-word name is left alone. */
function bibName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.trim();
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

export function toBibtex(post: Post, url: string): string {
  const fields: [string, string][] = [
    ['author', post.authors.map((author) => bibName(author.name)).join(' and ')],
    ['title', post.title],
    ['year', post.date.slice(0, 4)],
    ['url', url],
    ['urldate', (post.updated ?? post.date).slice(0, 10)],
  ];
  if (post.doi) fields.push(['doi', post.doi]);

  const width = Math.max(...fields.map(([name]) => name.length));
  const body = fields
    .filter(([, value]) => value)
    .map(([name, value]) => `  ${name.padEnd(width)} = {${value}}`)
    .join(',\n');

  return `@misc{${citationKey(post)},\n${body}\n}`;
}
