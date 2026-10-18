/**
 * The faces a post can switch a passage into, by name.
 *
 * The body is Source Serif 4 everywhere. These are for a stretch of a post, or
 * a whole one, that wants to look like something else: a quotation set like
 * the book it came from, an abstract set like the paper. Each is vendored in
 * `src/styles/fonts/` and declared in `src/styles/fonts.css`, and a browser
 * downloads one only for a page that uses it, so a face nobody writes costs
 * nothing.
 *
 * In Markdown, `font="garamond"` on any HTML element, block or inline:
 *
 *     <div font="garamond">
 *
 *     Markdown works in here, with a blank line after the tag and another
 *     before the closing one.
 *
 *     </div>
 *
 *     Inline, <span font="libertinus">a few words</span> in another face.
 *
 * and `font: garamond` in a post's frontmatter for the whole post.
 *
 * Adding one is a name here, its files and `@font-face` rules in `fonts.css`,
 * and a `.font-<name>` rule in `prose.css` that sets `--serif`.
 */
export const SECTION_FONTS = {
  /** Claude Garamond's roman and Robert Granjon's italic, revived by Georg Duffner. */
  garamond: {
    label: 'EB Garamond',
    /** The file the prerenderer preloads on a page that uses it. */
    preload: 'eb-garamond-latin-wght-normal',
  },
  /** The maintained fork of Linux Libertine, the face ACM's paper template is set in. */
  libertinus: {
    label: 'Libertinus Serif',
    preload: 'libertinus-serif-latin-400-normal',
  },
} as const;

export type SectionFontName = keyof typeof SECTION_FONTS;

export const FONT_NAMES = Object.keys(SECTION_FONTS) as SectionFontName[];

/** The class that sets an element in the face. */
export const fontClass = (name: SectionFontName): string => `font-${name}`;

/** A name as written, if it is one of ours: trimmed, any case. */
export function sectionFont(value: unknown): SectionFontName | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim().toLowerCase();
  return FONT_NAMES.find((known) => known === name);
}

/** The faces a page's HTML switches into, for the prerenderer to preload. */
export function sectionFontsIn(html: string): SectionFontName[] {
  return FONT_NAMES.filter((name) => new RegExp(`class="[^"]*\\b${fontClass(name)}\\b`).test(html));
}
