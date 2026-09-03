# Fonts

Source Serif 4, variable weight axis, latin subset, taken from
[@fontsource-variable/source-serif-4](https://www.npmjs.com/package/@fontsource-variable/source-serif-4)
5.3.0 and vendored here rather than fetched from a CDN, so that reading the
blog does not announce the reader to a third party.

Two files, roman and italic, about 50 kB each. Between them they cover every
weight the site uses. `src/styles/fonts.css` declares them; the build hashes
the filenames and rewrites the URLs, and the prerenderer preloads the roman.

Licensed under the SIL Open Font License 1.1 — see `LICENSE`, which the licence
requires to travel with the files. Replacing the face means replacing the
licence too.
