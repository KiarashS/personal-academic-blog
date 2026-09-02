---
title: Notation I have stopped using
date: 2026-02-17
authors: [kiarash]
tags: [writing, notation, notes]
summary: Five conventions that seemed compact when I learned them and cost me hours of referee correspondence since.
---

Every one of these was standard in a paper I learned it from. Every one has
since produced a referee comment asking what I meant.

**$\mathbb{E}$ without a subscript.** Under misspecification there are at least
two measures in play, and $\mathbb{E}[\cdot]$ silently picks one. I now write
$\mathbb{E}_P$ and $\mathbb{E}_{P_\theta}$ everywhere, even when they coincide,
because the places where they do not are exactly the places the reader needs
the reminder.[^1]

**Reusing $n$ for sample size and dimension.** Obvious in hindsight. It survived
three drafts because the sample size never appeared in the same display as the
dimension until the proof of Theorem 3.

**Prime for both derivative and transpose.** $A'B'$ is ambiguous the moment $A$
is matrix-valued and differentiable. I use $A^\top$ and $\dot A$.

**The bar for both mean and complement.** $\bar X$ is the sample mean;
$\bar{A}$ is the complement of the event $A$. In a paper about the empirical
process of an indicator function, both appear in the same line.

**Writing $O(\cdot)$ where I meant $O_p(\cdot)$.** These differ, and a referee
who catches it will reasonably wonder what else is loose. The convergence

$$
\hat\theta_n - \theta_\star = O_p(n^{-1/2})
$$

is a statement about a sequence of random variables, not about a deterministic
sequence, and the proof needed for one is not the proof needed for the other.

> The referee who pushed hardest on the last point was right, and the revision
> took a week. The theorem was still true.

None of this is about elegance. It is about how many emails a paper generates
after it leaves your hands.

[^1]: Halbert White's 1982 *Econometrica* paper on maximum likelihood under
    misspecification is careful about this throughout, and reading it is what
    made me change the habit.
