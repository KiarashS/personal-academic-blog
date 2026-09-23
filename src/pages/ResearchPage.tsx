import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { researchAreas } from '../content/research';
import { RoutedHtml } from '../components/RoutedHtml';
import { orderedAreas, peopleOn } from '../lib/research';
import { isExternal } from '../lib/features';
import { tagSlug } from '../lib/format';
import { resource, useResource } from '../lib/resource';
import { withBase } from '../lib/urls';
import type { ResearchArea } from '../lib/types';

export const researchBody = resource(
  () => import('../content/research.md') as Promise<{ html: string }>,
);

function ResearchBody() {
  return <RoutedHtml className="prose" html={useResource(researchBody).html} />;
}

/** A paper kept under `public/` needs the deployment's base; a URL does not. */
const href = (value: string): string => (isExternal(value) ? value : withBase(value));

function Area({ area }: { area: ResearchArea }) {
  const people = peopleOn(area);
  const tags = area.tags ?? [];
  const links = area.links ?? [];
  const questions = area.questions ?? [];

  return (
    <article className="research-area">
      <h3>{area.title}</h3>
      <p className="research-area__summary">{area.summary}</p>

      {questions.length > 0 ? (
        <>
          <p className="research-area__label">Open questions</p>
          <ul className="research-area__questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </>
      ) : null}

      {people.length > 0 ? (
        <p className="meta">
          {people.map((person, index) => (
            <span key={person.id}>
              {index > 0 ? <span className="meta__sep">·</span> : null}
              <Link to={`/authors/${person.id}`}>{person.name}</Link>
            </span>
          ))}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <ul className="tag-list" aria-label={`${area.title}: writing`}>
          {tags.map((tag) => (
            <li key={tag}>
              <Link className="tag" to={`/tags/${tagSlug(tag)}`}>
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {links.length > 0 ? (
        <ul className="author-links" aria-label={`${area.title}: material`}>
          {links.map((link) => (
            <li key={link.href}>
              <a
                className="author-links__link"
                href={href(link.href)}
                {...(isExternal(link.href) ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/**
 * The overview from `research.md`, then the areas from `research.ts`.
 *
 * The areas are a list rather than more prose because the three things a
 * reader comes here for — what you work on, where it is going, and what to
 * read next — are the three things prose buries. Work you have moved on from
 * keeps a heading of its own below the current areas rather than being
 * deleted: it is how a line of work is explained, and it is what a reader
 * trying to place a paper from four years ago is looking for.
 */
export function ResearchPage() {
  const { current, past } = orderedAreas(researchAreas);

  return (
    <>
      <h1>Research</h1>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <ResearchBody />
      </Suspense>

      {current.length > 0 ? (
        <>
          <h2 className="section-heading" style={{ marginTop: '2.5rem' }}>
            What I am working on
          </h2>
          {current.map((area) => (
            <Area key={area.title} area={area} />
          ))}
        </>
      ) : null}

      {past.length > 0 ? (
        <>
          <h2 className="section-heading" style={{ marginTop: '2.5rem' }}>
            Earlier work
          </h2>
          {past.map((area) => (
            <Area key={area.title} area={area} />
          ))}
        </>
      ) : null}
    </>
  );
}
