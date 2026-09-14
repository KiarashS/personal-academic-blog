import type { NewsItem } from '../lib/types';

/**
 * What has happened lately: a paper accepted, a talk given, a move, a release.
 *
 * The newest few appear on the front page under the lines, and the whole list
 * at `/news` when the `news` feature is on. Order does not matter; they are
 * sorted by date for you.
 *
 * Keep each entry to a sentence. The front page gives it one line, and a line
 * that wraps three times is a post pretending to be news.
 *
 * There are two ways to link. `[words](where)` inside the text links those
 * words, as many times as the sentence needs. `href` points the entry as a
 * whole somewhere and is read as "more" after the sentence, whether the text
 * has links of its own or not — the sentence is never turned into a link
 * itself, so the words stay words and the handle stays a handle.
 *
 * Either takes an app route (`/blog/writing-a-post`), a file under `public/`
 * (`/cv.pdf`), a URL, or a `mailto:`. An entry with nowhere to point is still
 * worth listing.
 *
 * The six below are examples, and they say so in their own words rather than
 * impersonating news — an invented accepted paper is a claim about you, on
 * your site, and the one person who would never think to check it is you.
 * Delete them as the real ones arrive. What they should look like:
 *
 *   { date: '2026-03-12', text: 'Paper accepted at MICCAI 2026', href: 'https://doi.org/…' },
 *   { date: '2026-02-02', text: 'Talk at the [Zurich ML meetup](https://example.org/)' },
 *   { date: '2026-01-14', text: 'Wrote up [how the model is calibrated](/blog/a-post)' },
 */
export const news: NewsItem[] = [
  // Dated ahead, so it sorts above everything: how an announcement is made.
  {
    date: '2026-11-20',
    text: 'Example: an entry dated ahead sits at the top until the day passes',
  },
  // Nothing to point at, which is a complete entry.
  { date: '2026-09-08', text: 'Example: a line on its own, pointing nowhere' },
  // Words inside the sentence carrying the link.
  {
    date: '2026-08-19',
    text: 'Example: a line that links [some of its own words](/blog/writing-a-post)',
  },
  // A target for the entry as a whole, which reads as "more" at the end.
  { date: '2026-07-02', text: 'Example: a line whose target sits after it', href: '/about' },
  // Both at once: the sentence keeps its links and the entry keeps its handle.
  {
    date: '2026-05-15',
    text: 'Example: [inline links](/tags) and [a second one](/archive) beside a target of its own',
    href: '/blog',
  },
  // The fourth newest, which is where the front page stops and the link out appears.
  {
    date: '2026-03-04',
    text: 'Example: the front page shows three, and leaves the rest to the news page',
    href: '/news',
  },
];
