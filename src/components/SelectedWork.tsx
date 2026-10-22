import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import entries from '../content/publications.bib';
import { isEnabled, isExternal } from '../lib/features';
import { useReducedMotion } from '../lib/reduced-motion';
import { selectedWork, type WorkCard } from '../lib/selected-work';
import { withBase } from '../lib/urls';
import { siteConfig } from '../site.config';

const address = (src: string): string => (isExternal(src) ? src : withBase(src));

/** The anchor of an entry on the Publications page; see `PublicationsPage`. */
export const publicationAnchor = (key: string): string => `publication-${key}`;

/**
 * The picture at the top of a card. An image is the teaser itself. A clip
 * shows its poster, or its first frame, and plays while the card is under the
 * pointer or has focus, so the front page is still until someone reaches for
 * a card; a reader who asked for less motion only ever sees the still.
 *
 * Empty `alt` throughout: the card is a link named by the title under the
 * picture, and a description read before it would be read as part of the
 * link's name, every time.
 */
function CardMedia({ work, video }: { work: WorkCard; video: RefObject<HTMLVideoElement | null> }) {
  const media = work.media;
  if (!media) {
    // No teaser: the year, set large, so the row keeps one rhythm.
    return (
      <span className="work-card__media work-card__media--year" aria-hidden="true">
        {work.year || '—'}
      </span>
    );
  }
  return (
    <span className="work-card__media">
      {media.kind === 'video' ? (
        <video
          ref={video}
          src={address(media.src)}
          poster={media.poster ? address(media.poster) : undefined}
          muted
          loop
          playsInline
          preload={media.poster ? 'none' : 'metadata'}
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : (
        <img
          src={address(media.src)}
          alt=""
          width={media.width}
          height={media.height}
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}

function Card({ work }: { work: WorkCard }) {
  const video = useRef<HTMLVideoElement>(null);
  const still = useReducedMotion();
  const play = () => {
    if (!still) void video.current?.play().catch(() => {});
  };
  const pause = () => video.current?.pause();

  const body: ReactNode = (
    <>
      <CardMedia work={work} video={video} />
      <span className="work-card__text">
        <span className="work-card__title">{work.title}</span>
        <span className="work-card__meta">
          {[work.venue, work.year || ''].filter(Boolean).join(' · ')}
        </span>
      </span>
    </>
  );
  const events = { onPointerEnter: play, onPointerLeave: pause, onFocus: play, onBlur: pause };

  // The paper, where the entry links one; else its place on the Publications
  // page; else a card that is not a link.
  if (work.url) {
    return (
      <a
        className="work-card"
        href={work.url}
        target="_blank"
        rel="noopener noreferrer"
        {...events}
      >
        {body}
      </a>
    );
  }
  if (isEnabled('publications')) {
    return (
      <Link className="work-card" to={`/publications#${publicationAnchor(work.key)}`} {...events}>
        {body}
      </Link>
    );
  }
  return <div className="work-card">{body}</div>;
}

/**
 * A few papers to start from, as cards between the introduction and the news
 * (`home.selectedWork`). The introduction says who; this says what, before
 * the news says what is new. Nothing is drawn when the row is off or no entry
 * is selected, and the build says which.
 */
export function SelectedWork() {
  const config = siteConfig.home.selectedWork;
  const cards = selectedWork(entries, config);
  if (cards.length === 0) return null;

  return (
    <section className="selected-work" aria-labelledby="selected-work-heading">
      <div className="selected-work__head">
        <h2 className="section-heading" id="selected-work-heading">
          {config.title || 'Selected work'}
        </h2>
        {config.allLabel && isEnabled('publications') ? (
          <Link className="selected-work__all" to="/publications">
            {config.allLabel} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
      <ul className="selected-work__list">
        {/* `--card` is the card's place in the row, which the stylesheet turns
            into how long it waits before rising in. */}
        {cards.map((work, index) => (
          <li key={work.key} style={{ '--card': index } as CSSProperties}>
            <Card work={work} />
          </li>
        ))}
      </ul>
    </section>
  );
}
