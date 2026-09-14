import { Link } from 'react-router-dom';
import { formatDate, isoDate } from '../lib/format';
import { isExternal } from '../lib/features';
import { withBase } from '../lib/urls';
import type { NewsItem } from '../lib/types';

/** A path with an extension is a file under `public/`, not a route of the app. */
const FILE = /\.[a-z0-9]{2,5}$/i;

function Target({ href, children }: { href: string; children: string }) {
  if (isExternal(href)) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  // A file needs the deployment's base path and a plain anchor; a page of the
  // site gets client-side navigation like every other internal link.
  if (FILE.test(href)) return <a href={withBase(href)}>{children}</a>;
  return <Link to={href}>{children}</Link>;
}

/**
 * Dated one-liners, newest first: a date in its own column and a sentence
 * beside it. The column is what makes the list read as a list without bullets
 * or rules, and it gives a sentence that wraps a hanging indent.
 *
 * `label` names the list for a screen reader. The front page carries no
 * heading above it — the dates are what say what this is, and a heading would
 * be the only one on the page — so without a label the block would arrive as
 * three unexplained lines.
 */
export function NewsList({ items, label }: { items: NewsItem[]; label?: string }) {
  return (
    <ul className="news__list" aria-label={label}>
      {items.map((item) => (
        <li className="news__item" key={`${item.date}-${item.text}`}>
          <time className="news__date" dateTime={isoDate(item.date)}>
            {formatDate(item.date, 'short')}
          </time>
          <span className="news__text">
            {item.href ? <Target href={item.href}>{item.text}</Target> : item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
