import { Link } from 'react-router-dom';
import { pageWindow } from '../lib/pagination';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a page number, e.g. `(n) => n === 1 ? '/' : `/page/${n}`` */
  hrefFor: (page: number) => string;
}

/**
 * Newer at the left edge of the column, older at the right, and the page
 * numbers between them.
 *
 * The arrows sit at the edges rather than either side of the numbers so they
 * stay put: the number row can change width from page to page, and a reader
 * clicking "Older" repeatedly should find it under the pointer each time. At
 * the first and last page the arrow that has nowhere to go is not drawn, but
 * keeps its column, so nothing else moves.
 *
 * On a narrow screen seven numbers and two arrows do not fit on one line, so
 * the numbers give way to "Page 2 of 10". Both are in the markup; the
 * stylesheet chooses.
 */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link
          className="pagination__edge pagination__edge--newer"
          to={hrefFor(page - 1)}
          rel="prev"
        >
          <span aria-hidden="true">← </span>Newer
        </Link>
      ) : (
        // Holds the column; the stylesheet does not draw it. `visibility` also
        // takes it out of what a screen reader hears, so no `aria-hidden`.
        <span className="pagination__edge pagination__edge--newer pagination__edge--off">
          ← Newer
        </span>
      )}

      <ol className="pagination__pages">
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} className="pagination__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={entry}>
              {entry === page ? (
                <span className="pagination__page" aria-current="page">
                  <span className="visually-hidden">Page </span>
                  {entry}
                </span>
              ) : (
                <Link className="pagination__page" to={hrefFor(entry)}>
                  <span className="visually-hidden">Page </span>
                  {entry}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>

      {/* One of this and the list above is `display: none` at any width, which
          also takes it out of what a screen reader hears — so a reader on a
          phone is told where they are, and one on a desktop is not told twice. */}
      <p className="pagination__status">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          className="pagination__edge pagination__edge--older"
          to={hrefFor(page + 1)}
          rel="next"
        >
          Older<span aria-hidden="true"> →</span>
        </Link>
      ) : (
        <span className="pagination__edge pagination__edge--older pagination__edge--off">
          Older →
        </span>
      )}
    </nav>
  );
}
