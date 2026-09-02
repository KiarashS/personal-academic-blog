# Personal academic blog

A small React site for publishing academic writing: Markdown posts with math,
diagrams and code, plus the machinery a blog needs (pagination, search, tags,
author pages, comments). No CMS, no server. Posts are files in the repository
and the whole thing builds to static HTML.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173, drafts included
npm test         # unit tests for the content pipeline
npm run build    # type-check, then bundle to dist/
npm run preview  # serve dist/ locally
```

## Writing a post

Add a Markdown file to `src/content/posts/`. The filename becomes the URL, with
a leading date stripped: `2026-08-19-bootstrap-variance.md` is served at
`/posts/bootstrap-variance`.

```markdown
---
title: What the bootstrap actually estimates
date: 2026-08-19          # optional; falls back to the filename prefix
updated: 2026-08-24       # optional
authors: [kiarash]        # ids from src/content/authors.ts
tags: [bootstrap, asymptotics]
summary: One or two sentences for the index and search results.
draft: false              # drafts appear in dev, never in a build
slug: custom-url          # optional override
doi: 10.5281/zenodo.0     # optional, linked from the post header
---

Body text.
```

Leave `summary` out and the opening prose is used instead. `/posts/writing-posts`
in the sample content documents every field and renders one of each feature.

### Math

`$inline$` and `$$display$$`, rendered by KaTeX at build-of-page time (no
runtime request to a CDN). `aligned`, `cases` and the rest of the KaTeX
environments work. Errors render in red rather than blanking the page.

### Diagrams

A fence tagged `mermaid` becomes a diagram. Mermaid is ~3 MB, so it is loaded
only when a post contains one, and it re-renders when the reader changes theme.

### Code

highlight.js, with the token colours defined against the site's CSS variables
so light and dark stay consistent. Unknown languages are left alone rather than
auto-detected. Each block gets a language label and a copy button.

## Authors

`src/content/authors.ts` holds the author records: name, role, affiliation,
short bio, email, and links (website, Google Scholar, ORCID, GitHub, arXiv,
Mastodon). Posts reference authors by id. Every author gets a page at
`/authors/<id>` listing their posts. An id with no record still renders a
byline, so a typo degrades rather than disappears.

## Comments

Comments are giscus threads backed by GitHub Discussions, keyed on the post's
path. To switch them on:

1. Enable Discussions on the repository and create a category for comments.
2. Run <https://giscus.app> against the repository to get the ids.
3. Paste `repoId` and `categoryId` into the `giscus` block in
   `src/site.config.ts`.

Until `repoId` and `categoryId` are set, each post shows a note where the
thread would be. The giscus script is loaded lazily and the iframe follows the
site's theme.

## Search

Client-side, over titles, tags, author names, summaries and full post text,
using Fuse.js. Tokens shorter than six characters must match literally;
longer ones are matched fuzzily, so `notaton` still finds "Notation" while
`seed` does not match every post that contains the word "see". The query is
mirrored into `?q=`, so a search can be linked to.

## Configuration

`src/site.config.ts` holds the title, tagline, description, navigation, posts
per page, and the giscus settings.

## Deploying

`npm run build` writes a static site to `dist/`, including a `404.html` copy of
the entry page so deep links work on hosts that have no rewrite rules.

The included workflow (`.github/workflows/deploy.yml`) publishes to GitHub
Pages on every push to `main`. For a project site the app has to know which
subdirectory it is served from, which is what `BASE_PATH` does; in the workflow
it comes from `actions/configure-pages`, so project sites, user sites and
custom domains all work without editing anything. Building by hand:

```bash
BASE_PATH=/personal-academic-blog/ npm run build
```

Drop `BASE_PATH` for a user site, a custom domain, Netlify, or Vercel.

## Layout

```
src/
  components/     layout, markdown rendering, comments, theme
  content/
    authors.ts    author records referenced by post frontmatter
    posts/*.md    one file per post
    about.md      the About page body
  lib/            frontmatter parsing, post index, search, pagination
  pages/          one component per route
  styles/         global.css (chrome) and prose.css (article body)
  site.config.ts
```

Post pages, the About page and search load on navigation, so the initial
bundle carries neither KaTeX, highlight.js, Mermaid nor the search index.

## Notes

Markdown is rendered with `rehype-raw`, so raw HTML in a post is passed
through. That is fine for content you write yourself; do not point the content
directory at Markdown from untrusted sources without removing that plugin.
