import type { SlideDeck } from '../lib/types';

/**
 * Talks and lectures, rendered at `/slides` when the `slides` feature is on.
 * Newest first is done for you, so add entries in whatever order suits you.
 *
 * Everything here is placeholder. Replace it with your own, or leave the list
 * empty and the page will say there is nothing yet rather than break.
 *
 * `slides`, `video`, `code` and `paper` each take a URL, or a path under
 * `public/` such as `/slides/ai-in-medicine.pdf`, which picks up the
 * deployment's base path. The seeded entries link nothing local, so that
 * `npm run links` passes on a checkout with an empty `public/`.
 */
export const slides: SlideDeck[] = [
  {
    title: 'AI in Medicine',
    date: '2026-04-12',
    event: 'Placeholder seminar series',
    summary: 'What changes when a model’s output reaches a patient rather than a benchmark.',
  },
  {
    title: 'Regular expressions, from the inside',
    date: '2025-11-03',
    event: 'Placeholder workshop',
    summary: 'Backtracking, why it is slow, and when a parser is the better tool.',
    code: 'https://github.com/KiarashS',
  },
];
