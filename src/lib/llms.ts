import { bibAuthors, bibUrl, bibVenue, bibYear, type BibEntry } from './bib-parse';

/*
 * `/llms.txt`: the site described for a language model, in the format
 * https://llmstxt.org proposes. A Markdown file at the root: the name as an
 * `#` heading, a one-line summary as a quotation, a paragraph about the
 * person, then `##` sections of links, each `- [Title](url): note`. A tool
 * asked about you can read this instead of guessing from the pages, so what
 * it says about your work comes from your own words.
 *
 * Built from what the site already holds: the owner's record, the pages that
 * are switched on, `publications.bib` and the listed posts. Unlisted posts and
 * drafts are never in it, as they are in no other list. An email address is
 * left out: the file is written for machines, and machines harvest addresses.
 */

export interface LlmsInput {
  title: string;
  summary: string;
  /** The owner, as the paragraph after the summary. */
  person: {
    name: string;
    role?: string;
    affiliation?: string;
    /** One line about the work: the front page's tagline. */
    tagline?: string;
    bio?: string;
    interests: string[];
  };
  /** Written in by hand: how to cite you, what to ask first, what not to assume. */
  note: string;
  profiles: { label: string; href: string }[];
  pages: { title: string; url: string; note: string }[];
  publications: BibEntry[];
  selected: string[];
  posts: { title: string; url: string; date: string; summary: string }[];
  /** The feed, the sitemap: what a crawler should read next. */
  more: { title: string; url: string }[];
}

/** One line of the file. Brackets and line breaks would break the link syntax. */
const text = (value: string): string => value.replace(/\s+/g, ' ').replace(/[[\]]/g, '').trim();

const item = (title: string, url: string | undefined, note = ''): string => {
  const head = url ? `[${text(title)}](${url})` : text(title);
  return note ? `- ${head}: ${text(note)}` : `- ${head}`;
};

function citation(entry: BibEntry): string {
  const authors = bibAuthors(entry);
  const shown =
    authors.length > 4 ? `${authors.slice(0, 3).join(', ')} et al.` : authors.join(', ');
  const year = bibYear(entry);
  // Each part ends its own sentence; a part that already ends in a full stop,
  // like "et al.", does not get a second one.
  return [shown, bibVenue(entry), year ? String(year) : '']
    .filter(Boolean)
    .map((part) => part.replace(/\.$/, ''))
    .join('. ');
}

export function llmsTxt(input: LlmsInput): string {
  const { person } = input;
  const who = [person.role, person.affiliation].filter(Boolean).join(', ');
  const about = [
    `${person.name}${who ? `, ${who}` : ''}.`,
    person.tagline ? `${person.tagline.replace(/\.$/, '')}.` : '',
    person.bio ?? '',
    person.interests.length > 0 ? `Research interests: ${person.interests.join('; ')}.` : '',
  ]
    .map(text)
    .filter(Boolean)
    .join(' ');

  const sections: [string, string[]][] = [
    ['Profiles', input.profiles.map((link) => item(link.label, link.href))],
    ['Pages', input.pages.map((page) => item(page.title, page.url, page.note))],
    [
      'Selected work',
      input.selected
        .map((key) => input.publications.find((entry) => entry.key === key))
        .filter((entry): entry is BibEntry => entry !== undefined)
        .map((entry) => item(entry.fields.title ?? entry.key, bibUrl(entry), citation(entry))),
    ],
    [
      'Publications',
      [...input.publications]
        .sort((a, b) => bibYear(b) - bibYear(a))
        .map((entry) => item(entry.fields.title ?? entry.key, bibUrl(entry), citation(entry))),
    ],
    [
      'Blog posts',
      input.posts.map((post) => item(post.title, post.url, `${post.date}. ${post.summary}`)),
    ],
    // "Optional" is the format's name for links a reader with little room can skip.
    ['Optional', input.more.map((link) => item(link.title, link.url))],
  ];

  return [
    `# ${text(input.title)}`,
    '',
    `> ${text(input.summary)}`,
    '',
    about,
    ...(input.note.trim() ? ['', input.note.trim()] : []),
    ...sections
      .filter(([, lines]) => lines.length > 0)
      .flatMap(([heading, lines]) => ['', `## ${heading}`, '', ...lines]),
    '',
  ].join('\n');
}
