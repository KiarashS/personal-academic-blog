import { Link } from 'react-router-dom';
import { pageWindow } from '../lib/pagination';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a page number, e.g. `(n) => n === 1 ? '/' : `/page/${n}`` */
  hrefFor: (page: number) => string;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link to={hrefFor(page - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span aria-hidden="true">← Newer</span>
      )}

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="pagination__gap" aria-hidden="true">
            …
          </span>
        ) : entry === page ? (
          <span key={entry} aria-current="page">
            {entry}
          </span>
        ) : (
          <Link key={entry} to={hrefFor(entry)} aria-label={`Page ${entry}`}>
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link to={hrefFor(page + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span aria-hidden="true">Older →</span>
      )}
    </nav>
  );
}
