import type { Opening } from '../lib/types';

/**
 * Positions, rendered at `/openings` when the `openings` feature is on, under
 * the text of `src/content/openings.md`. In the order here.
 *
 * Everything below is placeholder. Replace it with real positions, or empty
 * the list: the page then says nothing is open, and `openings.md` is where to
 * say whether to write anyway.
 *
 * `kind` is one of phd, postdoc, masters, bachelors, researcher, engineer,
 * intern and other, and names the badge. `deadline` is `YYYY-MM-DD`: the
 * position is listed through that day and not after, and the build says when
 * one has closed so it can be taken out. Leave it out for open until filled.
 *
 * `apply` takes a `url` for a portal, an `email` to write to (with `subject`
 * filled into the mail), or both, and a `note` on what to send. `details` is
 * the full advertisement: a path under `public/` or a URL.
 */
export const openings: Opening[] = [
  {
    title: 'An example PhD position',
    kind: 'phd',
    summary:
      'Replace this with two or three sentences on the project: the question, why it matters, and what the student would find out.',
    work: [
      'What the student will do in the first year',
      'The methods they will learn and use',
      'Who they will work with',
    ],
    requirements: [
      'The degree they need, and in what',
      'The skills that matter most',
      'Anything that would help but is not required',
    ],
    offer: ['Funding for the length of the position', 'Supervision, training and travel'],
    start: 'September 2027',
    duration: '4 years',
    funding: 'Fully funded',
    location: 'The group’s city',
    deadline: '2027-01-31',
    apply: {
      email: 'pi@example.org',
      subject: 'PhD application',
      note: 'A CV, a transcript and a one-page statement of interest.',
    },
  },
  {
    title: 'An example postdoc',
    kind: 'postdoc',
    summary:
      'An opening can be short. With no deadline it is open until filled, and stays listed until it is removed from openings.ts.',
    start: 'As soon as possible',
    duration: '2 years',
    apply: { url: 'https://example.org/jobs/postdoc' },
  },
];
