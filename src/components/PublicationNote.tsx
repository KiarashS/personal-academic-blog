import { withBase } from '../lib/urls';
import type { Publication } from '../lib/types';

const LINKS: [keyof Publication, string][] = [
  ['url', 'Paper'],
  ['pdf', 'PDF'],
  ['code', 'Code'],
  ['data', 'Data'],
];

/** A path under `public/` needs the deployment's base; a URL is left alone. */
const href = (value: string): string => (/^https?:\/\//i.test(value) ? value : withBase(value));

/**
 * What a post says about the work behind it: where it was published or is
 * being reviewed, its DOI, and where the paper itself, its PDF, code and data
 * are. It sits above the text because a reader who arrives from a citation
 * wants the paper, not the commentary.
 */
export function PublicationNote({ publication }: { publication: Publication }) {
  const heading = [publication.status, publication.venue].filter(Boolean).join(' · ');
  const links = LINKS.filter(([field]) => publication[field]);

  return (
    <aside className="paper" aria-label="Publication">
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
