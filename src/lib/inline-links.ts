/**
 * The smallest useful piece of markdown: `[words](where)` inside a line that
 * is otherwise plain text.
 *
 * News entries live in a TypeScript file rather than in markdown, so nothing
 * in the build pipeline touches them — and a whole markdown processor for one
 * inline construct would be a library where five lines of regex do. Everything
 * else markdown offers is deliberately absent: an entry is one sentence, and a
 * sentence with a heading or a list in it is a post.
 */
export interface Segment {
  text: string;
  /** Present on the runs that are links. */
  href?: string;
}

// The target allows one level of balanced parentheses, because real URLs have
// them — en.wikipedia.org/wiki/Cauchy_(distribution) is not an edge case — and
// stopping at the first `)` would take half the address and leave the rest as
// punctuation in the sentence.
const LINK = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

/**
 * Schemes a link may use. A path, a fragment and the two schemes anyone
 * actually writes; `javascript:` and friends are not links anyone means to put
 * in a news entry, and React renders them without complaint.
 */
const SAFE = /^(?:https?:\/\/|mailto:|\/|#)/i;

export const isSafeHref = (href: string): boolean => SAFE.test(href);

/**
 * The line split into runs of plain text and runs that are links. A link whose
 * target is not one of the safe kinds comes back as its own text, so a typo in
 * a scheme reads as words rather than shipping something odd into an anchor;
 * `newsProblems` is what tells the author about it.
 */
export function parseInlineLinks(line: string): Segment[] {
  const segments: Segment[] = [];
  let at = 0;

  for (const match of line.matchAll(LINK)) {
    const [whole, text, href] = match;
    const start = match.index;
    if (start > at) segments.push({ text: line.slice(at, start) });
    segments.push(isSafeHref(href) ? { text, href } : { text });
    at = start + whole.length;
  }

  if (at < line.length) segments.push({ text: line.slice(at) });
  return segments.length > 0 ? segments : [{ text: line }];
}

/** The line with its markup removed: what a link to the whole entry is called. */
export const plainText = (line: string): string =>
  parseInlineLinks(line)
    .map((segment) => segment.text)
    .join('');

/** Every unsafe target in a line, for the build to report. */
export const unsafeHrefs = (line: string): string[] =>
  [...line.matchAll(LINK)].map((match) => match[2]).filter((href) => !isSafeHref(href));
