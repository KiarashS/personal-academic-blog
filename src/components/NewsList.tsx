import { Link } from 'react-router-dom';
import { dateParts, formatDate, isoDate } from '../lib/format';
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
 * Two ways to link, and they never collide. `[words](where)` in the text links
 * those words. `href` on the entry follows the sentence as "more", whether the
 * text has links of its own or not: the sentence is what the entry says, and
 * turning the whole of it into a link makes the words themselves the
 * affordance, which leaves a reader nothing to aim at and no way to tell one
 * entry's target from another's.
 *
 * "more" rather than a bare arrow, because an arrow alone is about ten pixels
 * of tappable link at this size — a third of what a finger needs — and says
 * nothing about itself. The arrow stays beside the word as decoration, hidden
 * from the accessibility tree.
 *
 * The accessible name opens with that same word and then the sentence. A list
 * where every link is called "more" is the oldest complaint screen-reader
 * users have, and a name that does not start with the visible label is one
 * voice control cannot act on.
 */
function Sentence({ item }: { item: NewsItem }) {
  // The segments, not `item.text`: a sentence can have had markup in it whose
  // target the page will not link, and the words are what survives, not the
  // brackets around them.
  const segments = parseInlineLinks(item.text);

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
          <span className="news__out">
            <Target href={item.href} label={`more: ${plainText(item.text)}`}>
              more <span aria-hidden="true">→</span>
            </Target>
          </span>
        </>
      ) : null}
    </>
  );
}

/**
 * One entry's date, as three cells rather than one.
 *
 * The day is one digit or two and month names are proportional, so set as a
 * single string the pieces stagger: ranged left the years wander, ranged right
 * the months do. Given a column each — day, month, year — every piece sits
 * under the same piece of the date above it. The columns come from the list
 * through `subgrid`, so they are as wide as the widest day, month and year in
 * that list and no wider.
 *
 * The day is padded to two digits, which is the part that looks like a
 * concession and is not. This column is the left edge of the block, flush with
 * the prose above it on the front page; ranged right, a single-digit day left
 * that edge notched on its own row, and ranged left it opened a hole between
 * the day and its month. A leading zero is the quietest of the three. It stays
 * out of `formatDate`, which sets dates inside sentences — "08 Sep 2026 ·
 * Kiarash" under a post title would read as a log line.
 *
 * The machine-readable date stays on the `time` element, whole.
 */
function NewsDate({ date }: { date: string }) {
  const parts = dateParts(date);

  return (
    <time className="news__date" dateTime={isoDate(date)}>
      {parts ? (
        <>
          {/* The spaces are for everything that reads the text rather than
              looks at it — a screen reader, a copy and paste — which would
              otherwise get "20Nov2026". A whitespace-only text node is not a
              grid item, so the columns are unmoved by them. */}
          <span className="news__day">{parts.day.padStart(2, '0')}</span>{' '}
          <span className="news__month">{parts.month}</span>{' '}
          <span className="news__year">{parts.year}</span>
        </>
      ) : (
        formatDate(date, 'short')
      )}
    </time>
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
          <NewsDate date={item.date} />
          <span className="news__text">
            <Sentence item={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}
