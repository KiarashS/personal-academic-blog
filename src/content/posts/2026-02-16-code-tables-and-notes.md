---
title: Code, tables and notes
date: 2026-02-16
authors: [you, coauthor]
tags: [guide, code]
summary: Syntax highlighting without a vendored theme, scrolling tables, footnotes, and what multiple authors look like.
---

Fenced code is highlighted at build time by highlight.js. The token colours are
defined against the site's CSS variables rather than copied from a vendor
theme, so light and dark stay consistent with everything else on the page.

```python
import numpy as np

def bootstrap_se(sample, statistic, replicates=2000, seed=0):
    """Standard error of `statistic` under resampling with replacement."""
    rng = np.random.default_rng(seed)
    draws = rng.choice(sample, size=(replicates, sample.size), replace=True)
    return np.std([statistic(row) for row in draws], ddof=1)
```

Caption: The bootstrap standard error, resampling with replacement. Listings
are numbered in their own sequence, and their captions go above them.

```r
fit <- lm(mpg ~ wt + factor(cyl), data = mtcars)
summary(fit)$coefficients[, c("Estimate", "Std. Error")]
```

The language and the copy button sit in a bar above each block, and every line
is numbered. The numbers come from a CSS counter, so copying the block gives
the code and nothing else. An unknown language is left unhighlighted rather
than guessed at, because a wrong guess colours the wrong tokens and reads worse
than plain text.

## Figures

An image on its own line becomes a figure. The quoted title after the path is
the caption:

![The four build stages](/figures/pipeline.svg "Markdown goes in, a directory of HTML comes out.")

The build reads the file to set `width` and `height`, so the page does not
reflow as figures load, and adds `loading="lazy"`. Put images in `public/`
and reference them from the root, as above; the deployment's base path is
added at build time. If a `name.dark.ext` sibling exists — as it does here —
it is used when the reader is on the dark theme, which saves white-background
plots from glaring out of a dark page.

## Captions

Any block can be captioned by following it with a paragraph that starts with
`Caption:`. Figures, tables and code listings are numbered in three separate
sequences, the way a paper numbers them, and the numbering is done at build
time so it survives with JavaScript off. Images can use the Markdown title
instead, which comes to the same thing. A caption sits below a figure and above
anything read from the top down: a table, a listing, a notebook.

## Tables

Wide tables scroll inside their own box instead of pushing the page sideways.
A table's caption goes above it, as in a journal.

| Stage | What it does | Runs |
| --- | --- | --- |
| `render-diagrams` | Mermaid to SVG, light and dark | build only |
| `vite build` | Client bundle | build |
| `vite build --ssr` | Server bundle | build |
| `prerender` | One HTML file per route, plus feeds and sitemap | build |

Caption: The five stages of `npm run build`, in the order they run.

## Notebooks

A fence tagged `notebook` whose body is a path under `public/` embeds the
notebook: markdown cells become prose, code cells keep their execution counts,
and outputs come through — text, tables, images and errors alike.

````markdown
```notebook
/posts/code-tables-and-notes/sampling.ipynb
```
````

Which gives:

```notebook
/posts/code-tables-and-notes/sampling.ipynb
```

Caption: A notebook rendered into the post. The `.ipynb` stays in `public/`, so
readers can download the original.

The notebook is read at build time, so nothing about Jupyter reaches the
browser: no widgets, no kernel, no JavaScript beyond what the rest of the page
already loads.

## Footnotes and lists

Footnotes collect at the foot of the post with a link back to where they were
referenced.[^pipeline] Task lists render as checkboxes:

- [x] Prerendered HTML for every route
- [x] Feed and sitemap
- [ ] Whatever you add next

[^pipeline]: The pipeline is remark-parse, remark-gfm, remark-math,
    remark-rehype, then rehype-raw, rehype-slug, rehype-citation, the notebook
    and diagram steps, rehype-highlight, rehype-katex and finally the figure and
    caption steps. Order matters: raw HTML is parsed first, notebooks and
    diagrams are expanded before the highlighter sees them, and captions are
    numbered last, once every block that can take one exists.

## Several authors

This post lists two. Each gets a byline with their affiliation at the top, a
card at the bottom, and their own page listing everything they have written.
