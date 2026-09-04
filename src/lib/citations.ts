import { toBibtex } from './bibtex';
import { formatDate } from './format';
import type { Post } from './types';

export interface Citation {
  id: 'bibtex' | 'apa' | 'ieee' | 'plain';
  label: string;
  text: string;
}

const apaMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' });

const MONTHS_IEEE = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May',
  'June',
  'July',
  'Aug.',
  'Sept.',
  'Oct.',
  'Nov.',
  'Dec.',
];

function parts(name: string): { given: string[]; family: string } {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return { given: [], family: name.trim() };
  return { given: words.slice(0, -1), family: words[words.length - 1] };
}

const initials = (given: string[]): string =>
  given.map((word) => `${word[0]?.toUpperCase() ?? ''}.`).join(' ');

/** "Soleimanzadeh, K." — the surname first, given names as initials. */
function apaName(name: string): string {
  const { given, family } = parts(name);
  return given.length === 0 ? family : `${family}, ${initials(given)}`;
}

/** "K. Soleimanzadeh" — initials first, which is IEEE's order. */
function ieeeName(name: string): string {
  const { given, family } = parts(name);
  return given.length === 0 ? family : `${initials(given)} ${family}`;
}

function joinApa(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
}

function joinIeee(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

const doiOf = (post: Post): string | undefined => post.publication?.doi ?? post.doi;

/**
 * The date a citation carries is the date of the version being cited, so an
 * updated post is cited by its update: that is the text the reader read.
 */
const citedDate = (post: Post): string => post.updated ?? post.date;

/**
 * APA 7 for an online document: author, date, title, site, URL. A DOI replaces
 * the URL when there is one, which is what the style asks for.
 */
export function toApa(post: Post, url: string, site: string): string {
  const names = joinApa(post.authors.map((author) => apaName(author.name)));
  const date = new Date(`${citedDate(post)}T00:00:00Z`);
  const when = Number.isNaN(date.getTime())
    ? citedDate(post).slice(0, 4)
    : `${date.getUTCFullYear()}, ${apaMonth.format(date)} ${date.getUTCDate()}`;
  const doi = doiOf(post);

  return [
    // An initial already ends in a period; APA does not double it.
    names ? `${names.endsWith('.') ? names : `${names}.`} ` : '',
    `(${when}). `,
    `${post.title}. `,
    `${site}. `,
    doi ? `https://doi.org/${doi}` : url,
  ].join('');
}

/** IEEE for an online reference, in the "[Online]. Available:" form. */
export function toIeee(post: Post, url: string, site: string): string {
  const names = joinIeee(post.authors.map((author) => ieeeName(author.name)));
  const date = new Date(`${citedDate(post)}T00:00:00Z`);
  const when = Number.isNaN(date.getTime())
    ? citedDate(post).slice(0, 4)
    : `${MONTHS_IEEE[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  const doi = doiOf(post);

  return [
    names ? `${names}, ` : '',
    `"${post.title}," `,
    `${site}, ${when}. [Online]. Available: ${url}`,
    doi ? `. doi: ${doi}` : '',
  ].join('');
}

/** For pasting into an email or a footnote, where a style is not the point. */
export function toPlain(post: Post, url: string, site: string): string {
  const names = post.authors.map((author) => author.name).join(', ');
  const doi = doiOf(post);

  return [
    names ? `${names}. ` : '',
    `“${post.title}.” `,
    `${site}, ${formatDate(citedDate(post))}. `,
    url,
    doi ? ` (doi:${doi})` : '',
  ].join('');
}

/** Every format the cite block offers, in the order it lists them. */
export function citations(post: Post, url: string, site: string): Citation[] {
  return [
    { id: 'bibtex', label: 'BibTeX', text: toBibtex(post, url) },
    { id: 'apa', label: 'APA', text: toApa(post, url, site) },
    { id: 'ieee', label: 'IEEE', text: toIeee(post, url, site) },
    { id: 'plain', label: 'Plain text', text: toPlain(post, url, site) },
  ];
}
