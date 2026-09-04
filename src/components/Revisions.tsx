import { formatDate, isoDate } from '../lib/format';
import type { Revision } from '../lib/types';

/**
 * What changed since the post went up, newest first, because the question a
 * returning reader has is what has changed since they were last here. A bare
 * list of dates would say only that something did; the note is the part that
 * tells them whether to read it again.
 */
export function Revisions({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) return null;

  return (
    <section className="revisions" id="revisions" aria-labelledby="revisions-heading">
      <h2 className="section-heading" id="revisions-heading">
        Revisions
      </h2>
      <ul className="revisions__list">
        {revisions.map((revision) => (
          <li key={`${revision.date}-${revision.note}`}>
            <time className="revisions__date" dateTime={isoDate(revision.date)}>
              {formatDate(revision.date, 'short')}
            </time>
            {revision.note ? <span className="revisions__note">{revision.note}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
