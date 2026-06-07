# Implementation Plan: Category Cluster Layout (Proportion-at-a-Glance)

**Branch**: `007-category-cluster-layout` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-category-cluster-layout/spec.md`

---

## Summary

Replace the single-center dot layout with a **sentiment-clustered force layout**. Each sentiment (negative / neutral / positive) gets its own horizontal anchor; dots are pulled to their category's anchor and packed with collision, so each cluster's blob size scales with its article count. The result: blue and red dots separate into distinct zones, and the relative cluster sizes make the proportion felt instantly. Proportion labels per cluster confirm the share. The existing gradient field auto-benefits (clean separated color regions). Core change is `calculateClustering`; `useClustering` and `ArticleScatter` adapt to the new `{ points, clusters }` shape.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Zustand 5, Framer Motion 12, D3 7 (forceSimulation already used)

**Storage**: Client-side Zustand (in-memory); no store changes

**Testing**: Vitest 4 — `clustering.test.ts` updated for new return shape + new cluster assertions

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: Cluster settle + render at 60fps; ≤100 dots; one settle pass per data change (SC-005: re-form < 2s)

**Constraints**: Reuse sentiment palette; reuse gradient field, hover, detail panel unchanged; no new dependency

**Scale/Scope**: ≤100 dots; up to 3 clusters

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first, consistent with prior features; clusters reflow to fit |
| II. High Performance | ✅ Pass | One D3 settle pass over ≤100 nodes per change; no per-frame cost |
| III. Data Privacy & Security | ✅ Pass | No data collection; pure re-layout of existing dots |
| IV. Component-Based Architecture | ✅ Pass | Logic stays in `clustering.ts`; component stays presentational |
| V. Continuous Automated Testing | ✅ Pass | `clustering.test.ts` updated + extended with cluster assertions |
| Technology Stack | ✅ Pass | No new dependency; D3 force already present |

---

## Project Structure

### Documentation (this feature)

```text
specs/007-category-cluster-layout/
├── plan.md              ← This file
├── research.md          ← 6 technical decisions
├── data-model.md        ← SentimentCluster + return shape
├── contracts/
│   └── ui-components.md ← function + component contracts
└── tasks.md             ← /speckit-tasks output
```

### Source Code Changes

```text
UPDATE:
  src/utils/clustering.ts            ← sentiment-clustered force layout; return { points, clusters }
  src/hooks/useClustering.ts         ← return { points, clusters }
  src/components/output/ArticleScatter.tsx  ← destructure clusters; render proportion labels
  tests/utils/clustering.test.ts     ← adapt to new shape + add cluster tests

UNCHANGED (auto-benefit / no edit):
  src/components/output/ClassificationField.tsx  (reads points; co-location fixes the field)
  src/store/useStore.ts, src/types/index.ts (MappedPoint element shape unchanged)
  src/components/output/ArticleStrip.tsx, neural/*, app/*
```

---

## Implementation Phases

### Phase A: Clustering Engine (core, P1+P2)

**File**: `src/utils/clustering.ts`

1. Export `interface SentimentCluster { sentiment; count; percent; cx; cy }`
2. Add constants: `CLUSTER_ORDER = ['negative','neutral','positive']`, `ANCHOR_STRENGTH = 0.30`, `COLLIDE_RADIUS = 14`, `SETTLE_TICKS = 120`
3. Rewrite `calculateClustering` body after dedup+clone:
```typescript
// group present sentiments
const present = CLUSTER_ORDER.filter(s => dataToSimulate.some(d => d.sentiment === s));
const N = present.length;
const anchorX: Record<string, number> = {};
const anchorY: Record<string, number> = {};
present.forEach((s, i) => {
  anchorX[s] = width * (i + 1) / (N + 1);
  anchorY[s] = height * 0.5;
});

d3.forceSimulation(dataToSimulate)
  .force('x', d3.forceX((d: any) => anchorX[d.sentiment]).strength(ANCHOR_STRENGTH))
  .force('y', d3.forceY((d: any) => anchorY[d.sentiment]).strength(ANCHOR_STRENGTH))
  .force('collide', d3.forceCollide(COLLIDE_RADIUS))
  .stop();
// init each dot near its anchor (avoids long settle from center)
dataToSimulate.forEach(d => { d.x = anchorX[d.sentiment]; d.y = anchorY[d.sentiment]; });
for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();
```
4. Clamp points (unchanged).
5. Build clusters: for each present sentiment, `count`, `percent = round(count/total*100)`, centroid `cx/cy = mean(member x/y)`.
6. Return `{ points, clusters }`.

**Note**: remove the old keyword-hash angular offset block (it caused intermixing). Keyword still filters the article set above.

---

### Phase B: Hook (P1)

**File**: `src/hooks/useClustering.ts`

- Hold `clusters` in state alongside `points`
- In the effect, set both from `calculateClustering(...)`; when `articles.length === 0`, set both to empty
- Return `{ points, clusters }`

---

### Phase C: Component — Proportion Labels (P1+P2)

**File**: `src/components/output/ArticleScatter.tsx`

- `const { points, clusters } = useClustering(...)`
- After the dots layer, render labels:
```tsx
{clusters.map(c => {
  const color = c.sentiment === 'positive' ? 'text-neon-blue'
    : c.sentiment === 'negative' ? 'text-neon-red' : 'text-white/50';
  const top = Math.max(8, c.cy - 70);   // above the blob, clamped
  return (
    <div key={c.sentiment}
      className={`absolute z-20 pointer-events-none -translate-x-1/2 text-center ${color}`}
      style={{ left: c.cx, top }}>
      <div className="text-[10px] font-mono uppercase tracking-widest">{c.sentiment}</div>
      <div className="text-2xl font-bold leading-none">{c.percent}%</div>
      <div className="text-[9px] font-mono text-white/30">{c.count} articles</div>
    </div>
  );
})}
```
- Everything else (dots, hover, field, count badge, toggle) unchanged
- `ClassificationField` still receives `points` — no change

---

### Phase D: Tests

**File**: `tests/utils/clustering.test.ts`

- Update existing 5 to use `result.points`
- Empty input → `result.points` and `result.clusters` both empty
- New: bipartite input (e.g., 7 positive + 3 negative) → all positive points have X on one side of center, all negative on the other (clusters separated)
- New: `clusters` counts sum to `points.length`; percents sum ≈ 100
- New: single-sentiment input → exactly one cluster, `percent === 100`

---

### Phase E: Verify

- `npx tsc --noEmit` clean
- `npm test` all pass
- Manual: blue and red dots clearly separated into zones; bigger group = bigger blob; `%` labels correct; toggle keyword → clusters re-form smoothly; gradient field shows clean separated colors

---

## Post-Design Constitution Re-check

All pass. No new dependency; logic centralized in `clustering.ts` (tested); component stays presentational; the gradient field improvement comes for free from co-location.
