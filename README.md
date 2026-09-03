# Personal academic blog

A small React site for publishing academic writing: Markdown posts with math,
diagrams, code and citations, plus the machinery a blog needs — pagination,
search, tags, author pages, comments, a feed.

Everything is rendered when the site is built. Markdown becomes HTML in Node,
equations become KaTeX markup, diagrams become SVG, and every route is written
out as a real HTML file. Readers get pages that work before any JavaScript
runs; the client bundle then takes over for instant navigation.

## Running it

```bash
npm install
npx playwright install chromium   # once, for rendering diagrams and cards

# Or point the build at a Chromium you already have, which is what sandboxes
# and CI images with a browser baked in need:
#   export CHROMIUM_EXECUTABLE=/path/to/chrome

npm run dev        # http://localhost:5173, drafts and future posts included
npm test           # unit tests for the content pipeline
npm run lint       # eslint, stylelint and prettier
npm run lint:fix   # the same, applying what can be fixed
npm run build      # diagrams, type-check, bundle, cards, prerender → dist/
npm run preview    # serve the build locally
npm run links      # every internal link in dist resolves (--external checks the rest)
npm run audit:a11y # axe-core over one page of each kind
npm run diagrams   # re-render diagrams only
npm run cards      # re-render social images only
```

`npm run build` runs five stages: `render-diagrams` (Mermaid to SVG), `vite
build` (client bundle), `vite build --ssr` (server bundle), `render-cards`
(social images), and `prerender` (one HTML file per route, plus feeds, sitemap
and robots.txt).

## Writing a post

Add a Markdown file to `src/content/posts/`. The filename becomes the URL, with
a leading date stripped: `2026-01-05-writing-a-post.md` is served at
`/posts/writing-a-post`.

```markdown
---
title: Writing a post
date: 2026-01-05 # optional; falls back to the filename prefix
updated: 2026-01-12 # optional
authors: [you] # ids from src/content/authors.ts
tags: [guide, writing]
summary: One or two sentences for the index and search results.
draft: false # drafts appear in dev, never in a build
slug: custom-url # optional override
doi: 10.5281/zenodo.123 # optional, linked from the post header
---

Body text.
```

Leave `summary` out and the opening prose is used instead. Drafts and posts
dated in the future are visible with `npm run dev` and excluded from builds, so
you can queue posts ahead of time. A build strips their text, title and summary
from the bundle rather than only hiding them from the index; the filename
remains as a key in the module map.

The sample posts under `src/content/posts/` document each feature and render
one of everything. Replace them with your own — and replace
`src/content/authors.ts`, which ships with placeholder names and affiliations.

### Math

`$inline$` and `$$display$$`, rendered by KaTeX during the build. No KaTeX
JavaScript reaches the browser, only its stylesheet and fonts. Environments
like `aligned` and `cases` work. Errors render in red rather than blanking the
page.

### Citations

Write `[@key]` and it resolves against `src/content/references.bib` at build
time, appending a reference list to the post. Each post also carries a "cite
this post" block: BibTeX built from the frontmatter, with a copy button, so
whoever quotes you gets your name and the URL right.

### Diagrams

A fence tagged `mermaid` becomes a diagram. The build renders each one twice,
light and dark, and inlines both as SVG; CSS shows whichever matches the
reader's theme, so switching theme costs no request. Readers never download
Mermaid. In `npm run dev` diagrams render in the browser instead, which keeps
the edit loop fast, and that same path is the fallback if a diagram fails to
render at build time.

### Code

highlight.js at build time, with token colours defined against the site's CSS
variables so light and dark stay consistent. Unknown languages are left
unhighlighted rather than guessed at. Each block gets a language label and a
copy button.

### Figures

An image alone in a paragraph becomes a `figure`, and the quoted title after
the path becomes its caption:

```markdown
![Alt text](/figures/plot.svg 'What the plot shows.')
```

Put images under `public/` and reference them from the root; the deployment's
base path is added at build time. Files belonging to one post go in
`public/posts/<slug>/`, a folder named after the post's URL:

