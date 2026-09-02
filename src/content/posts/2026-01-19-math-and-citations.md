---
title: Math and citations
date: 2026-01-19
authors: [you]
tags: [guide, math, citations]
summary: KaTeX for equations, a BibTeX file for references, and a cite-this-post block generated from frontmatter.
---

Math is written between dollar signs and rendered by KaTeX when the site is
built. Nothing is rendered in the reader's browser, and no KaTeX JavaScript is
downloaded — only its stylesheet and fonts.

## Inline and display

Inline math sits between single dollars: the variance of $X$ is
$\operatorname{Var}(X) = \mathbb{E}[(X - \mu)^2]$. Display math uses double
dollars:

$$
\hat\beta = (X^\top X)^{-1} X^\top y
$$

Environments work, which is what most real derivations need:

$$
\begin{aligned}
\log p(y \mid \theta) &= \sum_{i=1}^n \log p(y_i \mid \theta) \\
                      &= -\frac{n}{2}\log(2\pi\sigma^2)
                         - \frac{1}{2\sigma^2}\sum_{i=1}^n (y_i - \mu)^2 .
\end{aligned}
$$

Strict mode is off and errors do not throw, so a malformed expression renders
in red where it stands instead of blanking the page.

## Citations

Write `[@key]` and the key is resolved against `src/content/references.bib` at
build time, then a reference list is appended to the post. Literate programming
came out of Knuth's work on TeX [@knuth1984literate], and the sandwich variance
estimator's standard treatment is White's [@white1982maximum].

The bibliography below is generated. Add entries to the `.bib` file, cite them
by key, and the list follows.

## Citing the post itself

Each post carries a "cite this post" block under the text, built from the
frontmatter: authors, title, year, and the post's URL, formatted as BibTeX with
a copy button. If the post has a `doi`, it goes in the entry too. The point is
that someone quoting you does not have to reconstruct the fields by hand and
get your name wrong.
