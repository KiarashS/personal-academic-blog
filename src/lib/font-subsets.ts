/**
 * Which of the body face's extra subsets a page's text actually uses.
 *
 * Source Serif 4 is vendored in three pieces that share one family name:
 * basic Latin, which every page needs and every page preloads, and Latin
 * Extended and Greek, which the browser fetches only when some character on
 * the page falls in their `unicode-range`. Found only once the page is laid
 * out, a subset arrives after the text is on screen, and until it swaps in a
 * name like "Łukasiewicz" has its first letter in another typeface. The
 * prerenderer asks this which subsets a page's text needs and preloads those,
 * as it does the diagram face for pages with a diagram, so the file comes with
 * the stylesheet instead.
 *
 * Only text set in the serif counts. Maths is KaTeX's own Computer Modern,
 * code is monospace and diagrams are Source Sans, so a formula full of Greek
 * does not make a page fetch the serif's Greek.
 *
 * The ranges are fontsource's, and must match `src/styles/fonts.css`, which
 * a test checks.
 */

export type FontSubset = 'latin-ext' | 'greek';

type Range = readonly [number, number];

const hex = (spec: string): Range[] =>
  spec.split(',').map((part) => {
    const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(from, 16), parseInt(to, 16)] as const;
  });

/** As fontsource 5.3.0 declares them, one string per subset. */
export const SUBSET_RANGES: Record<FontSubset, string> = {
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,' +
    'U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,' +
    'U+A720-A7FF',
  greek: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF',
};

/*
 * The basic Latin file claims a few of the same points (the combining marks
 * U+0304, U+0308 and U+0329). A character the preloaded file already covers
 * never needs the extra one.
 */
const LATIN = hex(
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,' +
    'U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
);

const RANGES = Object.fromEntries(
  Object.entries(SUBSET_RANGES).map(([name, spec]) => [name, hex(spec)]),
) as Record<FontSubset, Range[]>;

const within = (code: number, ranges: Range[]): boolean =>
  ranges.some(([from, to]) => code >= from && code <= to);

/**
 * `html` with every element `tag` removed, contents and all, counting nesting
 * so that a span inside a span does not end the removal early. `remove` picks
 * which of them go by their opening tag; by default, all.
 */
function without(html: string, tag: string, remove: (open: string) => boolean = () => true) {
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  let out = '';
  let from = 0;
  let depth = 0;

  for (const match of html.matchAll(tags)) {
    const [text, slash] = match;
    const at = match.index;
    if (depth === 0) {
      if (slash || !remove(text)) continue;
      out += html.slice(from, at);
      if (text.endsWith('/>')) from = at + text.length;
      else depth = 1;
      continue;
    }
    if (text.endsWith('/>')) continue;
    depth += slash ? -1 : 1;
    if (depth === 0) from = at + text.length;
  }

  // An element left open runs to the end, and none of it is text we want.
  return depth === 0 ? out + html.slice(from) : out;
}

const isKatex = (open: string): boolean => /\bclass="(?:[^"]*\s)?katex(?:\s[^"]*)?"/.test(open);

/** The text of `html` that the body serif sets. */
export function serifText(html: string): string {
  let text = without(html, 'span', isKatex);
  for (const tag of ['pre', 'code', 'svg', 'math', 'script', 'style']) {
    text = without(text, tag);
  }
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)));
}

/** The subsets beyond basic Latin that the page's serif text reaches into. */
export function fontSubsetsFor(html: string): FontSubset[] {
  const found = new Set<FontSubset>();
  for (const char of serifText(html)) {
    const code = char.codePointAt(0) ?? 0;
    if (within(code, LATIN)) continue;
    for (const name of Object.keys(RANGES) as FontSubset[]) {
      if (within(code, RANGES[name])) found.add(name);
    }
  }
  return (Object.keys(RANGES) as FontSubset[]).filter((name) => found.has(name));
}
