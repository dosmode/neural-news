# Research: Category Cluster Layout

**Feature**: 007-category-cluster-layout | **Date**: 2026-05-31

---

## Decision 1: Cluster by Sentiment via D3 Per-Node Force Anchors

**Decision**: Replace the single-center force layout with a **clustered force layout**. Each sentiment category (negative / neutral / positive) gets its own anchor point laid out horizontally across the panel. Each dot is pulled by `forceX`/`forceY` toward *its own sentiment's anchor* (per-node target), plus `forceCollide` so dots pack without overlapping.

**Current problem**: `calculateClustering` sets every dot's target to `width/2, height/2` and only adds a small keyword-hash angular nudge. Sentiment has zero effect on position → blue and red intermix into one blob.

**New algorithm**:
```
1. Dedup + clone (unchanged)
2. Group articles by sentiment → counts
3. present = [negative, neutral, positive] filtered to count > 0   (fixed order)
4. N = present.length; for present[i]:
     anchorX[sentiment] = width * (i + 1) / (N + 1)
     anchorY[sentiment] = height * 0.5
5. d3.forceSimulation(dots)
     .force('x', forceX(d => anchorX[d.sentiment]).strength(0.30))
     .force('y', forceY(d => anchorY[d.sentiment]).strength(0.30))
     .force('collide', forceCollide(DOT_RADIUS + 2))
     run ~120 ticks
6. clamp x/y to panel bounds
7. compute per-cluster centroid + count + percent
```

**Rationale**:
- Per-node `forceX(d => anchorX[d.sentiment])` is the canonical D3 "clustered bubbles" technique — produces cleanly separated blobs
- `forceCollide` makes each cluster's radius grow with `√count`, so a bigger blob == more articles == proportion felt at a glance (FR-004)
- Horizontal arrangement (left→right) reads as a proportion bar of blobs — most intuitive for "which is bigger"
- Keyword still controls *which* articles are fetched; it no longer perturbs intra-panel position (removes the noise that caused intermixing)

**Alternatives considered**:
- **Treemap / packed bars**: rejected — abandons the organic dot-scatter aesthetic and the gradient field metaphor
- **Voronoi regions**: rejected — overkill; force anchors already separate cleanly
- **Keep keyword-angular offset as a secondary axis**: rejected for v1 — reintroduces intermixing; sentiment separation must dominate

---

## Decision 2: Return Shape — `{ points, clusters }`

**Decision**: Change `calculateClustering` to return `{ points: MappedPoint[]; clusters: SentimentCluster[] }` where `SentimentCluster = { sentiment, count, percent, cx, cy }`. `useClustering` returns both; `ArticleScatter` renders cluster proportion labels from `clusters`.

**Rationale**: The component needs centroid + count + percent to place "POSITIVE 68%" labels (FR-005). Computing this in the clustering pass (where positions are known) is cheaper and keeps the component presentational.

**Migration impact**: `tests/utils/clustering.test.ts` currently asserts on an array (`toHaveLength`). Tests must change to `result.points`. New assertions added for cluster grouping + percent. This is expected and included in tasks.

**Alternatives considered**:
- Return only `points` and recompute clusters in the component: rejected — duplicates the grouping logic and recomputes centroids the layout already produced.

---

## Decision 3: Proportion Label Placement

**Decision**: Render one label per cluster at the cluster centroid, offset upward above the blob: `POSITIVE` (category, in its sentiment color) + `68%` (share) + small count. Position = `(cx, cy)` with a vertical offset; clamped to stay on-panel.

**Rationale**: A label at each blob confirms the felt proportion (FR-005, SC-006). Color-coding the label to the sentiment reinforces the mapping.

---

## Decision 4: Gradient Field Needs No Change (auto-benefit)

**Decision**: The existing `ClassificationField` (feature 006) draws a per-dot radial gradient colored by sentiment. Once dots are co-located by sentiment, the field **automatically** forms clean separated color regions instead of a blended center. No change to `ClassificationField.tsx` is required — FR-011 is satisfied by the clustering change alone.

**Rationale**: The field reads from `points`; co-located same-color dots produce co-located same-color gradients. Verifying this (not editing it) is the task.

---

## Decision 5: Edge Cases via Present-Only Anchors

**Decision**: Anchors are created only for sentiments with `count > 0`. So:
- One sentiment present → `N=1` → single centered cluster reading ~100% (FR-008)
- Zero of a sentiment → no anchor, no empty region (edge case)
- Narrow panel → anchors at `width*(i+1)/(N+1)` always fit; final clamp keeps dots in bounds (FR-009)

**Rationale**: Deriving anchors from present categories makes all the edge cases fall out naturally without special-casing.

---

## Decision 6: Tunables

**Decision**: Expose these as named constants for easy adjustment:
- `DOT_RADIUS` collide spacing (≈ dot visual radius + 2)
- anchor `strength` (0.30) — higher = tighter blobs, more inter-cluster gap
- `TICKS` (≈120) — enough for stable settle without lag

**Rationale**: Cluster tightness/separation is a visual-tuning concern; constants let it be adjusted without touching logic. Performance is fine: one settle pass over ≤100 nodes.
