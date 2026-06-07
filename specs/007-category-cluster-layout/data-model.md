# Data Model: Category Cluster Layout

**Feature**: 007-category-cluster-layout | **Date**: 2026-05-31

---

## New Entity: SentimentCluster

Produced by `calculateClustering`, consumed by `ArticleScatter` for proportion labels.

| Field | Type | Description |
|---|---|---|
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | Which category this cluster represents |
| `count` | `number` | Number of article dots in this cluster |
| `percent` | `number` | Share of total displayed dots, 0–100 (rounded for display) |
| `cx` | `number` | Centroid X (px) — for label placement |
| `cy` | `number` | Centroid Y (px) — for label placement |

**Invariants**:
- Only sentiments with `count > 0` appear as clusters
- `sum(cluster.count) === points.length`
- `sum(cluster.percent) ≈ 100` (±rounding)

---

## Changed: `calculateClustering` return shape

| Before | After |
|---|---|
| `MappedPoint[]` | `{ points: MappedPoint[]; clusters: SentimentCluster[] }` |

`points` is unchanged in element shape (still `Article & { x, y }`), but positions are now sentiment-clustered.

---

## Existing Entity: MappedPoint (element shape unchanged)

| Field | Type | Change |
|---|---|---|
| all `Article` fields | — | unchanged |
| `x` | `number` | now placed within the dot's sentiment cluster (was: near global center) |
| `y` | `number` | now placed within the dot's sentiment cluster |

---

## Cluster Layout Parameters (constants in clustering.ts)

| Constant | Value | Meaning |
|---|---|---|
| `CLUSTER_ORDER` | `['negative','neutral','positive']` | Left→right anchor ordering of present clusters |
| `ANCHOR_STRENGTH` | `0.30` | forceX/forceY pull toward the cluster anchor |
| `COLLIDE_RADIUS` | `14` | per-dot collision spacing (dot visual radius + gap) |
| `SETTLE_TICKS` | `120` | simulation ticks before reading positions |
| anchorX(i, N) | `width * (i+1)/(N+1)` | horizontal anchor for present cluster i of N |
| anchorY | `height * 0.5` | vertical anchor (collision spreads vertically) |

---

## Hook: useClustering return change

| Before | After |
|---|---|
| `{ points }` | `{ points, clusters }` |

`ArticleScatter` reads both: `points` for dots, `clusters` for proportion labels.

---

## Validation Rules

- A dot is assigned to exactly one cluster = its `sentiment`
- No cross-category dots: every dot's color matches its cluster (guaranteed since cluster = sentiment)
- Clusters present ⊆ {negative, neutral, positive}, max 3
- Empty article set → `{ points: [], clusters: [] }`
- Percent values are computed over `points.length` (displayed set), rounded to whole numbers for labels
