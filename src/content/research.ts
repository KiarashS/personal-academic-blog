import type { ResearchArea } from '../lib/types';

/**
 * Lines of work, rendered at `/research` when the `research` feature is on.
 * Current areas come first and `status: 'past'` moves one below them; within
 * each group the order here is the order on the page.
 *
 * Everything below is placeholder. Replace it with your own, or empty the
 * list and the page is whatever `src/content/research.md` says — which is a
 * reasonable way to run the page if your work is one thing rather than three.
 *
 * `tags` name tags your posts already use, and the build says so if one names
 * a tag no published post carries. `people` are ids from
 * `src/content/authors.ts`. `links` take a URL or a path under `public/`.
 */
export const researchAreas: ResearchArea[] = [
  {
    title: 'An example area',
    summary:
      'Replace this with a paragraph on what the work is: the problem, the approach, and what makes it hard. Two or three sentences is plenty — the questions below carry the rest.',
    questions: [
      'What open question are you working on right now?',
      'What would have to be true for the approach to work?',
      'What are you not doing, and why?',
    ],
    tags: ['guide'],
    people: ['you'],
  },
  {
    title: 'A second example area',
    summary:
      'An area with nothing but a title and a summary is fine. Add questions, tags, people and links only where you have them.',
  },
];
