---
title: Writing a post
date: 2026-01-05
authors: [you]
tags: [guide, writing]
summary: Every frontmatter field, what it does, and what happens when you leave it out.
---

A post is one Markdown file in `src/content/posts/`. The filename sets the URL,
with a leading date stripped: `2026-01-05-writing-a-post.md` is served at
`/posts/writing-a-post`.

## Frontmatter

```yaml
---
title: Writing a post
date: 2026-01-05          # optional; falls back to the filename prefix
updated: 2026-01-12       # optional; shown beside the date
authors: [you]            # ids from src/content/authors.ts
tags: [guide, writing]
summary: One or two sentences for the index and search results.
draft: false              # drafts appear in dev, never in a build
slug: custom-url          # optional override of the filename
doi: 10.5281/zenodo.123   # optional; linked from the post header
---
```

Leave `summary` out and the opening prose is used instead. Leave `date` out and
the filename supplies it. An author id with no record in `authors.ts` still
renders a byline using the id itself, so a typo degrades instead of vanishing.

## Dates

Dates are parsed as UTC, not local time. Without that, `date: 2026-01-05`
displays as 4 January for anyone west of Greenwich, which is the kind of bug
that survives for months because it looks like an off-by-one somewhere else.

A post dated in the future is excluded from builds and appears once its date
arrives, so you can queue posts ahead. Like drafts, future-dated posts are
visible while running `npm run dev`.

## Drafts

`draft: true` keeps a post out of every build while leaving it visible in
development. The build strips an unpublished post's text, title and summary
rather than merely hiding it from the index, so there is no unlinked URL
holding the draft and nothing to read in the bundle. The filename itself
survives, as a key in the module map, so name the file with that in mind.

## Structure

Headings from `h2` down get ids automatically, so you can link to a section.
Posts with three or more `h2`/`h3` headings get a contents list above the text,
collapsed until the reader opens it so that a long list does not push the
opening paragraph off the screen. Shorter posts get none at all, because a
two-item table of contents is just noise.
