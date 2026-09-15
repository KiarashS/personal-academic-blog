const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * The short form with every month three letters wide.
 *
 * en-GB abbreviates September to "Sept" and nothing else to four, so in a
 * column of dates that one month carries its year a character further right
 * than the eleven around it. Trimming the month part is enough: the others are
 * already three, and the digits are set with tabular figures, so month and
 * year then land in the same place on every line.
 */
function shortForm(date: Date): string {
  const { day, month, year } = shortParts(date);
  return `${day} ${month} ${year}`;
}

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

/** The short form in pieces, for a column that sets each piece under the last. */
function shortParts(date: Date): DateParts {
  const parts = shortDate.formatToParts(date);
  const take = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return { day: take('day'), month: take('month').slice(0, 3), year: take('year') };
}

/**
 * A date split into day, month and year, or nothing if the value is not one.
 * `formatDate` is the same thing joined by spaces; this is for the news list,
 * which gives each piece a column of its own.
 */
export function dateParts(value: string): DateParts | null {
  const date = parse(value);
  return date ? shortParts(date) : null;
}

function parse(value: string): Date | null {
  if (!value) return null;
  // Dates are authored as plain `YYYY-MM-DD`; forcing UTC keeps them from
  // sliding a day backwards for readers west of Greenwich.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string, style: 'long' | 'short' = 'long'): string {
  const date = parse(value);
  if (!date) return value;
  return style === 'long' ? longDate.format(date) : shortForm(date);
}

export function isoDate(value: string): string {
  const date = parse(value);
  return date ? date.toISOString().slice(0, 10) : value;
}

export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
