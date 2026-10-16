---
title: An unlisted post, for demonstration
date: 2026-03-23
authors: [you]
tags: [guide]
summary: This post has unlisted set to true, so it is published at its address and left out of every list on the site.
unlisted: true
share: false
cite: false
---

You reached this page by its link, which is the only way to reach it. It is
published like any other post, but it appears nowhere a reader could come
across it:

- not on the blog index or its later pages, the archive, or a tag, category or
  author page
- not in the site's search, in related posts, or in the newer and older links
  at the foot of another post
- not in the feeds or the sitemap

Its page also carries `<meta name="robots" content="noindex">`, which asks
search engines to leave it out of their results. To check, view this page's
source and search for `noindex`.

The frontmatter that does it is one line:

```yaml
unlisted: true
```

The value has to be the word `true`. `unlisted: yes` is a string in YAML, so
the post would stay listed, and the build warns about it. A post can't be both
`featured` and `unlisted`; if both are set, it stays unlisted and the build
says why.

## When to use it

For a page you mean to send by link and nothing else: a draft for co-authors
to read before you publish it properly, notes to go with a talk, or a page
for one group of readers. When it is ready for everyone, delete the line and
the post joins the index under its own date.

It also has `share: false` and `cite: false`, which is why this page has no
Share section and no "Cite this post" block at its foot: a page sent to a few
people by link has nobody to share it with, and is not a version anyone should
cite.

## What it is not

Unlisted is not private. Anyone with the address can read this page and pass
the address on, and the post's Markdown is in the site's public repository.
Comments work as on any post, and a comment thread is a public GitHub
Discussion. Don't put anything here you would not publish.
