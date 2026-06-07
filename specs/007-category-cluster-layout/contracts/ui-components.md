# Contracts: Category Cluster Layout

**Feature**: 007-category-cluster-layout | **Date**: 2026-05-31

---

## calculateClustering (modified)

**File**: `src/utils/clustering.ts`

**Signature**:
```typescript
export interface SentimentCluster {
  sentiment: 'positive' | 'negative' | 'neutral';
  count: number;
  percent: number;   // 0..100
  cx: number; cy: number;
}

export function calculateClustering(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  width: number,
  height: number,
): { points: MappedPoint[]; clusters: SentimentCluster[] };
```

**Behavior contract**:
- Dedup by url + shallow-clone (unchanged) — never mutates store articles
- Groups dots by `sentiment`; lays out present categories left→right via per-node force anchors
- Returns one `MappedPoint` per unique article, positioned inside its sentiment cluster
- Returns one `SentimentCluster` per present sentiment with count, percent (over total), and centroid
- Empty input → `{ points: [], clusters: [] }`
- Positions clamped to `[0,width] × [0,height]`
- No cross-category dots: a dot's position is always inside its sentiment's cluster region

---

## useClustering (modified)

**File**: `src/hooks/useClustering.ts`

**Return**: `{ points: MappedPoint[]; clusters: SentimentCluster[] }`

**Behavior**: Recomputes both when `articles`, `activeKeywords`, `filterWeights`, `width`, or `height` change. `clusters` is `[]` when there are no points.

---

## ArticleScatter (modified)

**File**: `src/components/output/ArticleScatter.tsx`

**Changes**:
- Destructure `{ points, clusters }` from `useClustering`
- Render a **proportion label** per cluster at `(cluster.cx, cluster.cy)`, offset above the blob:
  - category name in the sentiment color (`POSITIVE`/`NEGATIVE`/`NEUTRAL`)
  - share `{cluster.percent}%`
  - small dim count `({cluster.count})`
  - `z-20`, `pointer-events-none`, clamped on-panel
- Dots, hover cards, detail panel, classification field, count badge, field toggle: unchanged
- Pass `points` to `ClassificationField` exactly as before (it auto-benefits from co-location)

**Label contract**:
- One label per present cluster
- Positioned near the cluster centroid, not overlapping the dots' clickable area (use upward offset + pointer-events none)
- Color matches sentiment palette (positive = neon-blue, negative = neon-red, neutral = white/40)

---

## clustering.test.ts (modified)

**File**: `tests/utils/clustering.test.ts`

**Updated assertions** (return shape changed to `{ points, clusters }`):
- one point per article → `result.points.length`
- no input mutation (unchanged intent)
- dedup by url → `result.points.length`
- empty input → `result.points` empty AND `result.clusters` empty
- bounds on `result.points`
- **new**: dots are grouped by sentiment — all positive points share a similar X-region distinct from negative points' X-region (given a clearly bipartite input)
- **new**: `result.clusters` percents sum to ~100 and counts sum to `points.length`
- **new**: single-sentiment input → exactly one cluster at ~100%
