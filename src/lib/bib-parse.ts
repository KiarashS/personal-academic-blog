export interface BibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
}

const ENTRY = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;

/** Reads a brace- or quote-delimited field value, honouring nested braces. */
function readValue(source: string, start: number): { value: string; end: number } {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) index += 1;

  if (source[index] === '"') {
    let out = '';
    for (let i = index + 1; i < source.length; i += 1) {
      if (source[i] === '"' && source[i - 1] !== '\\') return { value: out, end: i + 1 };
      out += source[i];
    }
    return { value: out, end: source.length };
  }

  if (source[index] === '{') {
    let depth = 0;
    let out = '';
    for (let i = index; i < source.length; i += 1) {
      const char = source[i];
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return { value: out, end: i + 1 };
      }
      if (i > index) out += char;
    }
    return { value: out, end: source.length };
  }

  // A bare value: a number, or a macro this parser does not expand.
  let out = '';
  while (index < source.length && !/[,}]/.test(source[index])) {
    out += source[index];
    index += 1;
  }
  return { value: out.trim(), end: index };
}

/** Strips the braces authors use to protect capitalisation, e.g. {DNA}. */
function clean(value: string): string {
  return value
    .replace(/[{}]/g, '')
    .replace(/\\&/g, '&')
    .replace(/~/g, ' ')
    .replace(/--/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A small BibTeX reader: enough for a hand-maintained publication list, and
 * deliberately not a full parser — @string macros and @preamble are ignored.
 */
export function parseBib(source: string): BibEntry[] {
  const text = source.replace(/^\s*%.*$/gm, '');
  const entries: BibEntry[] = [];

  ENTRY.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENTRY.exec(text)) !== null) {
    const type = match[1].toLowerCase();
    if (type === 'string' || type === 'preamble' || type === 'comment') continue;

    const fields: Record<string, string> = {};
    let index = match.index + match[0].length;
    let depth = 1;

    while (index < text.length && depth > 0) {
      const nameMatch = /\s*([\w-]+)\s*=/.exec(text.slice(index, index + 200));
      if (!nameMatch || nameMatch.index !== 0) {
        if (text[index] === '}') depth -= 1;
        index += 1;
        continue;
      }
      const name = nameMatch[1].toLowerCase();
      const { value, end } = readValue(text, index + nameMatch[0].length);
      fields[name] = clean(value);
      index = end;
      while (index < text.length && /[\s,]/.test(text[index])) index += 1;
      if (text[index] === '}') break;
    }

    entries.push({ key: match[2], type, fields });
    ENTRY.lastIndex = Math.max(ENTRY.lastIndex, index);
  }

  return entries;
}

export function bibAuthors(entry: BibEntry): string[] {
  const raw = entry.fields.author ?? entry.fields.editor ?? '';
  if (!raw) return [];
  return raw
    .split(/\s+and\s+/i)
    .map((name) => {
      const trimmed = name.trim();
      if (!trimmed.includes(',')) return trimmed;
      const [family, given] = trimmed.split(',', 2);
      return `${given.trim()} ${family.trim()}`.trim();
    })
    .filter(Boolean);
}

export function bibYear(entry: BibEntry): number {
  const year = Number.parseInt(entry.fields.year ?? '', 10);
  return Number.isFinite(year) ? year : 0;
}

/** The venue, whichever field this entry type happens to use for it. */
export function bibVenue(entry: BibEntry): string {
  return (
    entry.fields.journal ??
    entry.fields.booktitle ??
    entry.fields.publisher ??
    entry.fields.school ??
    entry.fields.institution ??
    entry.fields.howpublished ??
    ''
  );
}

export function bibUrl(entry: BibEntry): string | undefined {
  if (entry.fields.doi) return `https://doi.org/${entry.fields.doi}`;
  if (entry.fields.eprint && /arxiv/i.test(entry.fields.archiveprefix ?? 'arxiv')) {
    return `https://arxiv.org/abs/${entry.fields.eprint}`;
  }
  return entry.fields.url || undefined;
}

const FIELD_ORDER = [
  'author',
  'editor',
  'title',
  'journal',
  'booktitle',
  'publisher',
  'school',
  'institution',
  'volume',
  'number',
  'pages',
  'year',
  'doi',
  'eprint',
  'url',
];

/** Re-emits an entry as BibTeX, so the copy button hands over clean source. */
export function formatBib(entry: BibEntry): string {
  const names = Object.keys(entry.fields).sort(
    (a, b) => (FIELD_ORDER.indexOf(a) + 1 || 99) - (FIELD_ORDER.indexOf(b) + 1 || 99),
  );
  const width = Math.max(...names.map((name) => name.length), 0);
  const body = names.map((name) => `  ${name.padEnd(width)} = {${entry.fields[name]}}`).join(',\n');
  return `@${entry.type}{${entry.key},\n${body}\n}`;
}
