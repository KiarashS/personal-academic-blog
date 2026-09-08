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
category: Tutorials # one of siteConfig.categories; optional
tags: [guide, writing]
summary: One or two sentences for the index and search results.
draft: false # drafts appear in dev, never in a build
featured: false # pins the post to the top of the index
series: Running this blog # optional; groups multi-part posts
part: 1 # optional; position within the series
revisions: # optional history; see below
  - date: 2026-01-12
    note: What changed, in a line.
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

A post that changes after publication can carry a `revisions` list, rendered at
the foot of the post newest first: the question a returning reader has is what
changed since they were last here, and the header's "updated" date links
straight to the block, so the entry that date names is the one at the top. The
note carries the information — a bare date says only that something changed —
so an entry without a date is dropped and one without a note shows the date
alone.
Leave `updated` out and it falls back to the newest revision, which is the date
the header, the Atom feed and the sitemap already use; set it and that wins.
There is still one `updated` in the data, so nothing downstream changes.

A post can also name one `category`, the coarse shelf above its tags. The set
is fixed in `src/site.config.ts` rather than taken from whatever posts happen
to say, so it stays small, the navigation has an order to follow, and a
misspelled name is caught by the build:

```ts
categories: [
  { slug: 'machine-learning', label: 'Machine Learning', description: 'Methods, …' },
  …
]
```

Write either the label or the slug — `Machine Learning` and `machine-learning`
are the same shelf. Each category gets `/categories/<slug>`, paginated, with its
own Atom feed, and they are listed at `/categories` with their descriptions and
counts; an empty one is left out. A category the config does not define is a
build warning, since the post would otherwise file itself nowhere. Categories
are a feature flag: set `categories: false` (or leave the list empty) and the
nav entry, the routes, the per-shelf feeds and the chips on every post all
disappear together, so a post that still names one is not left pointing at a
page that no longer exists.

Posts meant to be read in order share a `series` name. The parts are listed at
the top of each one with the current part marked, and previous/next links sit
above the newer/older pair at the foot — those mean different things, the
archive's order against the author's. Without `part` the parts fall into date
order; number some and not others and the numbered ones come first, so a
half-numbered series still reads sensibly. The `series` string is the whole of
the grouping — nothing is inferred from tags, titles or filenames, and the
match is exact — and a series with fewer than two published parts renders
nothing, so part 1 says nothing about a series until part 2 exists.

`featured: true` pins a post to the top of the index and marks its card. Only
the index is reordered — the feed, the archive, the tag pages and the
newer/older links keep date order — so a pinned post leads the front page
without following the reader around. Pin several and they hold their date order
among themselves.

The sample posts under `src/content/posts/` document each feature and render
one of everything. Replace them with your own — and replace
`src/content/authors.ts`, which ships with placeholder names and affiliations.

### Math

`$inline$` and `$$display$$`, rendered by KaTeX during the build. No KaTeX
JavaScript reaches the browser, only its stylesheet and fonts. Environments
like `aligned` and `cases` work. Errors render in red rather than blanking the
page.

Display equations are numbered when they are labelled, and only then:

```latex
$$
p(\theta \mid y) = \frac{p(y \mid \theta)\, p(\theta)}{p(y)}
\label{bayes}
$$
```

`\eqref{bayes}` in the prose then becomes a link showing that equation's
number. Numbers are assigned in document order during the build, so inserting an
equation renumbers what follows and every reference with it. A reference whose
label does not exist renders as `(?)` and warns; two equations sharing a label
warn as well, and references point at the first. `\label` is stripped before
KaTeX sees the TeX, and the `\tag` that carries the number is appended after the
body, which is where KaTeX needs it when the equation is a `\begin{aligned}`
block. A `\eqref` inside code or inline math is left alone.

Numbering only labelled equations keeps a fifteen-equation derivation from
carrying fifteen numbers when the prose refers to two of them.

### Footnotes

GitHub-flavoured footnotes: `Text.[^1]` with `[^1]: The note.` anywhere in the
file. They collect into a section at the foot of the post with a rule above it
and a back-link on each note. remark-gfm heads that section with a
screen-reader-only "Footnotes" landmark, which stays out of the contents list
and takes no heading anchor, so a post with two sections and a footnote does not
get a contents list claiming three.

### Citations

