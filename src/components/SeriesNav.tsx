import { Link } from 'react-router-dom';
import type { Series } from '../lib/posts';

/**
 * Where this post sits in a multi-part piece, listed at the top because a
 * reader who arrives at part three from a search needs the other parts before
 * the text, not after it.
 */
export function SeriesHeader({ series }: { series: Series }) {
  return (
    <nav className="series" aria-labelledby="series-heading">
      <p className="series__heading" id="series-heading">
        <span className="series__name">{series.name}</span>
        <span className="series__count">
          Part {series.position} of {series.parts.length}
        </span>
      </p>
      <ol className="series__list">
        {series.parts.map((part, index) => (
          <li
            className={
              index + 1 === series.position ? 'series__part series__part--here' : 'series__part'
            }
            key={part.slug}
          >
            {index + 1 === series.position ? (
              <span aria-current="page">{part.title}</span>
            ) : (
              <Link to={`/posts/${part.slug}`}>{part.title}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Forwards and backwards through the series, above the newer/older links,
 * which mean something else: those are the archive's order, this is the
 * author's.
 */
export function SeriesLinks({ series }: { series: Series }) {
  if (!series.previous && !series.next) return null;

  return (
    <nav className="post-nav post-nav--series" aria-label={`${series.name} series`}>
      <div>
        {series.previous ? (
          <Link to={`/posts/${series.previous.slug}`} rel="prev">
            <span className="post-nav__label">Previous in {series.name}</span>
            {series.previous.title}
          </Link>
        ) : null}
      </div>
      <div className="post-nav__end">
        {series.next ? (
          <Link to={`/posts/${series.next.slug}`} rel="next">
            <span className="post-nav__label">Next in {series.name}</span>
            {series.next.title}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
