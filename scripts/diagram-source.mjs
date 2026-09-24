/**
 * The mermaid themes the site's two page themes are drawn in.
 *
 * `redux-color` and `redux-dark-color` are a matched pair: the same hue per
 * participant, over light fills and dark ones. They are what mermaid's own
 * documentation draws its examples in, and they need mermaid 12 — in 11 both
 * names resolve to a single flat actor background.
 *
 * They live here rather than in `src/site.config.ts` because `npm run
 * diagrams` runs before the build, so there is no compiled config for a plain
 * Node script to read yet. Changing the look of every diagram on the site is
 * changing these two words.
 */
export const DIAGRAM_THEMES = { light: 'redux-color', dark: 'redux-dark-color' };

/**
 * Every theme mermaid has, copied from the `theme` union in
 * `node_modules/mermaid/dist/config.type.d.ts`. Check it against that union
 * when upgrading mermaid: a name missing from here is reported as a mistake
 * when it is not one.
 *
 * `neo` is both a theme and a look. `handDrawn` and `classic` are looks only,
 * and writing one of them here is the mistake this list catches — mermaid
 * takes an unknown theme without complaint and draws the diagram with no
 * palette at all.
 */
export const MERMAID_THEMES = [
  'base',
  'dark',
  'default',
  'forest',
  'neutral',
  'neo',
  'neo-dark',
  'redux',
  'redux-dark',
  'redux-color',
  'redux-dark-color',
];

/**
 * The font every diagram is drawn and read in.
 *
 * Mermaid measures each label at render time and writes the width into the
 * SVG, so the face the build resolves has to be the face the reader gets or
 * the labels are clipped by boxes cut for someone else's metrics. Both sides
 * name this one, `src/styles/fonts.css` serves it, and the file beside it is
 * loaded into the renderer before anything is measured.
 */
export const DIAGRAM_FONT = "'Source Sans 3 Variable', sans-serif";

/** The woff2 behind `DIAGRAM_FONT`, relative to the repository root. */
export const DIAGRAM_FONT_FILE = 'src/styles/fonts/source-sans-3-latin-wght-normal.woff2';

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*\r?$\r?\n?/m;

/**
 * A diagram's source with any `theme:` taken out of its own frontmatter, and
 * the theme that was removed.
 *
 * Every diagram is rendered twice, once per page theme, and the page swaps
 * between them. A `theme:` in the diagram's frontmatter outranks the one the
 * renderer passes, so both renders come out the same and a dark page shows a
 * light diagram. Measured on the sequence diagram that prompted this: the two
 * SVGs shared all four of their fills.
 *
 * Everything else in the block is left alone. `look: neo` is not a theme and
 * survives — it is the hand-drawn/neo styling, which is compatible with any
 * palette, and dropping it would throw away what the author actually asked for.
 */
export function withoutPinnedTheme(source) {
  const match = FRONTMATTER.exec(source);
  if (!match || match.index !== 0) return { source, theme: undefined };

  let inConfig = false;
  let theme;
  const kept = [];

  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '') {
      kept.push(line);
      continue;
    }
    const indented = /^\s/.test(line);
    if (!indented) {
      inConfig = /^config\s*:/.test(line.trim());
      kept.push(line);
      continue;
    }
    const found = inConfig ? /^theme\s*:\s*(.+?)\s*$/.exec(line.trim()) : null;
    if (found) {
      theme = found[1].replace(/^['"]|['"]$/g, '');
      continue;
    }
    kept.push(line);
  }

  if (theme === undefined) return { source, theme: undefined };

  // `config:` with nothing left under it is a key with a null value, which is
  // not what the author wrote and not worth handing to a parser.
  const lines = kept.filter((line, index) => {
    if (!/^config\s*:/.test(line.trim()) || /^\s/.test(line)) return true;
    const next = kept.slice(index + 1).find((rest) => rest.trim() !== '');
    return next !== undefined && /^\s/.test(next);
  });

  const body = lines.join('\n').trim();
  const rest = source.slice(match[0].length);
  return { source: body ? `---\n${body}\n---\n${rest}` : rest, theme };
}