Write `[@key]` and it resolves against `src/content/references.bib` at build
time, appending a reference list to the post. Each post also carries a "cite
this post" block built from the frontmatter, in four forms — BibTeX, APA, IEEE
and a plain sentence — each with its own copy button, so whoever quotes you
gets your name and the URL right. Names are reshaped per style (APA takes the
surname first and given names as initials, IEEE the initials first), a DOI goes
into all four, and the date cited is the date of the version being read, so a
revised post is cited by its revision.

### The paper behind a post

A post that accompanies published work can carry a `publication` block:

```yaml
publication:
  status: Preprint # or Under review, Published, To appear
  venue: Journal of Statistical Software
  year: 2026
  doi: 10.5281/zenodo.123
  url: https://arxiv.org/abs/2601.01234
  pdf: /posts/my-post/paper.pdf
  code: https://github.com/you/replication
  data: https://doi.org/10.5281/zenodo.124
```

Every field is optional. It renders above the text — a reader who arrives from
a citation wants the paper, not the commentary — and the DOI moves out of the
header line so it is not printed twice. That DOI is the one the citation
formats use. A `pdf`, `code` or `data` path under `public/` gets the
deployment's base path; a full URL is left alone.

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
unhighlighted rather than guessed at. The language and the copy button sit in a
bar above the block, not over the first line.

Blocks of more than one line are numbered. Each line is wrapped in a span at
build time and the number itself comes from a CSS counter, so it is not part of
the text that is copied or selected, and the gutter stays put while a long line
scrolls under it.

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

An image whose file is wider than the text column is wrapped in a link to
itself, so a click opens the original at full size in its own tab. The
threshold is intrinsic width — 800px by default, against a column of about 610
— so a picture the page can already show in full gets no link and no cursor
change, and an SVG never gets one, since the page scales vectors losslessly on
its own. With a `.dark` sibling each variant links to itself, so whichever one
the reader can see is the one that opens. No lightbox, no library: middle-click,
right-click-save and keyboard all behave as they should, and the page needs no
JavaScript for any of it.

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

That works after a table, a code fence, a `mermaid` fence, a notebook, a
`<video>` or an image; an image can use its Markdown title instead, which comes
to the same thing. Each kind is numbered in its own sequence per post — Figure
1, Figure 2, Table 1, Listing 1, Notebook 1 — at build time, so the numbers are
right with scripting off. A caption can hold markup,
links and math. A caption goes below a block the reader takes in at a glance,
so an image or a diagram, and above one they read from the top down: a table, a
listing or a notebook.

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
the fence numbers it as Notebook 1, 2, 3 and sits above it, since a notebook is
read from the top down. A missing file or malformed JSON warns and
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
short bio, research interests, email and profile links. Posts reference authors by id, and each
author gets a page at `/authors/<id>` listing their posts. An id with no record
still renders a byline, so a typo degrades rather than disappears.

Everything but `name` is optional, and a field that is missing is left out of
the page rather than replaced with anything. That is why the record ships with
those fields commented rather than filled with a description of themselves: an
unedited `role: 'Your role'` is published under every post you write, while no
`role` at all is simply a card with one less line on it.

`interests` is optional and takes a list of short phrases, rendered as one
muted line under the bio on every post the author has written and on their own
page:

```ts
interests: ['Machine learning for clinical data', 'Causal inference'],
```

The bio says what someone works on in prose; this is the keyword form a reader
scans, so it wants three or four entries rather than a paragraph's worth. Blank
entries are dropped, so a trailing comma in the list costs nothing. An author
with no bio but with interests gets them as the meta description on their page,
which reads better in a search result than "Posts by X."

An author's CV comes first in that row, from `cv:` on the record — a path
under `public/` such as `/cv.pdf`, or a URL if it is hosted elsewhere. After it
come the profiles: ORCID, Google Scholar, Semantic Scholar, arXiv, GitHub,
LinkedIn, Mastodon, Bluesky and a website, in that order — identity first, then
the indexes, then code and social — with the email last. Each value
is either the bare id the service uses or a full URL:

```ts
links: {
  orcid: '0000-0002-1825-0097',        // or https://orcid.org/0000-0002-1825-0097
  scholar: 'AbCdEfGhIjK',              // the `user=` value on your profile
  semanticScholar: '1741101',
  github: 'KiarashS',
  linkedin: 'kiarash-soleimanzadeh',   // or 'company/name'
  mastodon: '@you@mathstodon.xyz',
  bluesky: 'you.bsky.social',
  website: 'https://kiarashs.ir',
}
```

