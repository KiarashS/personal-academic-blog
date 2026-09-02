---
title: What the bootstrap actually estimates when the model is wrong
date: 2026-08-19
authors: [kiarash]
tags: [bootstrap, asymptotics, misspecification]
summary: The nonparametric bootstrap keeps working under misspecification, but the thing it consistently estimates is the sandwich variance, not the inverse Fisher information.
doi: 10.5281/zenodo.0000000
---

Take an M-estimator $\hat\theta_n$ defined as the maximiser of

$$
M_n(\theta) = \frac{1}{n}\sum_{i=1}^{n} m(X_i, \theta),
$$

with $X_1,\dots,X_n$ i.i.d. from some $P$ that need not belong to the model.
Under the usual regularity conditions the estimator converges to the
pseudo-true parameter $\theta_\star = \arg\max_\theta \mathbb{E}_P\,m(X,\theta)$,
and

$$
\sqrt{n}\,(\hat\theta_n - \theta_\star) \rightsquigarrow N\!\left(0,\ A^{-1} B A^{-1}\right),
$$

where $A = -\mathbb{E}_P\,\ddot m(X,\theta_\star)$ and
$B = \operatorname{Var}_P\,\dot m(X,\theta_\star)$.

When the model is correct and $m$ is the log-likelihood, the information
equality gives $A = B$ and the sandwich collapses to $A^{-1}$. When it is not
correct, $A \neq B$, and the two differ by an amount that has nothing to do
with sample size.

## Why the bootstrap does not care

The nonparametric bootstrap resamples from $\mathbb{P}_n$, so it estimates the
sampling distribution of $\hat\theta_n$ under $\mathbb{P}_n$ rather than under
the model. That is precisely the quantity in the display above. Nothing in the
argument uses correctness of the parametric family.

The parametric bootstrap does the opposite. It draws from
$P_{\hat\theta_n}$, so it reproduces the variance the model *would* have had if
it were true, which is $A^{-1}$. Under misspecification it converges to the
wrong limit, and no amount of resampling repairs it.

| Method | Estimates | Correct under misspecification |
| --- | --- | --- |
| Inverse observed information | $A^{-1}$ | no |
| Sandwich / Huber-White | $A^{-1}BA^{-1}$ | yes |
| Nonparametric bootstrap | $A^{-1}BA^{-1}$ | yes |
| Parametric bootstrap | $A^{-1}$ | no |

## A check you can run in a minute

```python
import numpy as np
from scipy.optimize import minimize

rng = np.random.default_rng(20260819)

# Data are Student-t with 3 df; the model fitted is Gaussian with known scale.
x = rng.standard_t(df=3, size=2000)

def negloglik(theta, sample):
    return 0.5 * np.sum((sample - theta[0]) ** 2)

def fit(sample):
    return minimize(negloglik, x0=[0.0], args=(sample,)).x[0]

theta_hat = fit(x)

boot = np.array([fit(rng.choice(x, size=x.size, replace=True)) for _ in range(2000)])
print("bootstrap sd  ", boot.std(ddof=1))
print("model-based sd", np.sqrt(1.0 / x.size))
```

With $\nu = 3$ the Student-t variance is 3, so the sandwich standard error is
about $\sqrt{3/n}$ while the model-based one is $\sqrt{1/n}$. The bootstrap
lands on the first. The gap is a factor of $\sqrt{3}$, and it does not shrink.

## The part people get wrong

The bootstrap being robust here is often read as the bootstrap being robust in
general. It is not. It inherits whatever the empirical measure gets right. With
dependent data, $\mathbb{P}_n$ is the wrong resampling distribution, and the
plain nonparametric bootstrap fails for the same reason the sandwich fails: both
assume independent observations. Block bootstraps exist for that case, and
choosing the block length is its own problem.
