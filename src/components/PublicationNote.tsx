import { withBase } from '../lib/urls';
import type { Publication, PublicationKind } from '../lib/types';

/**
 * The same four destinations, named for what they are in each case. A project's
 * `code` is the repository rather than "the code for the paper", and its `data`
 * is the dataset itself rather than the data behind a result.
 */
const LINKS: Record<PublicationKind, [keyof Publication, string][]> = {
  paper: [
    ['url', 'Paper'],
    ['pdf', 'PDF'],
    ['code', 'Code'],
    ['data', 'Data'],
  ],
  project: [
    ['url', 'Project'],
    ['pdf', 'Documentation'],
    ['code', 'Repository'],
    ['data', 'Dataset'],
  ],
};

const REGION: Record<PublicationKind, string> = { paper: 'Publication', project: 'Project' };

/** A path under `public/` needs the deployment's base; a URL is left alone. */
const href = (value: string): string => (/^https?:\/\//i.test(value) ? value : withBase(value));

/**
 * What a post says about the work behind it: where it was published or is being
 * reviewed, its DOI, and where the paper itself, its PDF, code and data are. It
 * sits above the text because a reader who arrives from a citation wants the
 * work, not the commentary.
 *
 * A `project` is the same block for something that was never going to be a
 * paper — a library, a dataset, an ongoing effort. It has a name and a
 * repository where a paper has a venue and a year, so the title carries it and
 * the links are labelled for what they lead to.
 */
export function PublicationNote({ publication }: { publication: Publication }) {
  const kind = publication.kind ?? 'paper';
  const heading = [publication.status, publication.venue].filter(Boolean).join(' · ');
  const links = LINKS[kind].filter(([field]) => publication[field]);

  return (
    <aside className={`paper paper--${kind}`} aria-label={REGION[kind]}>
      {publication.title ? <p className="paper__title">{publication.title}</p> : null}

      {heading ? (
        <p className="paper__where">
          {publication.status ? <span className="paper__status">{publication.status}</span> : null}
          {publication.venue ? (
            <span className="paper__venue">
              {publication.venue}
              {publication.year ? `, ${publication.year}` : ''}
            </span>
          ) : null}
        </p>
      ) : null}

      {publication.doi ? (
        <p className="paper__doi">
          <a href={`https://doi.org/${publication.doi}`}>doi:{publication.doi}</a>
        </p>
      ) : null}

      {links.length > 0 ? (
        <ul className="paper__links">
          {links.map(([field, label]) => (
            <li key={field}>
              <a className="paper__link" href={href(publication[field] ?? '')}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
