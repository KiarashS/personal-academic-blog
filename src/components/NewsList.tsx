import { Link } from 'react-router-dom';
import { formatDate, isoDate } from '../lib/format';
import { isExternal } from '../lib/features';
import { parseInlineLinks, plainText } from '../lib/inline-links';
import { withBase } from '../lib/urls';
import type { NewsItem } from '../lib/types';

/** A path with an extension is a file under `public/`, not a route of the app. */
const FILE = /\.[a-z0-9]{2,5}$/i;

function Target({
  href,
  label,
  children,
}: {
  href: string;
  label?: string;
  children: React.ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" aria-label={label}>
        {children}
      </a>
    );
  }
  // A file needs the deployment's base path and a plain anchor; a page of the
  // site gets client-side navigation like every other internal link.
  if (FILE.test(href)) {
    return (
      <a href={withBase(href)} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} aria-label={label}>
      {children}
    </Link>
  );
}

/**
 * One entry's sentence.
 *
 * Two ways to link, and they compose rather than collide. `[words](where)` in
 * the text links those words; `href` on the entry points the whole thing
 * somewhere. Given both, the sentence keeps its own links and the entry's
 * target moves to an arrow after it, because an anchor inside an anchor is not
 * a thing a browser will render — and the arrow is given the sentence as its
 * accessible name, since "→" names nothing.
 */
function Sentence({ item }: { item: NewsItem }) {
  const segments = parseInlineLinks(item.text);
  const linked = segments.some((segment) => segment.href);

  if (!linked) {
    // `plainText`, not `item.text`: a sentence can reach here having had markup
    // in it, when the target was one the page will not link. The words are what
    // survives, not the brackets around them.
    const plain = plainText(item.text);
    return item.href ? <Target href={item.href}>{plain}</Target> : <>{plain}</>;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.href ? (
          <Target key={index} href={segment.href}>
            {segment.text}
          </Target>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
      {item.href ? (
        <>
          {' '}
          <Target href={item.href} label={plainText(item.text)}>
            <span aria-hidden="true">→</span>
          </Target>
        </>
      ) : null}
    </>
  );
}

/**
 * Dated one-liners, newest first: a date in its own column and a sentence
 * beside it. The column is what makes the list read as a list without bullets
 * or rules, and it gives a sentence that wraps a hanging indent.
 *
 * The list is named either by a heading that is already on the page
 * (`labelledBy`) or, where there is none, by `label`: unnamed, a bare list of
 * dates is as opaque to a screen reader as it would be to anyone else.
 */
export function NewsList({
  items,
  label,
  labelledBy,
}: {
  items: NewsItem[];
  label?: string;
  labelledBy?: string;
}) {
  return (
    <ul
      className="news__list"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
    >
      {items.map((item) => (
        <li className="news__item" key={`${item.date}-${item.text}`}>
          <time className="news__date" dateTime={isoDate(item.date)}>
            {formatDate(item.date, 'short')}
          </time>
          <span className="news__text">
            <Sentence item={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}
