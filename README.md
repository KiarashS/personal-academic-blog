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
npx playwright install chromium   # once, for rendering diagrams at build time

npm run dev        # http://localhost:5173, drafts and future posts included
npm test           # unit tests for the content pipeline
npm run build      # diagrams, type-check, bundle, prerender → dist/
npm run preview    # serve the build locally
npm run diagrams   # re-render diagrams only
```

`npm run build` runs four stages: `render-diagrams` (Mermaid to SVG), `vite
build` (client bundle), `vite build --ssr` (server bundle), and `prerender`
(one HTML file per route, plus the feed, sitemap and robots.txt).

## Writing a post

Add a Markdown file to `src/content/posts/`. The filename becomes the URL, with
a leading date stripped: `2026-01-05-writing-a-post.md` is served at
`/posts/writing-a-post`.

```markdown
---
title: Writing a post
date: 2026-01-05          # optional; falls back to the filename prefix
updated: 2026-01-12       # optional
authors: [you]            # ids from src/content/authors.ts
tags: [guide, writing]
summary: One or two sentences for the index and search results.
draft: false              # drafts appear in dev, never in a build
slug: custom-url          # optional override
doi: 10.5281/zenodo.123   # optional, linked from the post header
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

## What the build produces

Every route is a directory with an `index.html`: the post list and its
pages, each post, the tag index and each tag, each author, search, about, and a
`404.html` for everything else. Each file carries its own title, description,
canonical link and Open Graph and Twitter tags, so links unfurl correctly in
clients that do not run JavaScript, and deep links return 200 rather than a 404
that happens to contain the right page.

Alongside them: `feed.xml` (Atom, full text, linked from every page's head),
`sitemap.xml`, and `robots.txt`.

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
plugins/          the build-time Markdown pipeline (a Vite plugin)
scripts/          diagram rendering, prerendering, feed and sitemap
src/
  components/     layout, post body, comments, theme, citations
  content/
    authors.ts    author records referenced by post frontmatter
    posts/*.md    one file per post
    references.bib
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
