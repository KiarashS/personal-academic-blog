---
title: Math and citations
date: 2026-01-19
authors: [you]
category: Mathematics
tags: [guide, math, citations]
summary: KaTeX for equations, a BibTeX file for references, and a cite-this-post block generated from frontmatter.
publication:
  status: Preprint
  venue: A journal you submitted to
  year: 2026
  doi: 10.0000/placeholder
  url: https://example.org/preprint
  pdf: /posts/writing-a-post/example.pdf
  code: https://github.com/KiarashS/personal-academic-blog
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

## The paper behind a post

A post that accompanies published work can say so in its frontmatter, and the
box at the top of this one is the result:

```yaml
publication:
  status: Preprint # or Under review, Published, To appear
  venue: Journal of Statistical Software
  year: 2026
  doi: 10.5281/zenodo.123
  url: https://arxiv.org/abs/2601.01234
  pdf: /posts/my-post/paper.pdf
  code: https://github.com/you/replication
  data: https://doi.org/10.5281/zenodo.124
```

Every field is optional. The DOI moves out of the header line and into the box
so it is not printed twice, and it is the DOI the citations below use. A `pdf`,
`code` or `data` path under `public/` picks up the deployment's base path; a
full URL is left alone. The values in this post are placeholders — that DOI
resolves to nothing.

## Citations

Write `[@key]` and the key is resolved against `src/content/references.bib` at
build time, then a reference list is appended to the post. Literate programming
came out of Knuth's work on TeX [@knuth1984literate], and the sandwich variance
estimator's standard treatment is White's [@white1982maximum].

The bibliography below is generated. Add entries to the `.bib` file, cite them
by key, and the list follows.

## Citing the post itself

Each post carries a "cite this post" block under the text, built from the
frontmatter in four forms — BibTeX, APA, IEEE and a plain sentence — each with
its own copy button. Names are reshaped for each style: APA wants the surname
first and given names as initials, IEEE wants the initials first, and the plain
form leaves them as you wrote them. A DOI, from the post or its publication
block, goes into all four; APA uses it in place of the URL, which is what the
style asks for.

The date cited is the date of the version being read, so a post that has been
revised is cited by its revision. The point of all this is that someone quoting
you does not reconstruct the fields by hand and get your name wrong.
