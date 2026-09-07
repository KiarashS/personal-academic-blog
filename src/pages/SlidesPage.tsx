import { slides } from '../content/slides';
import { formatDate, isoDate } from '../lib/format';
import { withBase } from '../lib/urls';
import type { SlideDeck } from '../lib/types';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** A deck kept under `public/` needs the deployment's base; a URL does not. */
const href = (value: string): string => (isUrl(value) ? value : withBase(value));

function materials(deck: SlideDeck): [string, string][] {
  const entries: [string, string | undefined][] = [
    ['Slides', deck.slides],
    ['Video', deck.video],
    ['Code', deck.code],
    ['Paper', deck.paper],
  ];
  return entries.filter((entry): entry is [string, string] => Boolean(entry[1]));
}

/**
 * Talks, newest first. The same shape as the post list: a title, a date, a line
 * of context, then the links. A talk without a deck to download is still worth
 * listing, so nothing here is required but the title and the date.
 */
export function SlidesPage() {
  const given = [...slides].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <h1>Slides</h1>
      {given.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <ul className="post-list">
          {given.map((deck) => (
            <li key={`${deck.date}-${deck.title}`}>
              <article>
                <h2 className="post-card__title">{deck.title}</h2>
                <p className="meta">
                  <time dateTime={isoDate(deck.date)}>{formatDate(deck.date)}</time>
                  {deck.event ? (
                    <>
                      <span className="meta__sep">·</span>
                      <span>{deck.event}</span>
                    </>
                  ) : null}
                </p>
                {deck.summary ? <p className="post-card__summary">{deck.summary}</p> : null}
                {materials(deck).length > 0 ? (
                  <ul className="author-links" aria-label={`${deck.title}: materials`}>
                    {materials(deck).map(([label, value]) => (
                      <li key={label}>
                        <a className="author-links__link" href={href(value)}>
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
