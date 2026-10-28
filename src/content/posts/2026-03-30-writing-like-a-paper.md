---
title: Writing like a paper
date: 2026-03-30
authors: [you]
category: Tutorials
tags: [guide, writing]
summary: Theorems and proofs, references that number themselves, sidenotes, algorithms, TikZ, charts, chemistry, and code that shows what changed.
---

A paper has habits a blog usually drops: numbered statements, references that
say "Figure 2" and stay right, notes in the margin, algorithms set between two
rules. This post shows each one, in the Markdown that writes it. The numbers in
the chart are made up for the example.

## References that write themselves

A link with no text to something the post numbers fills in its name. As
[](#fig-loss) shows, warm-up reaches a lower loss; [](#thm-bayes) is the rule
behind [](#eq-bayes), and [](#alg-sgd) is the update. A link to a heading reads
the heading: see [](#sidenotes).

```md
As [](#fig-loss) shows, … [](#thm-bayes) … [](#eq-bayes) … [](#alg-sgd)
```

It works for figures, tables, listings, notebooks, algorithms, theorem-like
blocks and equations. A link with words of its own is left as written, and a
name the post does not have reads "??", and the build says which.

## Theorems and proofs

Written as an alert is, with the kind in brackets. The rest of the first line
is the title, and `{#name}` names the block for links.

> [!DEFINITION] Posterior {#def-posterior}
> The posterior is the distribution of the parameters given the data,
> $p(\theta \mid y)$.

> [!THEOREM] Bayes' rule {#thm-bayes}
> For events $A$ and $B$ with $P(B) > 0$,
>
> $$
> P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}
> \label{bayes}
> $$

> [!PROOF] of [](#thm-bayes)
> By the definition of conditional probability,
> $P(A \cap B) = P(A \mid B)\,P(B) = P(B \mid A)\,P(A)$. Divide by $P(B)$.

> [!REMARK]
> [](#def-posterior) is [](#thm-bayes) with $A$ the parameters and $B$ the data.

```md
> [!THEOREM] Bayes' rule {#thm-bayes}
> For events $A$ and $B$ with $P(B) > 0$, …

> [!PROOF] of [](#thm-bayes)
> By the definition of conditional probability, …
```

The kinds are theorem, lemma, proposition, corollary, conjecture, definition,
example, remark and proof. All but the proof share one count, so a reader
looking for "2" finds one thing; a proof ends with a tombstone.

## Sidenotes

Footnotes are written as they always are.[^margin] On a screen wide enough to
have a margin, a note stands beside the line that cites it; on a narrower one it
is at the foot of the post, where a footnote goes.[^both] A note that holds a
list or code stays at the foot on every screen.[^list]

[^margin]: Like this one. Nothing in the Markdown changes.

[^both]: The page carries the note in both places and shows one of them, so a
    screen reader meets it once.

[^list]: Because a list does not fit a 13rem margin:

    - the margin is for a sentence or two;
    - anything longer reads better at the foot.

## Algorithms

The `algorithmicx` syntax, in a fence, set at build time with KaTeX for the
maths. `\label{sgd}` names it for a link.

```algorithm
\begin{algorithm}
\caption{Stochastic gradient descent}
\label{sgd}
\begin{algorithmic}
\REQUIRE step size $\eta$, initial $\theta_0$
\STATE $t \gets 0$
\WHILE{not converged}
  \STATE sample a minibatch $B_t$
  \STATE $\theta_{t+1} \gets \theta_t - \eta \nabla L_{B_t}(\theta_t)$
  \STATE $t \gets t + 1$
\ENDWHILE
\RETURN $\theta_t$
\end{algorithmic}
\end{algorithm}
```

## Pictures in TikZ

TikZ in a fence, drawn by TeX at build time with no TeX installed. Black is the
page's ink and white its background, so the picture follows the theme.

```tikz
% alt: A curve falling from the y axis towards the x axis, with its equation labelled
\begin{tikzpicture}[>=Stealth, scale=1.2]
  \draw[->] (0,0) -- (3.4,0) node[right] {$t$};
  \draw[->] (0,0) -- (0,2.2) node[above] {$L(t)$};
  \draw[thick, domain=0:3.2, smooth, samples=60] plot (\x, {1.8*exp(-\x)+0.2});
  \node[draw, fill=white, rounded corners=2pt, inner sep=4pt] at (2.1,1.4) {$L(t) = a e^{-t} + b$};
\end{tikzpicture}
```

Caption: A loss falling exponentially towards its floor $b$. {#fig-decay}

## Charts

A Vega-Lite spec in a fence. The page arrives with the chart drawn; pointing at
it loads the charting library and makes it live, with tooltips. The data, read
here from a CSV beside the post, is under it as a table.

```vega-lite
{
  "description": "Validation loss against training step, with and without warm-up",
  "data": { "url": "/posts/writing-like-a-paper/loss.csv" },
  "mark": { "type": "line", "point": false },
  "encoding": {
    "x": { "field": "step", "type": "quantitative", "title": "Training step" },
    "y": {
      "field": "loss",
      "type": "quantitative",
      "title": "Validation loss",
      "scale": { "zero": false }
    },
    "color": { "field": "schedule", "type": "nominal", "title": "Schedule" }
  }
}
```

Caption: Validation loss with a constant learning rate and with warm-up. {#fig-loss}

## Chemistry

`\ce` and `\pu` inside maths: $\ce{C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O}$, with
$\Delta H = \pu{-2870 kJ/mol}$, and ions such as $\ce{SO4^2-}$.

## Code that shows what changed

`{3}` after the language marks a line:

```python {3}
def loss(model, batch):
    logits = model(batch.x)
    return cross_entropy(logits, batch.y)
```

`diff-python` marks what a change adds and removes, highlighted as Python. The
copy button copies the code after the change.

```diff-python
 def step(model, batch, optimiser):
-    loss = loss_fn(model, batch)
+    with autocast():
+        loss = loss_fn(model, batch)
     loss.backward()
```

Fences that each name a `tab` and follow one another become one set of tabs.
Picking a language in one set picks it in every set, and the page remembers.

```python tab="Python"
model = LogisticRegression().fit(X, y)
```

```r tab="R"
model <- glm(y ~ ., data = d, family = binomial)
```

Caption: The same model in two languages. {#lst-fit}
