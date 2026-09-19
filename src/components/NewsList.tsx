import { useEffect, useRef, type CSSProperties } from 'react';
import { dateParts, formatDate, isoDate } from '../lib/format';
import { parseInlineLinks, plainText } from '../lib/inline-links';
import { Target } from './Target';
import type { NewsItem } from '../lib/types';

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
 *
 * `rows` holds the list to the height of that many entries and scrolls the
 * rest, which is what keeps the front page the same page whether the month was
 * busy or quiet. The news page passes nothing: there the list is the content,
 * and a scrollbar inside a page that already scrolls is a box inside a box.
 */
/**
 * Sets the window to the height of the first `rows` entries, once they are on
 * a screen and have taken their shape.
 *
 * It has to be measured. An entry is one line or several depending on how long
 * the sentence is and how wide the column is, so "the height of three entries"
 * is not a sum CSS can do — the stylesheet can only count rows, and a row is
 * not an entry. The value is written to the element rather than rendered into
 * it, so the server's markup and the browser's first pass stay identical and
 * nothing about hydration changes.
 *
 * Until then the stylesheet's own `--news-rows` fallback stands, which is that
 * many single-line rows: right whenever nothing wraps, and a little short for a
 * moment when something does. With JavaScript off it stands for good, which is
 * a window slightly too small rather than a page with no news in it.
 *
 * Re-measured on resize, since a narrower column wraps more sentences.
 */
function useWindowHeight(rows: number | undefined) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list || !rows) return;

    const measure = () => {
      // The first entry past the window: where it starts is how tall the ones
      // before it are.
      const next = list.children[rows] as HTMLElement | undefined;
      if (!next) return;
      const top = next.getBoundingClientRect().top - list.getBoundingClientRect().top;
      const height = `${Math.round(top + list.scrollTop)}px`;
      if (list.style.getPropertyValue('--news-height') !== height) {
        list.style.setProperty('--news-height', height);
      }
    };

    measure();

    // The parent, not the list: the list's own height is what this sets, and
    // watching it would be watching itself.
    const watched = list.parentElement;
    if (!watched) return;
    const observer = new ResizeObserver(measure);
    observer.observe(watched);
    return () => observer.disconnect();
  }, [rows]);

  return ref;
}

export function NewsList({
  items,
  label,
  labelledBy,
  rows,
}: {
  items: NewsItem[];
  label?: string;
  labelledBy?: string;
  /** Entries to stand at before scrolling. Unset lets the list grow to fit. */
  rows?: number;
}) {
  const ref = useWindowHeight(rows);

  return (
    <ul
      ref={ref}
      className={rows ? 'news__list news__list--windowed' : 'news__list'}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      // A scrollable box has to be reachable by keyboard, or the entries past
      // the fold belong to the mouse alone. The list already has a name, so
      // focusing it announces one.
      tabIndex={rows ? 0 : undefined}
      style={rows ? ({ '--news-rows': rows } as CSSProperties) : undefined}
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
