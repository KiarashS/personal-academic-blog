import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '../components/PageMeta';
import { PostMeta } from '../components/PostMeta';
import { TagList } from '../components/TagList';
import { search } from '../lib/search';
import { posts } from '../lib/posts';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const deferred = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mirror the box into the URL so a search can be linked to or bookmarked.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParams(query ? { q: query } : {}, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, setParams]);

  const hits = useMemo(() => search(deferred), [deferred]);
  const typed = deferred.trim().length >= 2;

  return (
    <>
      <PageMeta title="Search" description="Search the archive by title, tag, author or text." />
      <h1>Search</h1>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="search-input">
          Search posts
        </label>
        <input
          id="search-input"
          ref={inputRef}
          className="search-field"
          type="search"
          value={query}
          placeholder={`Search ${posts.length} posts — title, tag, author, full text`}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <p className="lede" aria-live="polite">
        {typed
          ? `${hits.length} result${hits.length === 1 ? '' : 's'} for “${deferred.trim()}”`
          : 'Type at least two characters.'}
      </p>

      {typed && hits.length > 0 ? (
        <ul className="post-list">
          {hits.map(({ post, snippet }) => (
            <li key={post.slug}>
              <article>
                <h2 className="post-card__title">
                  <Link to={`/posts/${post.slug}`}>{post.title}</Link>
                </h2>
                <PostMeta post={post} showReadingTime={false} />
                <p className="search-snippet">{snippet ?? post.summary}</p>
                <TagList tags={post.tags} />
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
