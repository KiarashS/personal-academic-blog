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