```
public/
  posts/
    writing-a-post/
      diagram.svg
      diagram.dark.svg
      example.pdf
  figures/            # shared across posts
```

That folder mirrors the URL, so `public/posts/writing-a-post/diagram.svg` is
served at `/posts/writing-a-post/diagram.svg` and lands beside the post's own
`index.html` in the build. Deleting a post is deleting one folder, and two
posts can each have a `plot.png` without colliding. The cost is that renaming a
post's slug means renaming its folder; put anything shared between posts in
`public/figures/` instead.

Always write the path from the root, starting with `/`. Only then can the build
measure the image, find a `.dark` sibling and add the base path — and links in
prose, such as a PDF, get the base path the same way. `npm run links` fails the
build on a site-absolute link that is missing it. The build reads each file to set `width` and
`height`, so pages do not reflow as figures load, and adds `loading="lazy"`. If
a `plot.dark.svg` sibling exists it is used on the dark theme, which saves
white-background plots from glaring out of a dark page.

### Captions

Any block can carry a numbered caption: a paragraph beginning `Caption:`
directly after it.

```markdown
| Stage | What it does          |
| ----- | --------------------- |
| build | compiles the markdown |

Caption: The stages of `npm run build`.
```

That works after a table, a `mermaid` fence, a notebook, a `<video>` or an
image; an image can use its Markdown title instead, which comes to the same
thing. Figures and tables are numbered in two separate sequences per post —
Figure 1, Figure 2, Table 1 — at build time, so the numbers are right with
scripting off. A caption can hold markup, links and math. Table captions go
above the table and figure captions below, which is where a journal puts them.

The block and its caption are centred in the measure; the caption is set in the
sans face at a smaller size, with its label in the text colour.

Video is plain HTML, on its own line:

```markdown
<video src="/posts/my-post/clip.mp4" controls></video>

Caption: The sampler running.
```

The `src` picks up the deployment's base path the way image and link paths do.

### Notebooks

A fence tagged `notebook`, whose body is the path to an `.ipynb` under
`public/`, is rendered into the post at build time:

````markdown
```notebook
/posts/my-post/sampling.ipynb
```
````

Markdown cells go through the same pipeline as the rest of the post, so GFM and
math work inside them. Code cells keep their execution counts and are
highlighted like any other code block. Outputs come through as they are in the
file: stdout and stderr streams, tracebacks with the terminal colour codes
stripped, `text/html` tables, and PNG, JPEG or SVG images inlined from the
notebook itself. Cells with no source are skipped, and nothing executes — at
build time or in the browser.

Because the `.ipynb` stays a real file under `public/`, it is also served, so a
link to the same path gives readers the notebook to download. A caption after
the fence numbers it as a figure. A missing file or malformed JSON warns and
leaves the fence as it was rather than failing the build.

### Publications

`/publications` is generated from `src/content/publications.bib`, grouped by
year, each entry linking to its DOI or arXiv page with its BibTeX behind a
disclosure. It ships with two well-known papers as samples — replace them.

