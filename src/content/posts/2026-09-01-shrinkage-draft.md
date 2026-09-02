---
title: Shrinkage priors for the variance component (draft)
date: 2026-09-01
authors: [kiarash]
tags: [bayes, priors]
summary: Half-Cauchy versus penalised complexity on the eight-schools data, plus the case where both fail.
draft: true
---

Draft. Visible with `npm run dev`, excluded from `npm run build`.

The comparison is between Gelman's half-Cauchy recommendation and the penalised
complexity prior of Simpson et al. On eight schools they are close enough that
the choice does not matter. The interesting case is $J = 3$ groups, where the
likelihood carries almost no information about $\tau$ and the posterior is the
prior.

$$
p(\tau) \propto \exp\!\left(-\lambda \tau\right), \qquad
\lambda = -\frac{\log \alpha}{U}
$$

Still need to run the $J = 3$ simulations before this is worth posting.
