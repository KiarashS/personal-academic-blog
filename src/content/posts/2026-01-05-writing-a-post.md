---
title: Writing a post
date: 2026-01-05
authors: [you]
category: Tutorials
tags: [guide, writing]
summary: Every frontmatter field, what it does, and what happens when you leave it out.
featured: true
banner: /figures/example-banner.svg
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
---
```

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
  poster: /figures/rig-still.jpg
  autoplay: false
  ratio: 21 / 9
```

`src` can be an image, a video file, or a YouTube link. `alt` is what a reader
who cannot see it is told; left out, the banner is treated as decoration and
skipped. `autoplay` applies to video only, plays muted and looping, and is
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
title: Future Tenses
config:
    theme: 'default'
    layout: elk
---
mindmap
    Future
        Simple[Simple]
            1{{"`Talk about a __decision made at the time of pseaking__: we made a decision just now and we are talking about it`"}}
            2{{"`For __intentions__: pleanned future (i.e. for actions that have __already__ been decided on): we have already decided and now we are talking about it`"}}
            3{{"`We use the _present continuous_ to describe an event in the future which has already been __arranged__ by the time of speaking`"}}
                des1("`Note that we cannot use the present continuous with events which are __beyond human control__ (It is snowing tomorrow => incorrect)`")
                des2("`Not only have we _decided_ about the future, but we have also made _a series of arrangements_. We have made the arrangements for it`")
            4{{"`We can use the _present simple_ to talk about __time-tabled__ events`"}}
            10{{"`The idiom __be about to do sth.__ expresses an activity that will happen _in the immediate future,_ usually within minutes or seconds`"}}
        Willgoing["`Will<br/>vs.<br/>Be going to<br/>(predictions)`"]
            5{{"`We use will/won't to talk about __predictions__ which are based on __guesswork, analysis or judgement__. (Similar events have happened in the past):<br/>Prediction is based on _our own knowledge, our own literacy and our own analysis_`"}}
            6{{"`However, we use be going to + infinitive to make a __prediction__ when there is __evidence in the present__ to justify the prediction:<br/>Prediction based on _currently available evidence_`"}}
                des3("`Note that it is also possible to use _will_ with present evidence, but we need an _adverb_:<br/>Look at the sky. It __will probably__ rain.`")
        Progressive["Progressive (continuous)"]
            7{{"`For an action __in progress__ at a __particular point__ in the future`"}}
                des4("`Note that we don't use the verb __be__ in the continu- ous: Shelley will be being in morocco this time tomorrow. (incorrect)`")
        Perfect[Perfect]
            8{{"`Make predictions about actions which we expect to be __completed__ _by a particular time in the future_: (figure)<br/>They __will have built__ this bridge by May.<br/>I'__ll have finished__ my report within(over) an hour.`"}}
                des5("`In the future, when we __reach this point in time__, an action/state __is finished__`")
        PerfectContinuous["Perfect Continuous"]
            9{{"`Talk about an action which is __still ongoing__ at _a point in the future_, to focus on the __duration__ of the action:<br/>I'__ll have been teaching__ English for 12 years in(by) December.<br/>By July, they __will have been building__ the house for a year.`"}}
                des6("`In the future, when we __reach this point in time__, __this is__ how long I have been doing an action (duration)`")
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
