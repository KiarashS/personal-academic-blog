import { news as written } from '../content/news';
import { siteConfig } from '../site.config';
import { emojify } from './emoji';
import { isEnabled } from './features';
import { unsafeHrefs } from './inline-links';
import { todayUtc } from './post-builder';
import type { NewsItem } from './types';

/**
 * The entries as written, with their shortcodes read.
 *
 * Once, here, rather than in the component: everything below reads `news`, and
 * so do the build's warnings, so an entry says the same thing to the front
 * page, to `/news`, to a screen reader and to the line the build prints about
 * it. Doing it at render time would have left the warnings quoting the version
 * nobody sees.
 */
const news: NewsItem[] = written.map((item) => ({ ...item, text: emojify(item.text) }));

/** Newest first. Entries dated ahead sort to the top, where an announcement belongs. */
export function sortNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * `today` moved back by `months`, as `YYYY-MM-DD`. Month arithmetic in UTC, so
 * a window measured in months does not drift with the reader's timezone; a day
 * either way is beneath the resolution of the question it answers.
 */
function monthsBefore(today: string, months: number): string {
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 - months, day)).toISOString().slice(0, 10);
}

export interface FrontPageNews {
  /** What the front page lists, newest first. Empty means it renders nothing. */
  items: NewsItem[];
  /** Whether there are entries the front page is not showing. */
  more: boolean;
}

export interface NewsOptions {
  /** How many entries to show. 0 is off. */
  limit: number;
  /** Months of silence after which the block hides itself. 0 never hides it. */
  freshMonths: number;
  today: string;
}

/**
 * What the front page shows, which is nothing at all in three cases: the count
 * is zero, there are no entries, or the newest is older than the freshness
 * window.
 *
 * That last one is the point of this function. A news list that stopped two
 * years ago tells a visitor something worse than no news list does, and it is
 * the kind of decay nobody notices on their own site, because they are not the
 * one arriving at it. So the block retires itself and the build says why.
 */
export function frontPageNews(items: NewsItem[], options: NewsOptions): FrontPageNews {
  const sorted = sortNews(items);
  if (options.limit <= 0 || sorted.length === 0) return { items: [], more: false };

  if (options.freshMonths > 0) {
    const cutoff = monthsBefore(options.today, options.freshMonths);
    if (sorted[0].date < cutoff) return { items: [], more: false };
  }

  return { items: sorted.slice(0, options.limit), more: sorted.length > options.limit };
}

/**
 * What the build should say about the list, if anything. A stale list is worth
 * a word at build time: that is the moment its owner is looking, and the front
 * page has just dropped the block without being asked.
 */
export function newsWarning(items: NewsItem[], options: NewsOptions): string | undefined {
  const sorted = sortNews(items);
  if (options.limit <= 0 || sorted.length === 0 || options.freshMonths <= 0) return undefined;
  if (sorted[0].date >= monthsBefore(options.today, options.freshMonths)) return undefined;

  return (
    `news: the newest entry is ${sorted[0].date}, more than ${options.freshMonths} months ` +
    'old, so the front page is leaving the list off. Add an entry, or set ' +
    '`home.newsFreshMonths` to 0 to show it however old it is.'
  );
}

/**
 * Links in an entry's text whose target the renderer will not make a link of.
 *
 * `[the paper](doi.org/10.0000/x)` has no scheme and is not a path, so it
 * renders as the words alone — the link is silently gone, and the one person
 * who will never notice is the one who wrote it. Hence a line at build time.
 */
export function newsLinkProblems(items: NewsItem[]): string[] {
  return items.flatMap((item) =>
    unsafeHrefs(item.text).map(
      (href) =>
        `news: “${href}” in the entry dated ${item.date} is not a link the page will make. ` +
        'Give it a scheme (https://, mailto:) or write it as a path (/blog/…).',
    ),
  );
}

const options = (): NewsOptions => ({
  limit: siteConfig.home.news,
  freshMonths: siteConfig.home.newsFreshMonths,
  today: todayUtc(),
});

/** Every entry, newest first. */
export const allNews = (): NewsItem[] => sortNews(news);

/**
 * The front page's block, from the configured list.
 *
 * The date is read when the module loads, which on a prerendered page is the
 * build. A reader who arrives long after that gets the freshness rule applied
 * again in their own browser, so a list that goes quiet between deployments
 * disappears for them without waiting for the next one.
 */
export const homeNews = (): FrontPageNews => frontPageNews(news, options());

/**
 * Whether `/news` exists. The flag alone decides, as it does for the slides
 * page: an empty list gets a page saying there is nothing yet, which is a
 * better answer than a nav entry pointing at a route that was never built.
 */
export const newsPageEnabled = (): boolean => isEnabled('news');

/** Everything the build should say about the configured list. */
export function configuredNewsWarnings(): string[] {
  const quiet = newsWarning(news, options());
  return [...(quiet ? [quiet] : []), ...newsLinkProblems(news)];
}
