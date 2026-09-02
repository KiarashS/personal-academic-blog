---
title: A simulation study that survives contact with a reviewer
date: 2026-07-02
updated: 2026-07-15
authors: [kiarash, guest]
tags: [reproducibility, simulation, tooling]
summary: Separating data generation, estimation, and aggregation into three cached stages made our revision take two days instead of three weeks.
---

Our first submission had one script. It generated data, fitted six estimators,
aggregated the results, and drew the figures, in 900 lines. When the reviewer
asked for a seventh estimator and a second noise level, we reran everything from
scratch. Four days of compute, twice, because the first run had a typo in the
aggregation step that we did not notice until the figures came out wrong.

The rewrite split it into stages that write to disk between each step.

```mermaid
flowchart LR
    A[design grid<br/>n, sigma, seed] --> B[generate]
    B --> C[(datasets/)]
    C --> D[estimate]
    D --> E[(fits/)]
    E --> F[aggregate]
    F --> G[(summary.parquet)]
    G --> H[figures + tables]
```

Each stage is content-addressed: the filename is a hash of the parameters that
produced it. Adding an estimator touches only the `estimate` stage, and only for
the new estimator; the 4,800 datasets from the first run are reused untouched.

## The design grid is data, not code

The grid lives in a file, not in nested loops:

```yaml
n:      [50, 200, 1000]
sigma:  [0.5, 1.0, 2.0]
dgp:    [gaussian, student_t3, contaminated]
reps:   500
seed:   20260702
```

A cross product of that is 4,500 cells. The point is that the reviewer's
request became one line in a YAML file plus one new function, and the diff we
attached to the response letter was eleven lines long.

## Seeding

Each cell gets its own seed derived from the master seed and the cell's
identity, rather than drawing from one global stream:

```python
import hashlib
import numpy as np

def seed_for(master: int, **cell) -> np.random.Generator:
    """Deterministic per-cell stream, independent of iteration order."""
    key = f"{master}|" + "|".join(f"{k}={cell[k]}" for k in sorted(cell))
    digest = hashlib.blake2b(key.encode(), digest_size=8).digest()
    return np.random.default_rng(int.from_bytes(digest, "big"))
```

This matters more than it sounds. With a single global stream, running the
cells in a different order, or in parallel, changes every result. With derived
seeds, cell `(n=200, sigma=1.0, dgp=student_t3, rep=17)` produces the same
dataset whether it is computed first, last, or on a different machine.

## What the three stages cost

| Stage | Wall time (48 cores) | Rerun after adding an estimator |
| --- | --- | --- |
| generate | 41 min | 0 min |
| estimate | 6 h 20 min | 63 min |
| aggregate | 3 min | 3 min |

The reviewer's second request, a different contamination fraction, touched the
generate stage and cost a full rerun of estimate. That is the case this design
does not help with, and we said so in the response rather than pretending the
pipeline had solved it.
