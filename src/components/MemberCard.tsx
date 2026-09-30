import { Link } from 'react-router-dom';
import { avatarCopyPath, isUrl, PHOTO_WIDTH } from '../lib/avatar';
import { memberCard } from '../lib/people';
import { withBase } from '../lib/urls';
import { ProfileIcon } from './ProfileIcon';
import type { Member } from '../lib/types';

/**
 * The circle at the top of a card: the photo, or the person's initials.
 *
 * A build shows the 256px copy `scripts/render-avatar.mjs` writes beside a
 * photo kept under `public/`, as the front page's portrait does; the dev
 * server shows the original. Empty `alt`, because the name is the next thing
 * on the card and a screen reader would otherwise say it twice.
 */
function Photo({ src, initials }: { src?: string; initials: string }) {
  if (!src) {
    return (
      <span className="person__photo person__photo--initials" aria-hidden="true">
        {initials}
      </span>
    );
  }
  const shown = isUrl(src)
    ? src
    : withBase(import.meta.env.PROD ? avatarCopyPath(src, PHOTO_WIDTH) : src);
  return (
    <img
      className="person__photo"
      src={shown}
      alt=""
      width={112}
      height={112}
      loading="lazy"
      decoding="async"
    />
  );
}

export type MemberCardSize = 'lead' | 'member' | 'alumni';

/**
 * One person. Three sizes, one markup: `lead` for the principal
 * investigators, a row with room for a bio; `member` for everyone else in the
 * group, a column in a grid; `alumni`, smaller, with where they went.
 *
 * The profile row is icons with the service's name kept for screen readers
 * and as a tooltip, since a card has room for a row of marks and not a row of
 * words. Which services appear is `profileLinkKeys.people` in the config.
 */
export function MemberCard({ member, size }: { member: Member; size: MemberCardSize }) {
  const card = memberCard(member);

  return (
    <article className={`person person--${size}`}>
      <Photo src={card.photo} initials={card.initials} />
      <div className="person__body">
        <h3 className="person__name">
          {card.authorId ? <Link to={`/authors/${card.authorId}`}>{card.name}</Link> : card.name}
          {card.pronouns ? <span className="person__pronouns">{card.pronouns}</span> : null}
        </h3>
        <p className="person__title">
          {card.title}
          {card.alumnus && card.tenure ? <span>, {card.tenure}</span> : null}
        </p>
        {card.affiliation ? <p className="person__meta">{card.affiliation}</p> : null}
        {!card.alumnus && card.tenure ? <p className="person__meta">{card.tenure}</p> : null}
        {card.alumnus && card.now ? (
          <p className="person__now">
            <span className="person__label">Now</span>{' '}
            {card.nowUrl ? (
              <a href={card.nowUrl} rel="noopener noreferrer" target="_blank">
                {card.now}
              </a>
            ) : (
              card.now
            )}
          </p>
        ) : null}
        {card.bio && size !== 'alumni' ? <p className="person__bio">{card.bio}</p> : null}
        {card.thesis ? (
          <p className="person__thesis">
            <span className="person__label">Thesis</span>{' '}
            {card.thesis.url ? (
              <a href={isUrl(card.thesis.url) ? card.thesis.url : withBase(card.thesis.url)}>
                <cite>{card.thesis.title}</cite>
              </a>
            ) : (
              <cite>{card.thesis.title}</cite>
            )}
          </p>
        ) : null}
        {card.interests.length > 0 && size !== 'alumni' ? (
          <ul className="person__interests" aria-label={`${card.name}: research interests`}>
            {card.interests.map((interest) => (
              <li key={interest}>{interest}</li>
            ))}
          </ul>
        ) : null}
        {card.links.length > 0 ? (
          <ul className="person__links" aria-label={`${card.name}: profiles and contact`}>
            {card.links.map((link) => (
              <li key={`${link.key}:${link.href}`}>
                <a
                  className="icon-chip"
                  href={link.href}
                  title={link.label}
                  {...(link.key === 'email'
                    ? {}
                    : { rel: 'noopener noreferrer', target: '_blank' })}
                >
                  <ProfileIcon of={link.key} />
                  <span className="visually-hidden">{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
