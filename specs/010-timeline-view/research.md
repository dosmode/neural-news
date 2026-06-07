# Research: Timeline View (News Flow Over Time)

**Feature**: 010-timeline-view | **Date**: 2026-05-31

---

## Decision 1: Separate pure `calculateTimeline` (no D3 force)

**Decision**: Add `src/utils/timeline.ts` with a pure `calculateTimeline(articles, width, height)` that returns `{ points: MappedPoint[]; ticks: TimeTick[] }`. Unlike cluster layout (D3 force), the timeline uses a deterministic linear time→x scale + column stacking — no physics simulation needed.

**Rationale**: Time position is exact (a scale), not emergent (a force). A pure function is simpler, faster, and trivially unit-testable. Reusing the D3 force here would be wrong (it would smear exact times).

---

## Decision 2: Parse `seendate` → timestamp; exclude undated

**Decision**: Parse the existing `seendate` (format `YYYYMMDDTHHMMSSZ`) to a UTC millisecond timestamp via a regex. Articles that fail to parse are **excluded** from time positioning (FR-008).

```
parseSeendate('20260530T120000Z') → Date.UTC(2026,4,30,12,0,0)
malformed/empty → null → excluded
```

**Rationale**: `seendate` already exists on every article (from the RSS proxy). Excluding the rare undated item keeps the axis correct without a special lane (simpler than an "undated" zone; the count is shown so nothing is silently miscounted).

**Alternatives considered**: a dedicated "undated" lane — rejected as extra UI for a rare case; exclusion is cleaner and documented.

---

## Decision 3: Horizontal time scale, vertical column-stacking for density

**Decision**: x = linear scale from min→max publication time across the panel width (with side padding). For dots near the same x, **stack them vertically** within a fixed-width column (alternating up/down around the vertical center). Busy times → tall stacks (visibly denser); quiet times → short/empty.

```
x(t) = PAD + (t-min)/(max-min) * (width - 2*PAD)
column = round(x / COL_W);  stack index within column → vertical offset (±22px steps)
```

**Rationale**:
- A tall stack at a time window is an immediately legible "burst" (FR-004) — reads like a dot histogram.
- 22px vertical steps keep dots individually distinguishable in the densest column (FR-005).
- Deterministic and cheap; no overlap-resolution simulation.

**Alternatives considered**:
- Beeswarm (force-based de-overlap): rejected — heavier and less legible as "density"; column stacks read as bars/bursts.
- Single-row jitter: rejected — random jitter hides the burst signal.

---

## Decision 4: Adaptive time-axis ticks

**Decision**: Render ~5 evenly spaced ticks across the range. Label format adapts to the span: if the range spans more than ~24h, label as `M/D`; otherwise `HH:MM`. Same-time edge: if all articles share one time, pad the range ±1h so the axis still renders.

**Rationale**: Readable markers (FR-003) that scale to minutes or days (FR-009) without manual configuration.

---

## Decision 5: `viewMode` in store, independent of cluster-mode

**Decision**: Add `viewMode: 'cluster' | 'timeline'` (default `'cluster'`) + `setViewMode` to the store (in-memory = session-scoped). It is **independent** of the existing `clusterMode` (Sentiment/Topic). The Sentiment/Topic toggle only shows/applies in Cluster view.

**Rationale**: Two orthogonal choices — *how to arrange* (cluster vs timeline) and, within cluster, *by what* (sentiment vs topic). Keeping them separate is clearest (spec assumption). In-memory satisfies "session" persistence (FR-011), consistent with the field/cluster-mode toggles.

---

## Decision 6: ArticleScatter switches the active layout; field hidden in timeline

**Decision**: `ArticleScatter` computes both `useClustering` (cluster points/clusters) and `useTimeline` (timeline points/ticks), and renders `viewMode === 'timeline' ? timeline : cluster`. In timeline view: render the time axis + ticks, hide the cluster proportion labels, and hide the classification field (pass `visible={showClassificationField && viewMode==='cluster'}`). Dot rendering, hover, and click are shared (operate on `point`), so interactions and sentiment color are identical in both views (FR-006/FR-007, SC-004).

**Rationale**: One dot renderer, two position sources. The classification gradient is a cluster-space concept (spec assumption) and would be meaningless over a time axis, so it hides in timeline.

**Performance note**: both layouts compute on each change; for ≤100 dots this is negligible. (Optional later: gate `useClustering` when in timeline mode.)

---

## Decision 7: View toggle UI

**Decision**: A segmented `[ CLUSTER | TIMELINE ]` control in the output top-bar controls row (next to the existing Sentiment/Topic and Field toggles). The Sentiment/Topic segmented control renders only when `viewMode === 'cluster'`.

**Rationale**: Groups all view controls in one row; conditionally hiding the cluster-mode control avoids an inapplicable toggle in timeline view.
