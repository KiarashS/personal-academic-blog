---
title: Figures with mdxcn
date: 2026-04-13
authors: [you]
category: Tutorials
tags: [guide, mdxcn]
summary: Every mdxcn component, written in Markdown inside a post, with the source of each under it.
---

[mdxcn](https://mdxcn.dev) is a set of figures drawn in characters: a dashed
frame with a title on its top edge, and inside it a timeline, a table or a
chart made of glyphs. This site renders all of its components in Markdown.
Write the tag, a blank line, Markdown, a blank line, and the closing tag:

````markdown
<GraphTimeline title="NIGHT">

- 14:02: p95 crossed 800ms
- **14:11: rolled back the cache flag**
- *14:40: write the postmortem*

</GraphTimeline>
````

The Markdown inside is the data. Each component reads it its own way, and
the grammar is shared: **bold** is now, chosen or the total; *italic* is next,
rejected or an aside; `- label: value` is a row; text after an em dash is a
note. Attributes are props. Their values are text, so `[…]` and `{…}` are read
as JSON, and `true` and `false` as booleans.

A figure is drawn when the site is built and appears with the page, before
any script runs, in the site's own fonts and colours, in light and in dark.
Feed readers, and browsers that cannot draw it, get the Markdown inside as
plain text. Maths is not rendered inside a figure, and a figure cannot hold
another.

Below is every component, each with a line on what it is for, the figure,
and the Markdown that drew it.

## Writing

Figures for prose: a caveat, a quotation, a procedure, a shell session, a release, code with notes, a decision, a conversation, configuration, an API route, shortcuts and questions.

### Callout

An aside the reader should not skip. `type` is `note`, `tip`, `warning` or `danger`.

<Callout type="warning">

Inspect a model on held-out patients, not held-out scans. Two scans of the same patient in train and test sets leak the label.

</Callout>

<details>
<summary>Markdown</summary>

````markdown
<Callout type="warning">

Inspect a model on held-out patients, not held-out scans. Two scans of the same patient in train and test sets leak the label.

</Callout>
````

</details>

### Quote

Someone else's sentence, with `by` and `source` under it.

<Quote by="George E. P. Box" source="Robustness in the Strategy of Scientific Model Building, 1979">

All models are wrong but some are useful.

</Quote>

<details>
<summary>Markdown</summary>

````markdown
<Quote by="George E. P. Box" source="Robustness in the Strategy of Scientific Model Building, 1979">

All models are wrong but some are useful.

</Quote>
````

</details>

### Steps

A numbered procedure. A bold step is the current one, an italic step is next.

<Steps title="REPRODUCE">

1. Clone the repository

   Check out the tag the paper cites.

2. **Build the environment**

   `conda env create -f environment.yml` pins every package.

3. *Run the evaluation*

   One script writes every table in the paper.

</Steps>

<details>
<summary>Markdown</summary>

````markdown
<Steps title="REPRODUCE">

1. Clone the repository

   Check out the tag the paper cites.

2. **Build the environment**

   `conda env create -f environment.yml` pins every package.

3. *Run the evaluation*

   One script writes every table in the paper.

</Steps>
````

</details>

### Terminal

A shell session from a fenced block. Lines starting with `$` are commands.

<Terminal title="SHELL">

```
$ python evaluate.py --split test
✓ 1,204 studies scored in 3m 12s
$ python tables.py
✓ wrote tables/auroc.tex
```

</Terminal>

<details>
<summary>Markdown</summary>

````markdown
<Terminal title="SHELL">

```
$ python evaluate.py --split test
✓ 1,204 studies scored in 3m 12s
$ python tables.py
✓ wrote tables/auroc.tex
```

</Terminal>
````

</details>

### Changelog

One release. Each item is `kind: change`.

<Changelog version="2.1.0" date="Mar 30">

- added: Calibration plots for every site
- changed: Thresholds are chosen on the validation split
- fixed: Patients with one visit were dropped twice

</Changelog>

<details>
<summary>Markdown</summary>

````markdown
<Changelog version="2.1.0" date="Mar 30">

- added: Calibration plots for every site
- changed: Thresholds are chosen on the validation split
- fixed: Patients with one visit were dropped twice

</Changelog>
````

</details>

### Annotate

Code with numbered notes. A `# (1)` marker in the fence is explained by item 1 of the list after it.

<Annotate title="split.py">

```python
def split(patients, seed=0):  # (1)
    rng = random.Random(seed)
    ids = sorted({p.id for p in patients})  # (2)
    rng.shuffle(ids)
    return ids[: len(ids) // 5], ids[len(ids) // 5 :]
```

1. The seed is an argument, so a split can be named in a paper.
2. Split on patient ids, never on scans.

</Annotate>

<details>
<summary>Markdown</summary>

````markdown
<Annotate title="split.py">

```python
def split(patients, seed=0):  # (1)
    rng = random.Random(seed)
    ids = sorted({p.id for p in patients})  # (2)
    rng.shuffle(ids)
    return ids[: len(ids) // 5], ids[len(ids) // 5 :]
```

1. The seed is an argument, so a split can be named in a paper.
2. Split on patient ids, never on scans.

</Annotate>
````

</details>

### Decision

A decision with its options. Bold is chosen, italic is rejected, and the paragraph after says what would change it.

<Decision title="BACKBONE" status="accepted" date="Mar 12">

- **ResNet-50** — strong baseline, fits on one GPU
- *ViT-L* — needs more data than the cohort has
- ConvNeXt-T — worth trying in the next round

Revisit when the second site's data arrives.

</Decision>

<details>
<summary>Markdown</summary>

````markdown
<Decision title="BACKBONE" status="accepted" date="Mar 12">

- **ResNet-50** — strong baseline, fits on one GPU
- *ViT-L* — needs more data than the cohort has
- ConvNeXt-T — worth trying in the next round

Revisit when the second site's data arrives.

</Decision>
````

</details>

### Chat

A conversation, one `speaker: message` item per turn. An italic turn is an aside.

<Chat title="REVIEW">

- reviewer 2: Is the test set from the same hospital?
- authors: No. It is a second site, collected a year later.
- authors: *attaches the cohort table*
- reviewer 2: Thank you, that answers it.

</Chat>

<details>
<summary>Markdown</summary>

````markdown
<Chat title="REVIEW">

- reviewer 2: Is the test set from the same hospital?
- authors: No. It is a second site, collected a year later.
- authors: *attaches the cohort table*
- reviewer 2: Thank you, that answers it.

</Chat>
````

</details>

### Env

Environment variables from a fenced `.env`. A comment saying `Required` marks the key as required.

<Env>

```bash
# Where the de-identified studies live. Required.
DATA_DIR=/data/cohort-2026

# Leave empty to log to the console only
WANDB_PROJECT=
```

</Env>

<details>
<summary>Markdown</summary>

````markdown
<Env>

```bash
# Where the de-identified studies live. Required.
DATA_DIR=/data/cohort-2026

# Leave empty to log to the console only
WANDB_PROJECT=
```

</Env>
````

</details>

### Endpoint

One API route: the method and path, a sentence, a table of parameters (a bold name is required), and fenced examples.

<Endpoint>

POST /v1/predict

Scores one study and returns the probability with its calibration bin.

| Field | Type | |
| --- | --- | --- |
| **study_id** | string | De-identified study id |
| threshold | number | Overrides the site default |

```json
{ "probability": 0.82, "bin": "0.8-0.9" }
```

</Endpoint>

<details>
<summary>Markdown</summary>

````markdown
<Endpoint>

POST /v1/predict

Scores one study and returns the probability with its calibration bin.

| Field | Type | |
| --- | --- | --- |
| **study_id** | string | De-identified study id |
| threshold | number | Overrides the site default |

```json
{ "probability": 0.82, "bin": "0.8-0.9" }
```

</Endpoint>
````

</details>

### Keys

Keyboard shortcuts, one `keys: action` item each. `then` starts the next key of a sequence.

<Keys title="SHORTCUTS">

- /: search the blog
- j: next post in the list
- g then b: back to the blog index

</Keys>

<details>
<summary>Markdown</summary>

````markdown
<Keys title="SHORTCUTS">

- /: search the blog
- j: next post in the list
- g then b: back to the blog index

</Keys>
````

</details>

### Faq

Questions and answers. Each `###` heading is a question; a bold one is the one to read first.

<Faq>

### Is the code available?

Yes. The repository is linked from the paper's first page.

### Can I use the weights clinically?

No. They are released for research only.

</Faq>

<details>
<summary>Markdown</summary>

````markdown
<Faq>

### Is the code available?

Yes. The repository is linked from the paper's first page.

### Can I use the weights clinically?

No. They are released for research only.

</Faq>
````

</details>

## Paths and plans

Figures for how something moves and what happens when: a pipeline, a dated list, a hierarchy, a schedule, columns of work, a punch list.

### GraphFlow

A process on an arrow. One line per path, split on `→`; the bold node is the one you are on.

<GraphFlow title="PIPELINE">

scan → preprocess → **model** → calibrate → report

</GraphFlow>

<details>
<summary>Markdown</summary>

````markdown
<GraphFlow title="PIPELINE">

scan → preprocess → **model** → calibrate → report

</GraphFlow>
````

</details>

### GraphTimeline

A dated list, one `- date: event` item each. Bold is now, italic is next, and text after an em dash is a note.

<GraphTimeline title="SUBMISSION">

- Jan 15: first draft — methods and results
- Feb 20: internal review
- **Mar 12: submitted to the conference**
- *May 04: author response*

</GraphTimeline>

<details>
<summary>Markdown</summary>

````markdown
<GraphTimeline title="SUBMISSION">

- Jan 15: first draft — methods and results
- Feb 20: internal review
- **Mar 12: submitted to the conference**
- *May 04: author response*

</GraphTimeline>
````

</details>

### GraphTree

A nested list drawn as a tree.

<GraphTree title="REPOSITORY">

- experiments
  - baseline.yaml
  - **ablation.yaml**
- src
  - data.py
  - train.py
- README.md

</GraphTree>

<details>
<summary>Markdown</summary>

````markdown
<GraphTree title="REPOSITORY">

- experiments
  - baseline.yaml
  - **ablation.yaml**
- src
  - data.py
  - train.py
- README.md

</GraphTree>
````

</details>

### GraphGantt

A schedule. Each item is `label: start end done`, all as fractions of the track; `progress` draws today.

<GraphGantt title="THESIS" progress="0.55">

- literature: 0 0.3 1
- experiments: 0.2 0.7 0.6
- writing: 0.5 0.95 0.2
- defence: 0.9 1 0

</GraphGantt>

<details>
<summary>Markdown</summary>

````markdown
<GraphGantt title="THESIS" progress="0.55">

- literature: 0 0.3 1
- experiments: 0.2 0.7 0.6
- writing: 0.5 0.95 0.2
- defence: 0.9 1 0

</GraphGantt>
````

</details>

### GraphBoard

Columns of work: a `###` heading per column with a list under it. Bold is now, italic is next.

<GraphBoard title="LAB">

### Now
- **Rerun the second-site evaluation**

### Next
- Calibration plots — for the camera-ready

### Later
- *A release of the weights*

</GraphBoard>

<details>
<summary>Markdown</summary>

````markdown
<GraphBoard title="LAB">

### Now
- **Rerun the second-site evaluation**

### Next
- Calibration plots — for the camera-ready

### Later
- *A release of the weights*

</GraphBoard>
````

</details>

### GraphCheck

A punch list from a task list. A nested list is sub-tasks, and an em dash adds a note.

<GraphCheck title="CAMERA READY">

- [x] fix the figure fonts
- [x] add the second site
- [ ] release the code — after the embargo
  - [x] remove patient ids
  - [ ] write the README

</GraphCheck>

<details>
<summary>Markdown</summary>

````markdown
<GraphCheck title="CAMERA READY">

- [x] fix the figure fonts
- [x] add the second site
- [ ] release the code — after the embargo
  - [x] remove patient ids
  - [ ] write the README

</GraphCheck>
````

</details>

## Numbers in rows

Figures for numbers that are read rather than compared by eye: headline figures, a specification, a change, a trend, tables, options and a bill.

### GraphStat

Two to four numbers, no trend. Each item is `**value** label`.

<GraphStat title="COHORT">

- **12,400** studies
- **3,108** patients
- **2** sites

</GraphStat>

<details>
<summary>Markdown</summary>

````markdown
<GraphStat title="COHORT">

- **12,400** studies
- **3,108** patients
- **2** sites

</GraphStat>
````

</details>

### GraphSpec

A label and value sheet, one `- label: value` item each.

<GraphSpec title="TRAINING">

- Optimiser: AdamW
- Learning rate: 3e-4, cosine
- Batch: 64 studies
- Epochs: 40
- Hardware: one A100

</GraphSpec>

<details>
<summary>Markdown</summary>

````markdown
<GraphSpec title="TRAINING">

- Optimiser: AdamW
- Learning rate: 3e-4, cosine
- Batch: 64 studies
- Epochs: 40
- Hardware: one A100

</GraphSpec>
````

</details>

### GraphDiff

What changed. A `+` value is added, a `-` value removed, and `~~old~~ new` is a rewrite.

<GraphDiff title="REVISION">

- results: +2 tables
- appendix: -1 figure
- config: ~~train.yaml~~ train-v2.yaml

</GraphDiff>

<details>
<summary>Markdown</summary>

````markdown
<GraphDiff title="REVISION">

- results: +2 tables
- appendix: -1 figure
- config: ~~train.yaml~~ train-v2.yaml

</GraphDiff>
````

</details>

### GraphKpi

One headline number with a trend: the value, label and hint on the first line, then a line of numbers.

<GraphKpi title="LABELLED">

1,240 studies this week — +18%

410 520 480 610 700 820 950 1050 1240

</GraphKpi>

<details>
<summary>Markdown</summary>

````markdown
<GraphKpi title="LABELLED">

1,240 studies this week — +18%

410 520 480 610 700 820 950 1050 1240

</GraphKpi>
````

</details>

### GraphTable

A Markdown table. A last row in bold, or starting with Total, is the footer.

<GraphTable title="COMPUTE">

| Run | GPU hours | Cost |
| --- | --- | --- |
| baseline | 14 | $28 |
| ablations | 96 | $192 |
| final | 30 | $60 |
| **Total** | **140** | **$280** |

</GraphTable>

<details>
<summary>Markdown</summary>

````markdown
<GraphTable title="COMPUTE">

| Run | GPU hours | Cost |
| --- | --- | --- |
| baseline | 14 | $28 |
| ablations | 96 | $192 |
| final | 30 | $60 |
| **Total** | **140** | **$280** |

</GraphTable>
````

</details>

### GraphSheet

A grouped table: a `###` heading per section, each with a table under it. `align` sets the columns, which are right-aligned after the first unless told.

<GraphSheet title="PAPER" align="left left left">

### Done

| Section | Owner | Status |
| --- | --- | --- |
| Methods | you | done |
| Results | coauthor | done |

### Open

| Section | Owner | Status |
| --- | --- | --- |
| Discussion | you | drafting |

</GraphSheet>

<details>
<summary>Markdown</summary>

````markdown
<GraphSheet title="PAPER" align="left left left">

### Done

| Section | Owner | Status |
| --- | --- | --- |
| Methods | you | done |
| Results | coauthor | done |

### Open

| Section | Owner | Status |
| --- | --- | --- |
| Discussion | you | drafting |

</GraphSheet>
````

</details>

### GraphCompare

Options side by side, from a table whose first row names them.

<GraphCompare title="BACKBONE">

| | ResNet-50 | ViT-L |
| --- | --- | --- |
| Fits on one GPU | yes | no |
| Pretrained on X-rays | yes | yes |
| Params | 25M | 304M |

</GraphCompare>

<details>
<summary>Markdown</summary>

````markdown
<GraphCompare title="BACKBONE">

| | ResNet-50 | ViT-L |
| --- | --- | --- |
| Fits on one GPU | yes | no |
| Pretrained on X-rays | yes | yes |
| Params | 25M | 304M |

</GraphCompare>
````

</details>

### GraphMatrix

Exact numbers on both axes, from a table. Here a confusion matrix.

<GraphMatrix title="CONFUSION">

| | Predicted pos | Predicted neg |
| --- | --- | --- |
| Actual pos | 182 | 18 |
| Actual neg | 41 | 959 |

</GraphMatrix>

<details>
<summary>Markdown</summary>

````markdown
<GraphMatrix title="CONFUSION">

| | Predicted pos | Predicted neg |
| --- | --- | --- |
| Actual pos | 182 | 18 |
| Actual neg | 41 | 959 |

</GraphMatrix>
````

</details>

### GraphInvoice

From, bill-to and line items. `from` and `to` are props, the items are a table, and each line under it that ends in an amount is a total; a bold one is the amount due. Any other paragraph is the note.

<GraphInvoice title="CLAIM 0007" from="Imaging Lab" to="Graduate School">

| Description | Amount |
| --- | --- |
| GPU hours, March | 280 |
| Conference registration | 650 |

Subtotal 930

**Amount due 930**

Paid from the lab's travel budget.

</GraphInvoice>

<details>
<summary>Markdown</summary>

````markdown
<GraphInvoice title="CLAIM 0007" from="Imaging Lab" to="Graduate School">

| Description | Amount |
| --- | --- |
| GPU hours, March | 280 |
| Conference registration | 650 |

Subtotal 930

**Amount due 930**

Paid from the lab's travel budget.

</GraphInvoice>
````

</details>

## Charts

Figures for numbers compared by eye, all drawn in characters.

### GraphRank

A short ranked list. Each item is `value label`.

<GraphRank title="READS">

- 4,120 writing a post
- 2,860 math and citations
- 1,490 diagrams
- 610 publishing

</GraphRank>

<details>
<summary>Markdown</summary>

````markdown
<GraphRank title="READS">

- 4,120 writing a post
- 2,860 math and citations
- 1,490 diagrams
- 610 publishing

</GraphRank>
````

</details>

### GraphFunnel

Steps that drop off, one `value label` item each.

<GraphFunnel title="SCREENING">

- 12,400 studies
- 9,870 with a report
- 6,220 one finding
- 4,100 labelled

</GraphFunnel>

<details>
<summary>Markdown</summary>

````markdown
<GraphFunnel title="SCREENING">

- 12,400 studies
- 9,870 with a report
- 6,220 one finding
- 4,100 labelled

</GraphFunnel>
````

</details>

### GraphSlope

Before and after, one `- label: from → to` item each. `fromLabel` and `toLabel` head the columns.

<GraphSlope title="SITE B" fromLabel="before" toLabel="after">

- AUROC: 84 → 90
- Sensitivity: 71 → 82
- Specificity: 88 → 87

</GraphSlope>

<details>
<summary>Markdown</summary>

````markdown
<GraphSlope title="SITE B" fromLabel="before" toLabel="after">

- AUROC: 84 → 90
- Sensitivity: 71 → 82
- Specificity: 88 → 87

</GraphSlope>
````

</details>

### GraphBullet

Actual against a target, one `- label: value / target` item each.

<GraphBullet title="TARGETS">

- Sensitivity: 82 / 90
- Specificity: 87 / 85
- Coverage: 64 / 80

</GraphBullet>

<details>
<summary>Markdown</summary>

````markdown
<GraphBullet title="TARGETS">

- Sensitivity: 82 / 90
- Specificity: 87 / 85
- Coverage: 64 / 80

</GraphBullet>
````

</details>

### GraphScore

Ratings out of five or ten. Halves draw a half dot, and bold is the row to read.

<GraphScore title="REVIEWS">

- Novelty: 3.5/5
- Clarity: 4/5
- **Soundness: 4.5/5**

</GraphScore>

<details>
<summary>Markdown</summary>

````markdown
<GraphScore title="REVIEWS">

- Novelty: 3.5/5
- Clarity: 4/5
- **Soundness: 4.5/5**

</GraphScore>
````

</details>

### GraphWaterfall

A running total, one `- label: value` item each; the first is the start and the last the end.

<GraphWaterfall title="COHORT">

- Referred: 3,400
- No consent: -180
- Missing scans: -112
- Enrolled: 3,108

</GraphWaterfall>

<details>
<summary>Markdown</summary>

````markdown
<GraphWaterfall title="COHORT">

- Referred: 3,400
- No consent: -180
- Missing scans: -112
- Enrolled: 3,108

</GraphWaterfall>
````

</details>

### GraphStack

Parts of a whole, one row of labelled segments per item.

<GraphStack title="SPLITS">

- site A: 70 train, 15 validation, 15 test
- site B: 0 train, 0 validation, 100 test

</GraphStack>

<details>
<summary>Markdown</summary>

````markdown
<GraphStack title="SPLITS">

- site A: 70 train, 15 validation, 15 test
- site B: 0 train, 0 validation, 100 test

</GraphStack>
````

</details>

### GraphSpark

A handful of numbers with no axis, then a caption after an em dash.

<GraphSpark title="LOSS">

0.92 0.71 0.55 0.47 0.41 0.38 0.36 0.35 — validation, per epoch

</GraphSpark>

<details>
<summary>Markdown</summary>

````markdown
<GraphSpark title="LOSS">

0.92 0.71 0.55 0.47 0.41 0.38 0.36 0.35 — validation, per epoch

</GraphSpark>
````

</details>

### GraphPlot

A series with a y-scale, one `- label: value` item per column.

<GraphPlot title="STUDIES">

- Jan: 820
- Feb: 940
- Mar: 1210
- Apr: 1100
- May: 1380
- Jun: 1490

</GraphPlot>

<details>
<summary>Markdown</summary>

````markdown
<GraphPlot title="STUDIES">

- Jan: 820
- Feb: 940
- Mar: 1210
- Apr: 1100
- May: 1380
- Jun: 1490

</GraphPlot>
````

</details>

### GraphMeter

One fill from 0 to 1: the value, then a caption.

<GraphMeter title="LABELLING">

64% — of the studies have a second reader

</GraphMeter>

<details>
<summary>Markdown</summary>

````markdown
<GraphMeter title="LABELLING">

64% — of the studies have a second reader

</GraphMeter>
````

</details>

### GraphWaffle

A share as about a hundred cells: the value, then a caption.

<GraphWaffle title="AGREEMENT">

91% — of studies where the two readers agree

</GraphWaffle>

<details>
<summary>Markdown</summary>

````markdown
<GraphWaffle title="AGREEMENT">

91% — of studies where the two readers agree

</GraphWaffle>
````

</details>

### GraphCells

A small filled and empty grid per item. `/` starts the next row.

<GraphCells title="FOLDS">

- fold 1: 1 0 0 0 0 / 1 1 1 1 1
- fold 2: 0 1 0 0 0 / 1 1 1 1 1
- fold 3: 0 0 1 0 0 / 1 1 1 1 1

</GraphCells>

<details>
<summary>Markdown</summary>

````markdown
<GraphCells title="FOLDS">

- fold 1: 1 0 0 0 0 / 1 1 1 1 1
- fold 2: 0 1 0 0 0 / 1 1 1 1 1
- fold 3: 0 0 1 0 0 / 1 1 1 1 1

</GraphCells>
````

</details>

### GraphBars

Two small histograms side by side, one `- label: values` item each.

<GraphBars title="CALIBRATION">

- before: 2 5 8 6 3 1
- after: 1 3 7 7 4 2

</GraphBars>

<details>
<summary>Markdown</summary>

````markdown
<GraphBars title="CALIBRATION">

- before: 2 5 8 6 3 1
- after: 1 3 7 7 4 2

</GraphBars>
````

</details>

### GraphHeatmap

A labelled intensity grid from a table.

<GraphHeatmap title="ERRORS">

| | Mon | Tue | Wed | Thu | Fri |
| --- | --- | --- | --- | --- | --- |
| site A | 2 | 0 | 1 | 4 | 1 |
| site B | 6 | 3 | 2 | 5 | 8 |

</GraphHeatmap>

<details>
<summary>Markdown</summary>

````markdown
<GraphHeatmap title="ERRORS">

| | Mon | Tue | Wed | Thu | Fri |
| --- | --- | --- | --- | --- | --- |
| site A | 2 | 0 | 1 | 4 | 1 |
| site B | 6 | 3 | 2 | 5 | 8 |

</GraphHeatmap>
````

</details>

## Time

Figures for days and instants. The last two tick in the browser, once a second.

### GraphActivity

Daily counts over weeks. Each item is a start date and the counts from it, day by day; `0*3` is three zeros.

<GraphActivity title="COMMITS">

- 2026-02-02: 0 1 4 2 0*3 3 5 2 1 0*2 6 4 2 3 1 0*2 2 7 5 3 0*3 1 2 4

</GraphActivity>

<details>
<summary>Markdown</summary>

````markdown
<GraphActivity title="COMMITS">

- 2026-02-02: 0 1 4 2 0*3 3 5 2 1 0*2 6 4 2 3 1 0*2 2 7 5 3 0*3 1 2 4

</GraphActivity>
````

</details>

### GraphUptime

Status per day, as words: `ok`, `degraded`, `down`, with runs.

<GraphUptime title="CLUSTER">

ok*40 degraded ok*20 down*2 ok*27

</GraphUptime>

<details>
<summary>Markdown</summary>

````markdown
<GraphUptime title="CLUSTER">

ok*40 degraded ok*20 down*2 ok*27

</GraphUptime>
````

</details>

### GraphCalendar

One month with a few marked days. `year`, `month` and `today` are props.

<GraphCalendar title="MARCH" year="2026" month="3" today="12">

- 12: submission
- 20: lab meeting
- 27: poster draft

</GraphCalendar>

<details>
<summary>Markdown</summary>

````markdown
<GraphCalendar title="MARCH" year="2026" month="3" today="12">

- 12: submission
- 20: lab meeting
- 27: poster draft

</GraphCalendar>
````

</details>

### GraphTimer

Time elapsed since an instant, then a caption.

<GraphTimer title="RUNNING">

2026-09-01T09:00Z — since the final run started

</GraphTimer>

<details>
<summary>Markdown</summary>

````markdown
<GraphTimer title="RUNNING">

2026-09-01T09:00Z — since the final run started

</GraphTimer>
````

</details>

### GraphCountdown

Time left until an instant, then a caption.

<GraphCountdown title="DEADLINE">

2027-03-01 — until the journal deadline

</GraphCountdown>

<details>
<summary>Markdown</summary>

````markdown
<GraphCountdown title="DEADLINE">

2027-03-01 — until the journal deadline

</GraphCountdown>
````

</details>