They render as labelled chips under the author's bio, on every post and on the
author's own page. Text rather than logos: eight service marks is a lot of
colour for a page whose subject is the writing, and several of these services
have no mark a reader would recognise.

## CV

`cv` in `src/site.config.ts` puts a CV link in the site's navigation, beside
Posts and Archive:

```ts
cv: '/cv.pdf',            // a file in public/, or a URL
```

A path is resolved against the deployment's base path, so `/cv.pdf` means
`public/cv.pdf`; a full URL is used as it is. It opens in its own tab, since a
PDF that replaces the page someone was reading is a small rudeness. Leave it
empty and no link is rendered.

That is the site owner's CV. Each author record can carry its own `cv` as well,
which appears first in the row of profile links under their bio — on every post
they wrote and on their author page.

## Comments

Comments are giscus threads backed by GitHub Discussions, keyed on the post's
path. To switch them on:

1. Enable Discussions on the repository and create a category for comments.
2. Run <https://giscus.app> against the repository to get the ids.
3. Paste `repoId` and `categoryId` into the `giscus` block in
   `src/site.config.ts`.

Until then, each post shows a note where the thread would be. The script is
loaded lazily and the iframe follows the site's theme.

## Feed

`feed.xml` is an Atom feed carrying the full text of every post, and each tag
has its own at `/tags/<tag>/feed.xml`. Both are linked from the head of every
page for readers that look, and both are also said out loud: an icon in the
header, a "Atom feed" link in the footer, and a per-tag link under the heading
of a tag page. Browsers dropped the address-bar feed button years ago, so
discovery alone reaches nobody who is not already looking.

## Keyboard shortcuts

`/` search, `j` and `k` through a list of posts, `[` and `]` for previous and
next, `b` back to the blog index, `t` to cycle the theme, `?` for the list
itself.

`j` and `k` move focus down and up a list, and from a page that has no list —
the front page, a post — they go to the blog index and land on its first or
last entry. `[` and `]` follow whatever the page calls previous and next: a page
of the index, the newer or older post at the foot of a post, or the neighbouring
part when the post belongs to a series, which wins because it is the more
deliberate ordering. They work by following `rel="prev"` and `rel="next"` in the
markup rather than by knowing what page they are on, so a new kind of
previous/next link is picked up by saying so in its HTML. `b` goes to the blog
index from anywhere, and from page four of it to page one.

Escape leaves the search box for the results. The search page focuses its box
on arrival, which is what a reader who came to type wants, but it also meant
`j` and `k` typed letters and Tab was the only way out; now the keyboard route
runs end to end — `/`, the query, Escape, then `j`, `k` and Enter. An empty box
has nothing to move to, so Escape there is left to the browser.

The list is also a button in the footer, so nobody has to know
a shortcut to find the shortcuts; it closes on Escape, on Close, or on a click
outside it. Keys are ignored while typing in a field, and
any Ctrl, Cmd or Alt combination is left to the browser. Everything they do is
something the page already offers to a mouse. `src/lib/shortcuts.ts` holds the
table; the dialog is generated from it, so the documentation cannot drift from
the behaviour.

## Related posts

The foot of each post lists up to four others, ranked by what they share: the
same category counts for as much as three shared tags, being the coarser and
more deliberate signal, and ties go to the newer post. A post sharing neither a
tag nor the category is not shown — adjacent is not related. The ranking is a
pure function, `rankRelated` in `src/lib/post-builder.ts`.

## Search

Client-side, over titles, tags, author names, summaries and full post text,
using Fuse.js. The text of the archive is a separate chunk fetched the first
time someone searches, so it is not part of what every other reader downloads.

Tokens shorter than six characters must match literally; longer ones are
matched fuzzily. So `notaton` still finds "Notation" while `seed` does not match
every post containing the word "see". The query is mirrored into `?q=`.

## What a reader gets on a post

Beyond the text: a rule across the top of the window showing how far through
the article they are, measured against the reading matter rather than the whole
page, so it fills as the prose ends rather than after the comments. It is
`aria-hidden` — it repeats what the scrollbar says — and it renders at zero
width with no JavaScript, which is the same as not being there.

