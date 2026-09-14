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
 * There are two ways to link, and they compose. `[words](where)` inside the
 * text links those words, as many times as the sentence needs. `href` on the
 * entry points the whole thing somewhere: with no links in the text the
 * sentence itself becomes the link, and with them it follows the sentence as
 * the word "more", because an anchor inside an anchor is not a thing a browser
 * renders.
 *
 * Either takes an app route (`/blog/writing-a-post`), a file under `public/`
 * (`/cv.pdf`), a URL, or a `mailto:`. An entry with nowhere to point is still
 * worth listing.
 *
 * Nothing is seeded here on purpose: news is about you, and an invented
 * accepted paper is not a placeholder anyone should have to notice and delete.
 *
 *   export const news: NewsItem[] = [
 *     { date: '2026-03-12', text: 'Paper accepted at MICCAI 2026', href: 'https://doi.org/…' },
 *     { date: '2026-02-02', text: 'Talk at the [Zurich ML meetup](https://example.org/)' },
 *     { date: '2026-01-14', text: 'Wrote up [how the model is calibrated](/blog/a-post)' },
 *   ];
 */
export const news: NewsItem[] = [];
