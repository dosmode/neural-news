# Contracts: Cluster Mode Toggle

**Feature**: 009-cluster-mode-toggle | **Date**: 2026-05-31

---

## calculateClustering (modified)

**File**: `src/utils/clustering.ts`

```typescript
export type ClusterMode = 'sentiment' | 'topic';

export interface Cluster {
  key: string;
  label: string;
  kind: 'sentiment' | 'topic';
  sentiment?: 'positive' | 'negative' | 'neutral';
  count: number;
  percent: number;
  cx: number; cy: number;
}
export type SentimentCluster = Cluster; // back-compat alias

export function calculateClustering(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  width: number,
  height: number,
  mode?: ClusterMode,             // default 'sentiment'
  keywords?: { id: string; label: string }[],  // for topic labels; default []
): { points: MappedPoint[]; clusters: Cluster[] };

export function dominantTopic(
  article: Article,
  activeIds: string[],
  keywordOrder: string[],
): string;  // returns a keyword id or '__other__'
```

**Behavior**:
- Dedup + clone unchanged; never mutates store articles
- Builds present groups by mode, lays them out left→right with per-group force anchors + collide (same as 007)
- Sentiment mode is byte-for-byte the prior behavior (default params)
- Topic mode groups by `dominantTopic`; `'__other__'` group labeled `'Other'`, ordered last
- Returns one `Cluster` per present group with `kind`, optional `sentiment`, count, percent, centroid

---

## Store (modified)

**File**: `src/store/useStore.ts` + `src/types/index.ts`

- Add `clusterMode: ClusterMode` (init `'sentiment'`) to `AppState`
- Add `setClusterMode: (mode: ClusterMode) => void`
- `ClusterMode` exported from types (or re-exported from clustering)

---

## useClustering (modified)

**File**: `src/hooks/useClustering.ts`

- Read `clusterMode` and `keywords` from the store
- Pass them to `calculateClustering(articles, activeKeywords, filterWeights, w, h, clusterMode, keywords)`
- Add `clusterMode`, `keywords` to the effect deps so clusters re-form on mode/keyword change
- Return `{ points, clusters }` unchanged

---

## ArticleScatter (modified)

**File**: `src/components/output/ArticleScatter.tsx`

1. **Mode control**: a segmented toggle in the top bar (near "Field ON/OFF" + count):
```
[ SENTIMENT | TOPIC ]
```
- reads `clusterMode`, `setClusterMode` from store
- active segment highlighted (neon-blue border/text); inactive dim
- `z-20`, does not overlap the count/label/field-toggle

2. **Generic cluster labels**: the existing proportion-label map over `clusters` now styles by `c.kind`:
- `kind==='sentiment'`: color by `c.sentiment` (blue/red/white) — as today
- `kind==='topic'`: neutral accent (e.g., `text-white/80`, small cyan dot); label = `c.label` (topic name)
- both show `{c.percent}%` and `{c.count} articles`

3. **Dots, hover, detail, classification field**: unchanged (dot color still from `point.sentiment`)

---

## clustering.test.ts (extended)

**File**: `tests/utils/clustering.test.ts`

- Existing 8 sentiment tests pass unchanged (default `mode='sentiment'`)
- ADD: `dominantTopic` picks the highest-relevance active id; ties by order; `'__other__'` when none
- ADD: topic-mode clustering groups dots by dominant topic (a dot with `relevanceMap{nvda:0.9, ai:0.2}` lands in the `nvda` cluster); cluster `kind==='topic'`, labels from `keywords`
- ADD: topic-mode counts sum to points length (including Other); single-topic set → one 100% cluster
- ADD: dot `sentiment` (hence color) is identical regardless of `mode` (positions differ, sentiment unchanged)