Switch the page off in `src/site.config.ts` if you do not want it. See
[Optional pages](#optional-pages) below.

## What the build produces

Every route is a directory with an `index.html`: the post list and its
pages, each post, the tag index and each tag, each author, search, about, and a
`404.html` for everything else. Each file carries its own title, description,
canonical link and Open Graph and Twitter tags, so links unfurl correctly in
clients that do not run JavaScript, and deep links return 200 rather than a 404
that happens to contain the right page.

Alongside them: `feed.xml` (Atom, full text, linked from every page's head), a
per-tag feed at `/tags/<tag>/feed.xml` advertised on that tag's page,
`sitemap.xml`, `robots.txt`, and a 1200x630 social card per post under `/og/`
referenced by `og:image`.

## Themes

Light, dark, or follow the system, cycled from the header. The choice is stored
per reader and applied by an inline script before first paint. `system` leaves
`data-theme` off the root element so the stylesheet's `prefers-color-scheme`
rules apply; the other two set it. Diagrams, syntax highlighting and the
comment iframe all follow.

## Authors

`src/content/authors.ts` holds the author records: name, role, affiliation,
short bio, email, and links (website, Google Scholar, ORCID, GitHub, arXiv,
Mastodon). Posts reference authors by id, and each author gets a page at
`/authors/<id>` listing their posts. An id with no record still renders a
byline, so a typo degrades rather than disappears.

## Comments

Comments are giscus threads backed by GitHub Discussions, keyed on the post's
path. To switch them on:

1. Enable Discussions on the repository and create a category for comments.
2. Run <https://giscus.app> against the repository to get the ids.
3. Paste `repoId` and `categoryId` into the `giscus` block in
   `src/site.config.ts`.

Until then, each post shows a note where the thread would be. The script is
loaded lazily and the iframe follows the site's theme.

## Search

Client-side, over titles, tags, author names, summaries and full post text,
using Fuse.js. The text of the archive is a separate chunk fetched the first
time someone searches, so it is not part of what every other reader downloads.

Tokens shorter than six characters must match literally; longer ones are
matched fuzzily. So `notaton` still finds "Notation" while `seed` does not match
every post containing the word "see". The query is mirrored into `?q=`.

## Typography

The body face is Source Serif 4, vendored under `src/styles/fonts/` rather than
loaded from a CDN, so no reader is announced to a third party. Two variable
files, roman and italic, cover every weight the site uses — about 100 kB
together, against the ~300 kB of KaTeX faces the math already needs. They load
with `font-display: swap`, and the prerenderer preloads the roman one. The old
system stack stays as the fallback, so a reader sees Iowan or Georgia until the
file lands.

The measure is 68 characters (`--measure: 68ch`), which tracks the face rather
than the root size. Prose is hyphenated, since a 68-character measure collapses
to about 340px on a phone where unhyphenated technical vocabulary leaves large
holes.

Numbers that are data rather than prose — dates, tables, the archive column —
are set with `lining-nums tabular-nums`, because Georgia and its kin default to
old-style figures that do not align in a column.

Tables follow booktabs, the convention journals use: a heavy rule above the
header, a light one below it, a heavy one at the foot, and nothing between rows
or columns. Add `class="numeric"` to a cell to right-align a column of figures.

Inline math is set slightly larger than the surrounding text, because KaTeX
only ships Computer Modern and its x-height runs small against a text serif.
The shapes still differ; that is true of most printed papers too.

Printing is styled rather than left to chance: the chrome goes, the palette is
forced light whatever the reader chose, external links print their target after
the text, and figures, tables and code blocks are not allowed to break across a
page.

## Favicon

`public/favicons/` holds the icon set, taken byte-for-byte from
<https://kiarashs.ir> so both sites present the same mark: a 16x16 and a 32x32
PNG, a 76x76 apple-touch-icon, and a multi-resolution `.ico` (16, 32 and 48).
They are declared in `index.html`, which the prerenderer leaves alone apart
from the title, so every page carries them. Vite adds the deployment's base
path.

## Install to home screen

The build emits a `site.webmanifest` and a service worker, which together let a
browser offer to install the site. On Android and desktop Chrome that means an
install button; on iOS, Share → Add to Home Screen. The manifest is generated
from `src/site.config.ts` (`title`, `shortName`, `description`) with relative
`start_url` and `scope`, so a subdirectory deployment needs no edit.

Icons live in `public/favicons/`: 192 and 512 for launchers, a 512 maskable
version on a black ground for Android's adaptive shapes, and a 180 apple-touch
icon. The largest artwork available upstream was 150px, so the big sizes are
resampled from it — a vector or a larger original would be crisper.

`scripts/prerender.mjs` writes the worker, naming its cache after a hash of the
built asset filenames, so a deploy that changes anything invalidates the old
cache and one that changes nothing does not. Navigations go to the network
first: a reader who is online never sees a stale page. Everything else is
cache-first, which is safe because the build gives assets hashed names.

Offline, a page the reader has already visited loads completely, styles and
text included. One they have not cannot — its route code and text were never
fetched — and they get a short explanation rather than a blank screen. The
worker is registered only in a build; in development it would serve yesterday's
bundle back to you.

To drop the feature: delete the manifest and worker blocks from
`scripts/prerender.mjs` and the registration from `src/main.tsx`. Readers with
the old worker installed keep it until it fails to update, so leave a build
that unregisters it if you ever need them off it quickly.

## Optional pages

`features` in `src/site.config.ts` turns whole sections on and off:

```ts
features: {
  publications: false,   // /publications, generated from publications.bib
  archive: true,         // /archive, every post grouped by year
},
```

A feature that is off has no nav entry, no route and no prerendered page, and
does not appear in the sitemap. The page is absent from the built site rather
than hidden with CSS. Nav visibility, routing and the prerendered route list
all read the same flag, so they cannot fall out of step.

One wrinkle: the page component still ends up in the bundle as an unreferenced
chunk that no reader ever fetches. The flag is read at runtime, so the bundler
cannot prove the import is dead.

## Working without the assets

`public/` holds every figure, diagram variant, notebook and attachment, so it
grows with the archive while the code stays small. To work on the code or the prose
without downloading it, take a blobless, sparse clone:

```bash
git clone --filter=blob:none --no-checkout https://github.com/KiarashS/personal-academic-blog.git
cd personal-academic-blog
git sparse-checkout init --no-cone
git sparse-checkout set '/*' '!/public/'
git checkout main
```

`--filter=blob:none` is what saves the bandwidth: file contents are fetched on
demand rather than up front. The sparse pattern then keeps `public/` out of the
working tree. Cone mode cannot express an exclusion, hence `--no-cone`.

On a clone you already have, the last two lines are enough:

```bash
git sparse-checkout set --no-cone '/*' '!/public/'
```

To bring it back:

```bash
git sparse-checkout disable
```

What you give up: `npm run build` still completes, but the figure pipeline
cannot measure images it cannot open, notebooks warn and stay as fences, and
`npm run links` then fails on the missing files — three broken links with the sample content. A checkout without
`public/` is for editing code and prose, not for producing a deployable build.

## Checks

`npm run lint` covers ESLint (with type-aware rules and the React hooks
plugin), stylelint and Prettier. Beyond that, two checks run against the built
output rather than the source, because that is what readers get:

- `npm run links` resolves every internal link and `#fragment` in `dist` and
  fails on a miss. External links are reported with `--external` but never fail
  a build; they rot for reasons outside this repository.
- `npm run audit:a11y` runs axe-core over one page of each kind at WCAG 2.1 AA.

Both run in CI. `.github/workflows/checks.yml` runs the whole set on pull
requests and on any branch that is not `main`; the deploy workflow runs them
again before publishing.

## Configuration

`src/site.config.ts` holds the title, tagline, description, navigation, posts
per page, and the giscus settings. `url` matters more than the rest: canonical
links, Open Graph tags, the feed and the BibTeX entries are all built from it.

## Deploying

The included workflow (`.github/workflows/deploy.yml`) publishes to GitHub
Pages on every push to `main`. It calls `actions/configure-pages`, whose
`base_path` output feeds `BASE_PATH`, so project sites, user sites and custom
domains work without editing anything. Building by hand:

```bash
BASE_PATH=/personal-academic-blog/ npm run build
```

Drop `BASE_PATH` for a user site, a custom domain, Netlify, or Vercel.

## Layout

```
plugins/          the build-time Markdown and BibTeX pipeline (Vite plugins)
scripts/          diagrams, social cards, prerendering, link check, a11y audit
src/
  components/     layout, post body, comments, theme, citations
  content/
    authors.ts    author records referenced by post frontmatter
    posts/*.md    one file per post
    references.bib      cited from posts with [@key]
    publications.bib    rendered at /publications
    about.md
  lib/            frontmatter, post index, search, pagination, routes
  pages/          one component per route
  styles/         global.css (chrome) and prose.css (article body)
  site.config.ts
```

Post metadata is eager, so list pages are cheap. Post bodies, the About page,
the search route and the search index are separate chunks, fetched when needed.

## Notes

Markdown is rendered with `rehype-raw`, so raw HTML in a post is passed
through. That is fine for content you write yourself; remove that plugin from
`plugins/markdown.ts` before pointing the content directory at Markdown from
somewhere you do not control.
