# Research: Cluster Mode Toggle (Sentiment ↔ Topic)

**Feature**: 009-cluster-mode-toggle | **Date**: 2026-05-31

---

## Decision 1: Generalize the grouping key in `calculateClustering`

**Decision**: Parameterize the existing sentiment-clustered force layout with a `mode: 'sentiment' | 'topic'`. The layout mechanism (per-group horizontal anchors + `forceCollide` + centroid/percent labels from feature 007) is unchanged; only the **group key** and **group order** differ by mode.

- **Sentiment mode** (unchanged behavior): groupKey = `dot.sentiment`; order = `['negative','neutral','positive']`.
- **Topic mode**: groupKey = the dot's **dominant active topic** (keyword id with the highest `relevanceMap` score among active keywords); order = the `keywords` array order, then `'__other__'` last.

**Rationale**: The 007 layout already produces separated, count-sized blobs with proportion labels — exactly what Topic mode needs. Reusing it means one code path, consistent UX, and minimal risk. Only a small grouping function changes.

**Alternatives considered**:
- A separate topic-layout function: rejected — duplicates the force/centroid/label logic.
- Category-level topic clusters (merge keywords sharing a category): rejected per spec assumption — "each keyword its own cluster" is more intuitive; category merging hid which specific keyword dominates.

---

## Decision 2: Dominant-topic assignment (one dot, one cluster)

**Decision**: For a dot in Topic mode, assign it to the **single active keyword id with the highest `relevanceMap[id]`**. Ties broken by keyword order. If the dot has no relevance to any active keyword, assign `'__other__'`.

```
dominantTopic(article, activeIds, keywordOrder):
  pick id in activeIds maximizing article.relevanceMap[id] (default -Infinity)
  ties → earlier in keywordOrder
  none positive/found → '__other__'
```

**Rationale**: `relevanceMap` (keys = keyword ids, set in feature 008's `calculateRelevanceMap`) already scores each article against each active keyword. Picking the argmax gives a clean single-topic assignment (FR-008) and never loses a dot (FR: "Other" catch-all).

---

## Decision 3: Dot color unchanged; topic labels neutral

**Decision**: Dot color always derives from `sentiment` in both modes (no change to dot rendering — FR-006). Cluster **labels** differ:
- Sentiment mode: label = sentiment name, colored by sentiment (as today).
- Topic mode: label = keyword label, colored neutral (white/70 with a cyan accent), since a topic cluster contains mixed sentiments.

**Rationale**: Preserves the "position = topic, color = sentiment" dual-encoding (US3). A single sentiment color on a mixed topic cluster label would be misleading, so topic labels are neutral.

---

## Decision 4: Generalized `Cluster` return type

**Decision**: Rename/extend `SentimentCluster` → `Cluster`:
```typescript
interface Cluster {
  key: string;                 // sentiment value OR topic id
  label: string;               // display text
  kind: 'sentiment' | 'topic';
  sentiment?: 'positive'|'negative'|'neutral'; // present in sentiment mode (label color)
  count: number;
  percent: number;
  cx: number; cy: number;
}
```
Keep a `SentimentCluster` type alias for any external reference, or update references. `calculateClustering` returns `{ points, clusters }` as before.

**Rationale**: One label renderer handles both modes via `kind`. Backward-compatible shape (`count`/`percent`/`cx`/`cy` retained).

---

## Decision 5: `clusterMode` in the store (session-scoped)

**Decision**: Add `clusterMode: ClusterMode` (default `'sentiment'`) + `setClusterMode(mode)` to the Zustand store (in-memory = session-scoped, mirroring `showClassificationField`). `useClustering` passes `clusterMode` and `keywords` into `calculateClustering` and re-runs when either changes.

**Rationale**: In-memory Zustand satisfies "persists for the session" (SC-006) without localStorage. Consistent with the existing field toggle. Default `'sentiment'` preserves today's first-paint behavior.

---

## Decision 6: Signature back-compat for tests

**Decision**: `calculateClustering(articles, activeKeywords, filterWeights, width, height, mode = 'sentiment', keywords = [])`. Trailing optional params keep the existing 8 clustering tests valid (they call the sentiment path), and new topic-mode tests pass `mode='topic'` + `keywords`.

**Rationale**: Minimizes test churn; sentiment remains the default path.

---

## Decision 7: UI — segmented mode control in the output area

**Decision**: A compact segmented toggle `[ SENTIMENT | TOPIC ]` in the output area top bar, near the existing "Field ON/OFF" and article count. Clicking a segment calls `setClusterMode`. The active segment is highlighted (neon-blue).

**Rationale**: A 2-option segmented control reads clearer than a single toggle for a named mode choice; lives with the other output controls (no new panel).
