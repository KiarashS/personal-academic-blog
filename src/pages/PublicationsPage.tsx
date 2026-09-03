import entries from '../content/publications.bib';
import { CopyButton } from '../components/CopyButton';
import { bibAuthors, bibUrl, bibVenue, bibYear, formatBib } from '../lib/bib-parse';
import type { BibEntry } from '../lib/bib-parse';

function byYear(list: BibEntry[]): [number, BibEntry[]][] {
  const groups = new Map<number, BibEntry[]>();
  for (const entry of list) {
    const year = bibYear(entry);
    groups.set(year, [...(groups.get(year) ?? []), entry]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

function Publication({ entry }: { entry: BibEntry }) {
  const authors = bibAuthors(entry);
  const venue = bibVenue(entry);
  const url = bibUrl(entry);
  const { volume, number, pages } = entry.fields;

  return (
    <li className="publication">
      <p className="publication__title">
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
          {volume ? ` ${volume}` : ''}
          {number ? `(${number})` : ''}
          {pages ? `, ${pages}` : ''}
        </p>
      ) : null}
      <details className="cite cite--compact">
        <summary>BibTeX</summary>
        <div className="code-block">
          <CopyButton text={formatBib(entry)} label="BibTeX to clipboard" />
          <pre tabIndex={0}>
            <code>{formatBib(entry)}</code>
          </pre>
        </div>
      </details>
    </li>
  );
}

export function PublicationsPage() {
  const grouped = byYear(entries);

  return (
    <>
      <h1>Publications</h1>
      {entries.length === 0 ? (
        <p className="empty">
          Nothing here yet. Add entries to <code>src/content/publications.bib</code>.
        </p>
      ) : (
        <>
          <p className="lede">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}, newest first. Generated from{' '}
            <code>src/content/publications.bib</code>.
          </p>
          {grouped.map(([year, list]) => (
            <section key={year} className="publication-year">
              <h2 className="section-heading">{year || 'Undated'}</h2>
              <ol className="publication-list">
                {list.map((entry) => (
                  <Publication key={entry.key} entry={entry} />
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </>
  );
}
