---
title: Writing a post
date: 2026-01-05
authors: [you]
category: Tutorials
tags: [guide, writing]
summary: Every frontmatter field, what it does, and what happens when you leave it out.
featured: true
banner:
  src: /figures/example-banner.svg
  alt: ''
  title: An example banner — replace it with your own
series: Running this blog
part: 1
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
category: Tutorials       # one of the site's categories; optional
draft: false              # drafts appear in dev, never in a build
featured: false           # pins the post to the top of the index
revisions:                # optional; see below
  - date: 2026-01-12
    note: What changed, in a line.
series: Running this blog # optional; groups multi-part posts
part: 1                   # optional; position within the series
slug: custom-url          # optional override of the filename
doi: 10.5281/zenodo.123   # optional; linked from the post header
banner: /figures/rig.jpg  # optional; see below
comments: true            # optional; false, or readonly
---
```

### Comments

`comments:` decides whether a post takes them:

```yaml
comments: false      # no thread at all
comments: readonly   # the thread stays, the box goes
```

`true` is the same as leaving it out, which follows `giscus.comments` in
`src/site.config.ts` — set that to `off` if most of your posts should not take
comments and a few should.

`false` renders nothing: no heading, no frame, and nothing asked of giscus.
`readonly` keeps the thread for reading, says so above it, and hides the box.
That last part is presentation rather than enforcement — giscus has no
read-only mode, so the box is hidden by a stylesheet giscus loads for itself,
and the discussion on GitHub still accepts posts. Lock it there to close it
properly; the two belong together.

### Banners

`banner:` puts a picture or a video above the title. A path under `public/` is
all most posts need:

```yaml
banner: /figures/rig.jpg
```

The crop is fixed rather than taken from the file, so a run of posts opens the
same way whatever shape their artwork is: 3:1 for a picture, which is the
widest thing that leaves the opening sentence on a 1280x800 screen, and 16:9
for a video, which cannot be cropped without losing the picture. The longer
form sets the rest:

```yaml
banner:
  src: https://youtu.be/dQw4w9WgXcQ
  alt: Ten seconds of the sampler running
  title: Recorded in the lab, March 2026
  poster: /figures/rig-still.jpg
  autoplay: false
  ratio: 21 / 9
```

`src` can be an image, a video file, or a YouTube link. `alt` is what a reader
who cannot see it is told; left out, the banner is treated as decoration and
skipped. `title` is the tooltip a pointer gets on hover, and it is not a second
`alt`: a tooltip cannot be reached by keyboard, never appears on a touch
screen, and is read on top of the name the element already has by some screen
readers, so it is the place for an aside — a credit, a date, where the picture
was taken — and not for anything the reader needs. Both are empty unless you
write them. `autoplay` applies to video only, plays muted and looping, and is
ignored for anyone whose system asks for less motion. A YouTube banner is drawn
as its still until someone clicks it, so the post asks Google for nothing until
then — `poster` avoids even the still, and is also what a shared link shows.

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

An image whose file is wider than the text column is linked to itself, so a
click opens the original at full size in a new tab. The plot below is 1400px
wide and the column is about 610, which is the difference between reading the
axis and guessing at it. Images the column can already show in full get no
link, and a diagram in SVG never gets one, since the page scales vectors on its
own.

![A damped oscillation, drawn wide](/posts/writing-a-post/wide-plot.png "Click it: the file is 1400px wide, the column is not. A `.dark` sibling means the dark theme gets its own version, and each one links to itself.")

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

They are listed at the foot of the post, newest first, so that the entry a
returning reader wants is the one they meet — and it is the one the "updated"
date at the top of the post links to. The note is the point: a bare date says
only that something changed, when what a reader wants to know is whether it is
worth reading again. An entry without a date is dropped, and one without a note
shows the date alone.

Leaving `updated` out lets it fall back to the newest revision, which is what
the header, the Atom feed and the sitemap use, so there is one date to maintain
instead of two. Setting `updated` explicitly overrides that. This post has a
history; that is where its "updated" date comes from.

## Categories

Tags are free-form and many; a category is one of a fixed few, and a post has
at most one. The set lives in `src/site.config.ts` with a description each, so
`/categories` can say what belongs on each shelf rather than showing a cloud of
words. Write the label or the slug — `Research Notes` and `research-notes` are
the same thing — and the build warns if the name is not one the site knows.

Each category has a page of its own, paginated, with an Atom feed, and the name
appears in small caps beside the date on every card and at the top of the post.

## Series

Two or more posts that are meant to be read in order share a `series` name:

```yaml
series: Running this blog
part: 1
```

The parts are listed at the top of each post with the current one marked, and
previous/next links appear above the newer/older pair at the foot. Those two
mean different things: newer and older are the archive's order, previous and
next in a series are the author's. This post is part 1 of two.

Leave `part` out and the parts fall into date order. Number some but not all
and the numbered ones come first, so a half-numbered series still reads in a
sensible order rather than interleaving.

Grouping is the `series` string and nothing else: no tag, title or filename is
consulted, and the match is exact, so `Bootstrap methods` and `Bootstrap
Methods` are two series with one post each. A series with only one published
part renders nothing at all, which keeps part 1 from announcing "Part 1 of 1"
while part 2 is still a draft.

## Mermaid

```mermaid
---
title: Present Tenses
config:
    theme: 'default'
    layout: elk
