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
  return (style === 'long' ? longDate : shortDate).format(date);
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