Each heading from `h2` down carries a link icon. Clicking it copies that
section's full URL to the clipboard and sets the hash, which is what someone
wants when citing or sending one part of a long post. It stays a real link, so
a middle click still opens it in a tab.

The foot of the post has share links for LinkedIn, X, Bluesky and email, and a
button that copies the canonical URL. They are ordinary links built when the
page is rendered: no share widget, no third-party script, and nothing that
counts who clicked. Deleting `<ShareLinks post={post} />` from
`src/pages/PostPage.tsx` removes them.

## Print and PDF

The share row carries a Print button, which opens the same dialog as a
browser's Save as PDF. Before it opens, every collapsed `details` is expanded —
a contents list or a citation folded shut prints as a blank line — and closed
again afterwards. The listeners are on `window`, so Ctrl-P gets the same
treatment as the button.

What paper gets: no navigation, comments, share row or progress bar; the light
palette whatever the reader chose or their system asks for; the target of every
external link printed after it, while in-page links are left alone; the post's
own URL under the title, since a printout has no address bar; and figures,
tables, code blocks, the citation and the revision list kept from breaking
across a page, with orphans and widows held at two lines.

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
  home: false,           // a front page for the site; moves the blog to /blog
  publications: false,   // /publications, generated from publications.bib
  archive: true,         // /archive, every post grouped by year
  categories: true,      // /categories and the shelves in siteConfig.categories
  slides: false,         // /slides, talks and their materials
  contact: false,        // /contact, from contact.md plus your profile links
},
```

A feature that is off has no nav entry, no route and no prerendered page, and
does not appear in the sitemap. Categories reach a little further than the other
two, since they also mark up individual posts: with the flag off the chip above
each title goes as well, the per-category feeds are not written, and related
posts fall back to ranking on shared tags alone. The page is absent from the built site rather
than hidden with CSS. Nav visibility, routing and the prerendered route list
all read the same flag, so they cannot fall out of step.

One wrinkle: the page component still ends up in the bundle as an unreferenced
chunk that no reader ever fetches. The flag is read at runtime, so the bundler
cannot prove the import is dead.

## The loading screen

Pages are prerendered, so the HTML arrives complete and there is usually nothing
to wait for. What there is to cover is hydration. React re-renders the front
page and each post through a suspended boundary, and until the module behind it
lands the page shows the boundary's fallback where the prose should be — on a
throttled connection I measured that at 750ms on `/`.

So the screen appears on a slow load and never on a fast one. `index.html` sets
`data-loading` on the root element in the same inline script that applies the
theme, before first paint; the CSS fades the overlay in after a 150ms delay, so
a load that finishes inside that window shows nothing rather than a flicker.
`SplashScreen` clears the flag in an effect, which on a prerendered page runs
once hydration has committed, after giving `document.fonts.ready` up to 1.5s so
the words do not reflow a beat later.

Two things it cannot do. It cannot appear for a reader with JavaScript off,
because the flag that shows it is set by script — the markup is inert until
then. And it cannot strand anybody if the bundle never arrives: the same inline
script sets an 8s timer that clears the flag whatever happens, which I checked
by serving 500s for every `.js` request.

## When a deploy lands under an open tab

Every chunk is hashed, so a deploy replaces all of them. A tab that was open
across one then asks for files that are gone, and GitHub Pages answers a missing
asset with `404.html` — an HTML body where the browser expected a module. It
refuses it, the route fails to render, and the reader gets "This page could not
be loaded".

`src/lib/recover.ts` catches that. Vite reports the chunks it preloads as
`vite:preloadError`; a plain `import()` the preload helper did not wrap arrives
instead as an unhandled rejection, and anything that gets as far as a render is
caught by `RouteBoundary`. All three route to the same recovery, which
unregisters the service worker and empties its caches before reloading. The
clearing is the part that matters: the worker may still be serving the build
that asked for those chunks, so a plain reload can fail exactly the same way.

One attempt, then a minute's silence, so a chunk that is missing for some other
reason cannot put the page in a reload loop. After that the message stands, and
its button forces another attempt.

## A blog, or a site with a blog in it

`home` decides which of the two this is, and it is the only switch involved.

Off, the blog is the site. Its index is the front page at `/`, numbered pages
are `/page/2`, and posts are `/posts/<slug>`. That is the default, and nothing
about it has changed.

On, the site gets a front page of its own and the blog moves aside whole: the
index to `/blog`, its pages to `/blog/page/2`, and posts to `/blog/<slug>`. The
list and its items stay in one branch of the URL tree rather than two. Nothing
in the code writes either shape by hand — `postPath`, `blogIndexPath` and
`blogPagePath` in `src/lib/routes.ts` are the only places that know, and links,
canonical URLs, the feed, the sitemap, the prerendered route list and the giscus
comment key all read them.

The front page is one screen: a greeting and your name at display size, the
tagline, and the two or three sentences in `src/content/home.md` that point at
everything else. No list of posts under it — the blog has its own index and the
nav is one click away.

The footer sits below the fold rather than at the bottom of that screen. Ending
the window on the copyright rule read as the bottom of the site to a reader who
had not scrolled at all. `--banner-overhang` on `.page--banner` is how far past
the window the column runs, and it has to be larger than the footer is tall —
at 11rem the rule lands 36px below the fold on a 390×844 phone and 58px below
on a desktop. The banner itself does not move: `.site-main` is `flex: 1`, so its
box grows by the whole overhang while its bottom padding grows by the same
amount, which leaves the content box it centres in exactly where it was. Change
one of the two and the name drifts down the screen. The height is `100svh`, not
`100vh` — on a phone `vh` is the window with the address bar retracted, which is
not what a reader is looking at on arrival, and the footer would show through
until they scrolled.

The header goes bare on that page, dropping its own copy of the name and the
tagline and leaving the nav, since the name is already the largest thing on the
screen.

`home` in the config carries what the banner says:

```ts
home: {
  greeting: 'Hi, I am',   // runs into your name; empty for no lead-in
  tagline: '',            // the line under the name; empty uses the site's
  description: '',        // what a link to `/` previews as; empty uses the site's
  profileLinks: true,     // ORCID, Scholar and the rest, under the lines
  signature: true,        // draw src/content/signature.svg in place of the name
  signatureTilt: -3,      // degrees, the way a signed page is never square
  avatar: '/avatar.jpg',  // a portrait beside the text; empty for words alone
},
```

`home.tagline` is the front page's own line. `siteConfig.tagline` describes the
writing and sits under the site title in the header on every other page, and on
the social card for the site's root; the front page usually wants to say
something about you instead. Leave it empty and the two stay the same string.

`home.description` is the same split one layer down, in the head rather than on
the page: `siteConfig.description` is what the blog is, and a link to `/` shared
anywhere previews a page about a person. Empty falls back to the site's.

`home.profileLinks` puts a row of links under those sentences — ORCID, Google
Scholar, GitHub, a CV, an email address, whatever the owner's record in
`src/content/authors.ts` fills in, in the order `profileLinks` gives them. They
are the same links the contact page and every author card show, from the same
record, so an ORCID that changes changes once. Plain links rather than the
bordered chips the author cards use: those sit under a post as one more block of
furniture, and this row sits under two lines of light type at display size.

The front page is also the one page that carries structured data: a schema.org
`Person` with `sameAs` pointing at those same profiles, which is what connects a
name in a search result to an ORCID iD. It is built in
`src/lib/structured-data.ts` from the owner's record, so a field the record does
not fill in is left out rather than published empty, and it appears on `/` only
— a `Person` block on every route would claim each of them is one.

`avatar` takes a path under `public/` or a URL. Put the file in `public/` and
name it here, and it is cropped to a circle beside the words, with one bright
arc travelling around the rim every six seconds. It takes the room the text
leaves, between 7rem and 13rem, and below 46rem it moves above the text, which
is the order a profile reads in. Reduced motion keeps the rim and stops the
highlight. Leave it empty and the front page is words alone.

The front page also uses a wider column than the rest of the site, 56rem
against `--wide`'s 46rem, because it is not prose and the portrait would
otherwise take its width out of the words: at 46rem they were left about 45
characters, narrower than anything else here. The whole page widens together,
header and footer included, so the nav still ends on the line the portrait
does. Everything else keeps the reading measure.

The signature writes itself: a vertical front sweeps left to right over 2.6s and
each letter's clip rectangle opens as it passes, then the flourish underneath
draws in over 820ms. It plays when the drawing scrolls into view and again on a
click, and a reader who asks for reduced motion gets it finished instead. The
markup ships complete and is hidden only once the effect runs, so a reader
without JavaScript sees the name rather than an empty box.

It is inlined from `src/content/signature.svg` rather than loaded as
an image, so `.ks-glyph` and `.ks-flourish` inside it take their ink from the
page's own colour token. An `img` would keep whatever colour the file was drawn
in, and a reader who picks dark mode on a light system would get dark ink on a
dark page. Replace the file with your own drawing, or set `signature: false` and
the name is set as type. It is sized in pixels per breakpoint, not in `em`: the
drawing has to keep its proportions rather than wobble against the type beside
it.

The link lines are `src/content/home.md`, so they are yours to write, and they
survive a feature being switched off. A link to `/contact`, `/slides`,
`/archive`, `/publications` or `/categories` whose flag is off has its anchor
dropped at build time and its words kept, so the sentence still reads and the
build stays green; the build warns which link it dropped. A link to a page no
flag explains is a mistake, and `npm run links` still fails on it.

Below 40rem the header's nav collapses into a menu button and a panel, since the
nav gains an entry every time a feature is switched on and eight of them are two
wrapped rows on a phone. It is a `dialog`, so Escape, the backdrop and focus
containment come with it.

Two things to know before switching it on. Post URLs change, so do it before
anything external cites one; a URL in a citation is not something you get to
take back. And the deployment needs redirects from the old paths, which GitHub
Pages cannot do on its own: on Cloudflare a redirect rule from `/posts/*` to
`/blog/*` covers it.

One name is reserved. With the blog at `/blog`, a post slugged `page` would
shadow `/blog/page/2`, so `RESERVED_SLUGS` in `src/lib/routes.ts` lists it and
the build warns rather than letting a reader find out. Keeping tags, categories
and the archive at the top level is what keeps that list to one word.

Post assets stay under `public/posts/<slug>/` whichever shape is in use.
Markdown references them by path, so they do not follow the page.

## Slides and contact

`slides` renders `src/content/slides.ts` at `/slides`, newest first. A talk needs
a title and a date; `event`, `summary`, and links to `slides`, `video`, `code`
and `paper` are each optional, and each takes a URL or a path under `public/`:

```ts
{
  title: 'AI in Medicine',
  date: '2026-04-12',
  event: 'The seminar it was given at',
  summary: 'One sentence on what it covered.',
  slides: '/slides/ai-in-medicine.pdf',
}
```

`contact` renders `src/content/contact.md` at `/contact`, followed by the same
profile row the author cards use, so an address changes in one place.

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

## Analytics

Off by default: with no token the script tag is absent from the built HTML, and
the site talks to no one but its own host.

How you turn it on depends on how the domain is served, and the two ways do not
mix.

A domain proxied through Cloudflare, which is what `blog.kiarashs.ir` is, takes
the automatic setup: enable Web Analytics for the zone at
<https://dash.cloudflare.com> and the edge injects the beacon into every HTML
response it proxies. `analytics.cloudflareToken` stays empty. The beacon then
posts to `/cdn-cgi/rum` on the site's own origin, which the edge terminates, so
nothing crosses an origin boundary.

A domain that is not behind Cloudflare takes the manual snippet: add the site
under Analytics & Logs → Web Analytics, and paste the token from the JS snippet
it hands you into `analytics.cloudflareToken`. The prerenderer then writes one
deferred script from `static.cloudflareinsights.com` into each page's head.

Setting a token on a proxied domain is the combination to avoid. `beacon.min.js`
picks its endpoint from whether the `data-cf-beacon` JSON carries a `version`
field: the manual form has none, so it posts to the absolute
`https://cloudflareinsights.com/cdn-cgi/rum` instead of the relative path. That
URL answers 404 with no `Access-Control-Allow-Origin` header, and a browser
reports a response like that as an access-control failure rather than as a 404,
so the console fills with CORS errors on every page load while nothing is
collected.
Cloudflare Web Analytics sets no cookies and builds no cross-site identifier, so
it needs no consent banner; it reports page views, referrers and countries,
which covers popular posts and where readers come from. The site works
identically without it, and the service worker leaves the request alone, being
cross-origin.

Any other tag-based analytics would go in the same place in
`scripts/prerender.mjs`.

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
