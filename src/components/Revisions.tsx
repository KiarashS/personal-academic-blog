import { formatDate, isoDate } from '../lib/format';
import type { Revision } from '../lib/types';

/**
 * What changed since the post went up, oldest first. A bare list of dates would
 * say only that something changed; the note is the part that tells a reader
 * whether to read it again, so a revision without one is not written down.
 */
export function Revisions({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) return null;

  return (
    <section className="revisions" id="revisions" aria-labelledby="revisions-heading">
      <h2 className="section-heading" id="revisions-heading">
        Revisions
      </h2>
      <ol className="revisions__list">
        {revisions.map((revision) => (
          <li key={`${revision.date}-${revision.note}`}>
            <time className="revisions__date" dateTime={isoDate(revision.date)}>
              {formatDate(revision.date, 'short')}
            </time>
            {revision.note ? <span className="revisions__note">{revision.note}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
