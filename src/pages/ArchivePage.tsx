import { Link } from 'react-router-dom';
import { posts } from '../lib/posts';
import { formatDate, isoDate } from '../lib/format';
import type { Post } from '../lib/types';

function byYear(list: Post[]): [string, Post[]][] {
  const groups = new Map<string, Post[]>();
  for (const post of list) {
    const year = post.date.slice(0, 4) || 'Undated';
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Every post on one page, which is what people use once the index paginates. */
export function ArchivePage() {
  const grouped = byYear(posts);

  return (
    <>
      <h1>Archive</h1>
      <p className="lede">
        {posts.length} post{posts.length === 1 ? '' : 's'}, newest first.
      </p>
      {grouped.map(([year, list]) => (
        <section key={year} className="archive-year">
          <h2 className="section-heading">{year}</h2>
          <ul className="archive-list">
            {list.map((post) => (
              <li key={post.slug}>
                <time dateTime={isoDate(post.date)}>{formatDate(post.date, 'short')}</time>
                <Link to={`/posts/${post.slug}`}>{post.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
