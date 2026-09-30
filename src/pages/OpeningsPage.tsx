import { RoutedHtml } from '../components/RoutedHtml';
import { formatDate, isoDate } from '../lib/format';
import { isExternal } from '../lib/features';
import { applyHref, kindName, openOpenings } from '../lib/openings';
import { resource, useResource } from '../lib/resource';
import { useToday } from '../lib/today';
import { withBase } from '../lib/urls';
import type { Opening } from '../lib/types';

export const openingsBody = resource(
  () => import('../content/openings.md') as Promise<{ html: string }>,
);

function OpeningsBody() {
  return <RoutedHtml className="prose" html={useResource(openingsBody).html} />;
}

function Points({ label, items, id }: { label: string; items?: string[]; id: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="opening__points">
      <h4 className="opening__label" id={id}>
        {label}
      </h4>
      <ul aria-labelledby={id}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One position: what it is, the facts an applicant checks first, the work,
 * what they need and what they get, then how to apply. The deadline is the
 * last of the facts and the only one in the text colour, since it is the one
 * that decides whether the rest is worth reading.
 */
function OpeningCard({ opening, index }: { opening: Opening; index: number }) {
  // By position, not from the title: a title in another script slugs to
  // nothing, and two such positions would share one id.
  const id = `opening-${index + 1}`;
  const href = applyHref(opening);
  const byEmail = href?.startsWith('mailto:');
  const { url, email, subject, note } = opening.apply ?? {};
  const mail =
    url && email
      ? `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
      : undefined;
  const facts: [string, string][] = [
    ['Start', opening.start],
    ['Duration', opening.duration],
    ['Funding', opening.funding],
    ['Location', opening.location],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]?.trim()));

  return (
    <article className="opening" aria-labelledby={id}>
      <p className="opening__kind">{kindName(opening.kind)}</p>
      <h3 className="opening__title" id={id}>
        {opening.title}
      </h3>
      <dl className="opening__facts">
        {facts.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="opening__deadline">
          <dt>Deadline</dt>
          <dd>
            {opening.deadline ? (
              <time dateTime={isoDate(opening.deadline)}>{formatDate(opening.deadline)}</time>
            ) : (
              'Open until filled'
            )}
          </dd>
        </div>
      </dl>
      <p className="opening__summary">{opening.summary}</p>
      <div className="opening__lists">
        <Points label="The work" items={opening.work} id={`${id}-work`} />
        <Points label="You bring" items={opening.requirements} id={`${id}-bring`} />
        <Points label="On offer" items={opening.offer} id={`${id}-offer`} />
      </div>
      {href ? (
        <div className="opening__apply">
          <a
            className="opening__button"
            href={href}
            {...(byEmail ? {} : { rel: 'noopener noreferrer', target: '_blank' })}
          >
            {byEmail ? 'Apply by email' : 'Apply'}
          </a>
          {mail ? (
            <a className="opening__button opening__button--quiet" href={mail}>
              Ask a question
            </a>
          ) : null}
          {opening.details ? (
            <a
              className="opening__button opening__button--quiet"
              href={isExternal(opening.details) ? opening.details : withBase(opening.details)}
            >
              Full advertisement
            </a>
          ) : null}
        </div>
      ) : null}
      {note ? <p className="opening__note">{note}</p> : null}
    </article>
  );
}

/**
 * `openings.md`, then every position still open. With none open the page
 * says so in its first line, and the Markdown above is where to say whether
 * to write anyway.
 */
export function OpeningsPage() {
  const today = useToday();
  const open = openOpenings(undefined, today);

  return (
    <>
      <h1>Openings</h1>
      <p className="lede">
        {open.length === 0
          ? 'No positions are open right now.'
          : `${open.length} open position${open.length === 1 ? '' : 's'}.`}
      </p>
      <OpeningsBody />
      {open.length > 0 ? (
        <section aria-labelledby="openings-open">
          <h2 className="section-heading section-heading--spaced" id="openings-open">
            Open positions
          </h2>
          {open.map((opening, index) => (
            <OpeningCard key={`${index}-${opening.title}`} opening={opening} index={index} />
          ))}
        </section>
      ) : null}
    </>
  );
}
