import type { Member } from '../lib/types';

/**
 * The group, rendered at `/people` when the `people` feature is on: one
 * section per role in the order PI, management team, researchers, postdocs,
 * PhD, Master's and Bachelor's students, then the alumni. A role with nobody in
 * it is left out. Within a role the order here is the order on the page.
 *
 * Everything below is placeholder, one of each so every section can be seen.
 * Replace it with the group's own.
 *
 * `role` is one of pi, management, researcher, postdoc, phd, masters and
 * bachelors. Giving someone a `left` year makes them alumni; they keep the
 * role they had, and `now` says where they went.
 *
 * `author` is an id from `src/content/authors.ts`: the name links to their
 * author page, and whatever is left out here comes from that record.
 *
 * `photo` is a path under `public/` or a URL; put photos in `public/people/`.
 * The build writes a 256px copy of each one under `public/`, and without a
 * photo the card shows initials. `links` take the same values as an author's:
 * a full URL or the bare id the service uses.
 */
export const people: Member[] = [
  {
    name: 'Example PI',
    role: 'pi',
    title: 'Associate Professor',
    bio: 'Leads the group. Replace this with a sentence or two on the research and what the group is for.',
    interests: ['First subject', 'Second subject'],
    email: 'pi@example.org',
    links: { scholar: 'example', github: 'example' },
  },
  {
    name: 'Example Manager',
    role: 'management',
    title: 'Lab manager',
    email: 'manager@example.org',
  },
  {
    name: 'Co-author Name',
    role: 'researcher',
    title: 'Research scientist',
    // Linked to the co-author record, which supplies the bio, the interests
    // and the email: an author who is also a member is written down once.
    author: 'coauthor',
    joined: '2024',
  },
  {
    name: 'Example Postdoc',
    role: 'postdoc',
    joined: '2025',
    interests: ['A third subject'],
    links: { orcid: '0000-0000-0000-0000' },
  },
  {
    name: 'Example PhD Student',
    role: 'phd',
    pronouns: 'she/her',
    joined: '2024',
    links: { github: 'example' },
  },
  {
    name: 'Example Master’s Student',
    role: 'masters',
    joined: '2026',
    affiliation: 'Co-supervised with another university',
  },
  {
    name: 'Example Bachelor’s Student',
    role: 'bachelors',
    joined: '2026',
  },
  {
    name: 'Example Alumna',
    role: 'phd',
    joined: '2019',
    left: '2024',
    now: 'Postdoc, another university',
    thesis: { title: 'The title of her thesis' },
  },
  {
    name: 'Example Alumnus',
    role: 'masters',
    joined: '2022',
    left: '2023',
    now: 'Data scientist, a company',
  },
];
