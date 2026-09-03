---
title: Publishing and what readers get
date: 2026-03-02
authors: [you]
tags: [guide, deployment]
summary: What the build produces, how deployment works, and the three settings you have to fill in yourself.
---

`npm run build` renders diagrams, compiles the Markdown, bundles the client,
and writes one HTML file per route. What lands in `dist/` is a static site: no
server, no database, no build step at request time.

## One file per route

Every route is prerendered, so `/posts/publishing` is a real
`posts/publishing/index.html` with the post's title in `<title>`, its summary in
the description, and Open Graph and Twitter tags pointing at the canonical URL.
Three things follow from that. Links unfurl correctly in Slack, Mastodon and
Bluesky, which do not run JavaScript. Deep links return HTTP 200 rather than a
404 that happens to contain the right page. And the text is readable with
scripting disabled.

The client bundle still ships, and takes over as soon as it loads, so
navigation between pages stays instant.

## Feed and sitemap

`feed.xml` is an Atom feed with the full text of each post, linked from the head
of every page so browser extensions and readers find it on their own.
`sitemap.xml` lists every canonical URL with its last-modified date.

## Comments

Comments are giscus threads backed by GitHub Discussions, keyed on the post's
path. Enable Discussions on the repository, run <https://giscus.app> against it,
and paste `repoId` and `categoryId` into `src/site.config.ts`. Until then each
post shows a short note where the thread would be.

## Search

Search covers titles, tags, author names, summaries and full text. The index
loads only when someone opens `/search`, so the archive's text is not part of
what everyone else downloads.

Short queries are matched literally and longer ones fuzzily. Fuzzy-matching a
four-letter word against a whole post body matches every post, while a typo in
a longer word should still find what you meant.

## Themes

The toggle in the header has three positions: follow the system, force light,
force dark. "Follow the system" is the default and stores nothing beyond the
choice itself; the other two are remembered. Which state the button shows is
decided in CSS from a `data-theme` attribute set before first paint, so the
page never flashes the wrong colours and the button is right before any script
runs.

## Switching parts off

`features` in `src/site.config.ts` turns optional sections off wholesale:

```ts
features: {
  publications: false,
},
```

A feature that is off has no nav entry, no route and no prerendered page, and
does not appear in the sitemap. Nothing is merely hidden with CSS.

## The three things to fill in

`src/site.config.ts` holds the title, tagline, description and the site's URL —
the last one matters, because canonical links, the feed and the Open Graph tags
are all built from it. `src/content/authors.ts` holds the author records. And
giscus needs its two ids. Everything else has a working default.
