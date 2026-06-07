# Data Model: Cluster Mode Toggle

**Feature**: 009-cluster-mode-toggle | **Date**: 2026-05-31

---

## New Type: ClusterMode

```typescript
type ClusterMode = 'sentiment' | 'topic';
```

---

## Changed Entity: Cluster (was SentimentCluster)

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Group key: sentiment value (sentiment mode) or topic id (topic mode) |
| `label` | `string` | Display text (sentiment name or keyword label; `'Other'` for `__other__`) |
| `kind` | `'sentiment' \| 'topic'` | Which mode produced this cluster (drives label styling) |
| `sentiment?` | `'positive'\|'negative'\|'neutral'` | Set only in sentiment mode (label color) |
| `count` | `number` | Dots in this cluster |
| `percent` | `number` | Share of total (0–100, rounded) |
| `cx` / `cy` | `number` | Centroid for label placement |

`SentimentCluster` kept as a type alias of `Cluster` for compatibility, or references updated.

---

## Store Changes (AppState)

### Fields to ADD

| Field | Type | Default | Description |
|---|---|---|---|
| `clusterMode` | `ClusterMode` | `'sentiment'` | Current grouping criterion (session-scoped) |

### Actions to ADD

| Action | Signature | Behavior |
|---|---|---|
| `setClusterMode` | `(mode: ClusterMode) => void` | Set the active clustering mode |

---

## Changed Function: calculateClustering

| Before | After |
|---|---|
| `(articles, activeKeywords, filterWeights, width, height)` | `(articles, activeKeywords, filterWeights, width, height, mode = 'sentiment', keywords = [])` |

Returns `{ points: MappedPoint[]; clusters: Cluster[] }` (unchanged shape; `clusters` now generic).

**Grouping by mode**:
- `sentiment`: key = `dot.sentiment`; order `['negative','neutral','positive']`; cluster `kind='sentiment'`, `sentiment` set, `label` = sentiment.
- `topic`: key = `dominantTopic(dot, activeIds, keywordOrder)`; order = `keywords` order then `'__other__'`; cluster `kind='topic'`, `label` = keyword label (or `'Other'`).

---

## Helper: dominantTopic (pure)

```
dominantTopic(article, activeIds: string[], keywordOrder: string[]): string
  → the active id with max relevanceMap[id]; ties by keywordOrder index;
    if none present → '__other__'
```

---

## Hook: useClustering

| Before | After |
|---|---|
| reads `articles, activeKeywords, filterWeights` | also reads `clusterMode`, `keywords`; passes both to `calculateClustering`; re-runs when they change |

Return unchanged: `{ points, clusters }`.

---

## Validation / Invariants

- Every dot belongs to exactly one cluster in either mode (FR-008)
- Topic mode: `sum(cluster.count) === points.length` including any `Other` cluster
- Dot color is a function of `sentiment` only — independent of `clusterMode` (FR-006)
- Empty input → `{ points: [], clusters: [] }`
- Single active topic in topic mode → one cluster at ~100% (edge case)
