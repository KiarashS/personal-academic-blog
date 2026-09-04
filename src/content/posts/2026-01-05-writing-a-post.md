---
title: Writing a post
date: 2026-01-05
authors: [you]
tags: [guide, writing]
summary: Every frontmatter field, what it does, and what happens when you leave it out.
featured: true
revisions:
  - date: 2026-01-12
    note: Added the section on files that belong to one post.
  - date: 2026-02-20
    note: Documented captions, and the shortcut for copying a section link.
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
featured: false           # pins the post to the top of the index
revisions:                # optional; see below
  - date: 2026-01-12
    note: What changed, in a line.
slug: custom-url          # optional override of the filename
doi: 10.5281/zenodo.123   # optional; linked from the post header
---
```

Leave `summary` out and the opening prose is used instead. Leave `date` out and
the filename supplies it. An author id with no record in `authors.ts` still
renders a byline using the id itself, so a typo degrades instead of vanishing.

## Files that belong to one post

Anything a post needs — figures, a preprint, slides, a data appendix — goes in
`public/posts/<slug>/`, a folder named after the post's URL. Reference it from
the root:

```markdown
![A figure stored beside its post](/posts/writing-a-post/diagram.svg "Caption here.")
[the example attachment](/posts/writing-a-post/example.pdf)
```

Which renders as:

![A figure stored beside its post](/posts/writing-a-post/diagram.svg "Stored in public/posts/writing-a-post/ and served from the matching URL.")

and a link to [the example attachment](/posts/writing-a-post/example.pdf).

The folder mirrors the URL, so `public/posts/writing-a-post/diagram.svg` is
served at `/posts/writing-a-post/diagram.svg` and lands next to the post's own
`index.html` in the build. Deleting a post means deleting one folder, and two
posts can both have a `plot.png` without colliding.

Write the path from the root, starting with `/`. That is what lets the build
read the file to set the image's width and height, pick up a `.dark` sibling,
and add the deployment's base path — a relative `./diagram.svg` gets none of
that. Site-absolute links in prose get the base path too, so a PDF link works
on a project site served from a subdirectory.

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

## Revisions

A post that changes after it is published can carry its history:

```yaml
revisions:
  - date: 2026-01-12
    note: Added the section on files that belong to one post.
  - date: 2026-02-20
    note: Documented captions, and the shortcut for copying a section link.
```

They are listed at the foot of the post, oldest first, the way arXiv orders
versions. The note is the point — a bare date says only that something changed,
and what a reader wants to know is whether it is worth reading again — so an
entry without a date is dropped and one without a note shows the date alone.

Leaving `updated` out lets it fall back to the newest revision, which is what
the header, the Atom feed and the sitemap use, so there is one date to maintain
instead of two. Setting `updated` explicitly overrides that. This post has a
history; that is where its "updated" date comes from.

## Featured posts

`featured: true` pins a post to the top of the index and marks its card. This
post is pinned, which is why the oldest of the samples leads the front page.
Only the index is reordered: the feed, the archive, the tag pages and the
newer/older links at the foot of a post stay in date order, so a pinned post
does not follow the reader everywhere.

## Structure

Headings from `h2` down get ids automatically. Hovering one shows a link icon;
clicking it copies the section's full URL to the clipboard, which is what you
want when citing or sending someone one part of a long post.
Posts with three or more `h2`/`h3` headings get a contents list above the text,
collapsed until the reader opens it so that a long list does not push the
opening paragraph off the screen. Shorter posts get none at all, because a
two-item table of contents is just noise.
