# Fonts

Five faces, all vendored here rather than fetched from a CDN so that reading
the blog does not announce the reader to a third party: the body serif, a sans
for diagrams, a mono for code, and two faces a post can set a passage in. All
come from [fontsource](https://www.npmjs.com/org/fontsource) 5.3.0 and all are
licensed under the SIL Open Font License 1.1. The licence travels with the
files, as it requires: `LICENSE` for Source Serif and Source Sans, and a
`LICENSE-<face>` for each of the others. Replacing a face means replacing the licence too.

## Source Serif 4 — body text

Six files, roman and italic of three subsets, all under one family name in
`src/styles/fonts.css`. The build hashes the filenames and rewrites the URLs.

| Subset      | Roman | Italic | Loaded                                             |
| ----------- | ----- | ------ | -------------------------------------------------- |
| `latin`     | 50 kB | 51 kB  | every page; the roman is preloaded                 |
| `latin-ext` | 42 kB | 44 kB  | pages with a character in its range: Ł, ő, č, ş, ğ |
| `greek`     | 20 kB | 21 kB  | pages with Greek outside maths                     |

Each file carries fontsource's own `unicode-range`, so a browser fetches the
two extra subsets only for a page that uses them. The basic Latin roman loads
with `font-display: optional`; the other five `swap`, since they are fetched
on demand and Chrome does not use an `optional` face that arrives after the
page has rendered. The prerenderer preloads a
subset's roman on the pages whose text needs it (`src/lib/font-subsets.ts`,
which skips maths, code and diagrams, since those are set in other faces). A
test holds that module's ranges and the stylesheet's to the same values.

None of the subsets has the maths operators or arrows (≤, ≈, ∈, →). Written
inside `$…$`, KaTeX draws them.

## Source Sans 3 — diagrams

Roman only, about 29 kB; diagrams have no italics. The site's own sans is the
system stack and stays that way. This face is here for arithmetic.

Mermaid measures each label when it renders a diagram at build time and writes
the resulting box width into the SVG. The build machine has none of
`-apple-system`, `Segoe UI`, `Roboto` or `Helvetica Neue`, so it falls through
to Liberation Sans, while a reader on macOS or Windows gets one of the others.
Any label wider in the reader's face than in Liberation Sans is clipped by a
box cut for someone else's metrics. Measured on the class diagram in the
code-and-tables post, drawn in a face the build had not measured: all 19
labels overflowed, `Where am i?` by 10px of its 79.

Naming one face on both sides makes the measured width the displayed width.
`scripts/render-diagrams.mjs` loads this exact file into the renderer and
fails the build if it cannot, and `.mermaid-figure foreignObject` is set to
`overflow: visible` so that a label is never cut in half in the moment before
the file arrives, or if it never does.

## EB Garamond and Libertinus Serif — passages

Set where a post asks for them, with `font="garamond"` or `font="libertinus"`
on an element or `font:` in its frontmatter (`src/lib/fonts.ts`). A browser
fetches them only for a page with text in them, and the prerenderer preloads
the basic Latin roman of each on those pages.

| Face             | Files                                                                                      | Licence                    |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| EB Garamond      | variable weight, roman and italic, `latin` and `latin-ext`                                 | `LICENSE-eb-garamond`      |
| Libertinus Serif | 400, 600 and 700 roman, 400 and 700 italic in `latin`; 400 roman and italic in `latin-ext` | `LICENSE-libertinus-serif` |

From fontsource 5.3.0 (`@fontsource-variable/eb-garamond`,
`@fontsource/libertinus-serif`), OFL-1.1, each with the licence file that
package ships. Libertinus is static, so a weight between the vendored ones
renders at the nearest of them.

## JetBrains Mono — code

Everything set in `--mono`: code, inline and fenced, keys, notebooks. Variable
weight, roman and italic (comments are italic), `latin` and `latin-ext`, about
115 kB in all; a page fetches the basic Latin roman when it has code and the
prerenderer preloads it there. fontsource 5.3.0
(`@fontsource-variable/jetbrains-mono`), OFL-1.1, `LICENSE-jetbrains-mono`.
Scaled with `size-adjust: 94%` to the x-height of the system faces it
replaced, with ligatures off; `fonts.css` says why.