---
mindmap
    Present
        Simple[Simple]
            1{{"`-**Truths** (generally true)<br/>-**Facts**<br/>-**Permanent** situations`"}}
            2{{"`Things that happen on a **regular basis** (often with adverbs of freq. such as always, usually, often, every..., sometimes and never)`"}}
            3{{"`**A series of actions or events** (e.g. to give directions or instructions) often with impersonal *you*`"}}
            4{{"`The events of a **past** narrative or an anecdote more immediacy: a short, interesting or funny story about a real person or event as if happening now`"}}
        Progressive["Progressive (continuous)"]
            5{{"`An action that is **in progress** at the moment of speaking`"}}
            6{{"`Describe things which are **changing**`"}}
            7{{"`Talk about an action **around** the time of speaking`"}}
            8{{"`Express our **annoyance** with actions or habits with adverbs such as always, forever or continually.`"}}
                d1("`*If* these two conditions exist **concurrently**: 1- annoyance for **myself** 2- adverbs similar to always, forever, continually, etc exist in the sentence. Ex: My wife is always nagging.`")
        Perfect[Perfect]
            9("`To use the present perfect simple, you have to make sure:<br/>1- there is __no definite time__ (every phrase -excluding verbs- which carries a past tense; __whether the time is clear or not__) in your sentence. This week: IS NOT a definite time.<br/>2- there is __no past time__ (any past expressions) in your sentence `")
                10("`A number of adverbs are commonly used with this tense:<br/>__recently__<br/>__yet__ (in negative and question sentences in the end of the sentence, Hanooz),<br/>__just__ (has/have+just+PP, Hamin chand lahze pish),<br/>__already__ (has/have+already+PP, Kari ke ghabl az zamane entezarash etefagh oftade ast vali tarjome nemishavad),<br/>__never(have not)/ever__ (Faghat takid ra bishtar mikonand, mani ra taghir nemidahand)`")
                    11{{"`Talk about __states__ __started in the past and are still continuing in the present__ (the least used application, do it with perfect continuous form instead, and focus on its duration and continuity)`"}}
                    12{{"`Talk about actions which __happened in the past but may happen again in the future__`"}}
                        ex1("`Compare these two sentences:<br/>1- John __has written__ several successful books.<br/>2- Sara __wrote__ a huge numbers of books.`")
                    13{{"`Talk about __our experience__ (express the events that happened in the past as experience)`"}}
                    14{{"`Talk about an action __completed__ in the past, __the result of which is present__ or __can be seen now__`"}}
                    15{{"`When we want to mention __the number of repetitions__ of things`"}}
                    22{{"`An activity or situation that occured (or did not occur) __before now, at some unspecified or unknown time in the past__`"}}
        PerfectContinuous["Perfect Continuous"]
            19("`Present perfect: completion/result/experience/repetition/happened but may happen again/unspecified or unknown time.<br/>Present perfect continuous (except state verbs): duration/continuation`")
                16{{"`Talk about an __ongoing__ state or action which __began in the past__ and __still is going on__`"}}
                17{{"`Focus on the __duration__ of the action, so we do not mention the number of times that we have done the action`"}}
                18{{"`The use of present perfect continuous can suggest that the state or action __may change__, i.e. it is temporary.`"}}
            20("`The simple form of the present perfect focuses on the fact that an action is completed, while the continuous form often focuses on the fact that action is still ongoing.`")
```

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
