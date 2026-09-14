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
 * `href` is optional and takes an app route (`/blog/writing-a-post`), a file
 * under `public/` (`/cv.pdf`), or a URL. An entry with nowhere to point is
 * still worth listing.
 *
 * Nothing is seeded here on purpose: news is about you, and an invented
 * accepted paper is not a placeholder anyone should have to notice and delete.
 *
 *   export const news: NewsItem[] = [
 *     { date: '2026-03-12', text: 'Paper accepted at MICCAI 2026', href: 'https://doi.org/…' },
 *     { date: '2026-02-02', text: 'Talk on calibration in triage models, Zurich ML meetup' },
 *   ];
 */
export const news: NewsItem[] = [];
