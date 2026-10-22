import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import entries from '../content/publications.bib';
import { CopyButton } from '../components/CopyButton';
import { publicationAnchor } from '../components/SelectedWork';
import { bibAuthors, bibUrl, bibVenue, bibYear, formatBib } from '../lib/bib-parse';
import { TEASER_NAME, TITLE_NAME } from '../lib/card-transition';
import { isExternal } from '../lib/features';
import { useReducedMotion } from '../lib/reduced-motion';
import { withBase } from '../lib/urls';
import type { BibEntry } from '../lib/bib-parse';
import type { PublicationMedia } from '../lib/publication-media';

const address = (src: string): string => (isExternal(src) ? src : withBase(src));

/**
 * A teaser clip plays the way a GIF would, muted and on a loop, but only while
 * it is on screen: a page of twenty papers is twenty videos, and a phone has
 * no need to decode the ones above and below the window. A reader who has
 * asked for less motion gets the still and the controls instead, and starts it
 * themselves. The server renders it paused, as the reduced-motion hook
 * assumes on the server, so hydration matches either way.
 */
const itemClass = (media: PublicationMedia): string =>
  media.framed
    ? 'publication__media-item publication__media-item--framed'
    : 'publication__media-item';

/**
 * The view-transition name for an entry a front-page card is turning into
 * (`lib/card-transition.ts`): on the one entry the address points at, and on
 * nothing else, since a name may be on one element at a time.
 */
const noChanges = () => () => {};

/**
 * A measured picture's own shape, so its box is the right height before the
 * file arrives. The stylesheet's 16:10 is for a teaser the build could not
 * measure; an `aspect-ratio: auto` there would throw away the shape the
 * browser takes from `width` and `height`, leave the box 0px tall until the
 * picture loaded, and move every entry under it when it did.
 */
const shape = (media: PublicationMedia) =>
  media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : undefined;

const named = (name: string, on: boolean) => (on ? { viewTransitionName: name } : undefined);

function TeaserVideo({ media, target }: { media: PublicationMedia; target: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    const element = video.current;
    if (!element || still) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [still]);

  return (
    <video
      ref={video}
      className={itemClass(media)}
      style={named(TEASER_NAME, target)}
      src={address(media.src)}
      poster={media.poster ? address(media.poster) : undefined}
      aria-label={media.alt || undefined}
      controls={still}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

/**
 * The picture beside an entry. It links to the paper as the title does, so
 * the link is a second way to the same place: kept out of the tab order and
 * hidden from screen readers when the picture has no description of its own,
 * which would otherwise be a link with no name.
 */
function Teaser({
  media,
  url,
  target,
}: {
  media: PublicationMedia;
  url?: string;
  target: boolean;
}) {
  const picture =
    media.kind === 'video' ? (
      <TeaserVideo media={media} target={target} />
    ) : (
      <img
        className={itemClass(media)}
        style={{ ...shape(media), ...named(TEASER_NAME, target) }}
        src={address(media.src)}
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={target ? 'eager' : 'lazy'}
        decoding="async"
      />
    );

  // A video carries its own controls, and a link around them would take the
  // click a reader meant for play.
  const linked = url && media.kind === 'image';
  return (
    <figure className="publication__media">
      {linked ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          {...(media.alt ? {} : { 'aria-hidden': true, tabIndex: -1 })}
        >
          {picture}
        </a>
      ) : (
        picture
      )}
    </figure>
  );
}

function byYear(list: BibEntry[]): [number, BibEntry[]][] {
  const groups = new Map<number, BibEntry[]>();
  for (const entry of list) {
    const year = bibYear(entry);
    groups.set(year, [...(groups.get(year) ?? []), entry]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

function Publication({ entry, target }: { entry: BibEntry; target: boolean }) {
  const authors = bibAuthors(entry);
  const venue = bibVenue(entry);
  const url = bibUrl(entry);
  const { volume, number, pages } = entry.fields;
  const details = [volume ? `${volume}${number ? `(${number})` : ''}` : '', pages ?? '']
    .filter(Boolean)
    .join(', ');

  return (
    <li
      className={`publication${entry.media ? ' publication--media' : ''}`}
      id={publicationAnchor(entry.key)}
    >
      <div className="publication__text">
        <p className="publication__title" style={named(TITLE_NAME, target)}>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {entry.fields.title}
            </a>
          ) : (
            entry.fields.title
          )}
        </p>
        {authors.length > 0 ? <p className="publication__authors">{authors.join(', ')}</p> : null}
        {venue ? (
          <p className="meta">
            <em>{venue}</em>
            {/* One piece, so the meta row's spacing goes between the venue
                and this and nowhere inside it, and a venue with pages but no
                volume does not begin with a stray comma. */}
            {details ? <span>{details}</span> : null}
          </p>
        ) : null}
        {entry.badge ? <p className="publication__badge">{entry.badge}</p> : null}
        <details className="cite cite--compact">
          <summary>BibTeX</summary>
          <div className="code-block">
            <CopyButton text={formatBib(entry)} label="BibTeX to clipboard" />
            <pre tabIndex={0}>
              <code>{formatBib(entry)}</code>
            </pre>
          </div>
        </details>
      </div>
      {entry.media ? <Teaser media={entry.media} url={url} target={target} /> : null}
    </li>
  );
}

export function PublicationsPage() {
  const grouped = byYear(entries);
  // The entry a link named, which a card from the front page may be turning
  // into. The server never sees the fragment, so hydrating a page opened at
  // `#publication-…` reads it as empty first, as the server did, rather than
  // disagreeing with the markup; a page mounted by a navigation, which is the
  // one a card animates into, has it from the first render.
  const { hash } = useLocation();
  const target = useSyncExternalStore(
    noChanges,
    () => decodeURIComponent(hash.slice(1)),
    () => '',
  );

  return (
    <>
      <h1>Publications</h1>
      {entries.length === 0 ? (
        <p className="empty">
          Nothing here yet. Add entries to <code>src/content/publications.bib</code>.
        </p>
      ) : (
        <>
          {/* Where the list comes from is a note for the site's owner, and the
              README carries it. A reader was being told a file path. */}
          <p className="lede">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}, newest first.
          </p>
          {grouped.map(([year, list]) => (
            <section key={year} className="publication-year">
              <h2 className="section-heading">{year || 'Undated'}</h2>
              <ol className="publication-list">
                {list.map((entry) => (
                  <Publication
                    key={entry.key}
                    entry={entry}
                    target={target === publicationAnchor(entry.key)}
                  />
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </>
  );
}
