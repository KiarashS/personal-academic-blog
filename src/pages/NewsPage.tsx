import { NewsList } from '../components/NewsList';
import { allNews } from '../lib/news';
import type { NewsItem } from '../lib/types';

function byYear(items: NewsItem[]): [string, NewsItem[]][] {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    const year = item.date.slice(0, 4) || 'Undated';
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/**
 * Every entry, grouped by year like the archive. The grouping is what a list
 * this shape needs once it is long: dates alone stop being a landmark by the
 * fortieth line, and a year is the unit anyone scanning for "what was he doing
 * then" is actually looking for.
 */
export function NewsPage() {
  const items = allNews();
  const grouped = byYear(items);

  return (
    <>
      <h1>News</h1>
      {items.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        grouped.map(([year, list]) => (
          <section key={year} className="archive-year">
            <h2 className="section-heading">{year}</h2>
            <NewsList items={list} label={`News from ${year}`} />
          </section>
        ))
      )}
    </>
  );
}
