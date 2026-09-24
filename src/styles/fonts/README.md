# Fonts

Two faces, both vendored here rather than fetched from a CDN so that reading
the blog does not announce the reader to a third party. Both come from
[fontsource](https://www.npmjs.com/org/fontsource-variable) 5.3.0, variable
weight axis, latin subset, and both are licensed under the SIL Open Font
License 1.1 — see `LICENSE`, which the licence requires to travel with the
files. Replacing a face means replacing the licence too.

## Source Serif 4 — body text

Two files, roman and italic, about 50 kB each. Between them they cover every
weight the site uses. `src/styles/fonts.css` declares them; the build hashes
the filenames and rewrites the URLs, and the prerenderer preloads the roman.

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
