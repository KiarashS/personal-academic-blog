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
 * Emoji work two ways. Paste the character — 🎓, flags and the joined ones all
 * render — or write GitHub's shortcode, `:mortar_board:`, and the build reads
 * it. Those are the names `npm run emoji` searches; anything it does not
 * recognise is left on the page as you typed it, which is how `12:30:45` and a
 * `Note:` opening a line survive.
 *
 * Only the codes this file uses are sent to a reader, so the convenience costs
 * a few bytes rather than the 36KB of names gemoji holds. It is also why the
 * scan is of this file alone: a shortcode in `slides.ts` is still just text.
 *
 * One thing to know before using them. A screen reader says the emoji's name
 * out loud, so one at the front of a line is a word the reader hears before the
 * news ("graduation cap, paper accepted at…"), and it lands in the accessible
 * name of the entry's "more" link too, which is built from the sentence.
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
    text: 'Example: an entry dated ahead sits at the top until the day passes. This is a multi-line news. Check it!',
  },
  // Nothing to point at, which is a complete entry — and a shortcode, which
  // the build reads. `npm run emoji <term>` searches the names.
  {
    date: '2026-09-08',
    text: ':mortar_board: Example: a line on its own, pointing nowhere',
  },
  // Words inside the sentence carrying the link.
  {
    date: '2026-08-19',
    text: 'Example: a line that links [some of its own words](/blog/writing-a-post)',
    href: 'https://www.example.com',
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
