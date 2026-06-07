---
description: "Tasks for Category Cluster Layout (Proportion-at-a-Glance)"
---

# Tasks: Category Cluster Layout

**Input**: Design documents from `specs/007-category-cluster-layout/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: `tests/utils/clustering.test.ts` is updated for the new return shape and extended with cluster assertions (constitution Principle V).

**Organization**: Tasks grouped by user story. US1 (cluster separation) + US2 (proportion labels) are the P1 MVP; US3 (filter re-form) is mostly inherent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** D3 force, Vitest, and the sentiment palette already exist. No new dependencies.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The clustering engine produces both the clustered points AND the cluster metadata that every user story consumes. This is the single blocking change.

⚠️ **CRITICAL**: All user stories depend on this.

- [x] T001 Rewrite the layout in `src/utils/clustering.ts`: export `interface SentimentCluster { sentiment: 'positive'|'negative'|'neutral'; count: number; percent: number; cx: number; cy: number }`; add constants `CLUSTER_ORDER = ['negative','neutral','positive']`, `ANCHOR_STRENGTH = 0.30`, `COLLIDE_RADIUS = 14`, `SETTLE_TICKS = 120`; after the existing dedup + shallow-clone, REMOVE the keyword-hash angular offset block; compute `present = CLUSTER_ORDER.filter(s => clones.some(d => d.sentiment === s))`, `N = present.length`, per-sentiment `anchorX[s] = width*(i+1)/(N+1)` and `anchorY[s] = height*0.5`; init each clone `d.x = anchorX[d.sentiment]; d.y = anchorY[d.sentiment]`; run `d3.forceSimulation(clones).force('x', d3.forceX(d => anchorX[d.sentiment]).strength(ANCHOR_STRENGTH)).force('y', d3.forceY(d => anchorY[d.sentiment]).strength(ANCHOR_STRENGTH)).force('collide', d3.forceCollide(COLLIDE_RADIUS)).stop()` for `SETTLE_TICKS` ticks; clamp x/y to `[10,width-10]×[10,height-10]`; build `clusters`: for each present sentiment compute `count`, `percent = Math.round(count/total*100)`, centroid `cx/cy = mean of member x/y`; change the return to `{ points: MappedPoint[]; clusters: SentimentCluster[] }`; empty input returns `{ points: [], clusters: [] }`

**Checkpoint**: `calculateClustering` returns `{ points, clusters }`; dots grouped by sentiment; types compile.

---

## Phase 3: US1 — Dots Grouped into Distinct Category Clusters (Priority: P1) 🎯 MVP

**Goal**: Positive/negative/neutral dots occupy separate, non-overlapping zones; no intermixed central blob.

**Independent Test**: Load a mix of positive + negative articles. Confirm positive dots gather in one area and negative in a clearly different area with a gap between; no red dot inside the blue cluster.

### Implementation for US1

- [x] T002 [US1] Update `src/hooks/useClustering.ts` to hold `clusters` in state alongside `points`: change the `useState` to also track `SentimentCluster[]`; in the effect, set both from `calculateClustering(...)` (it now returns an object); when `articles.length === 0`, set both to `[]`; return `{ points, clusters }`
- [x] T003 [US1] Update `src/components/output/ArticleScatter.tsx` to destructure `const { points, clusters } = useClustering(...)` (was `{ points }`); verify dots still render from `points` and `ClassificationField` still receives `points` unchanged — no other change in this task (labels come in T004)

**Checkpoint**: Blue and red dots are visibly separated into distinct horizontal zones; dots remain clickable; gradient field shows cleaner separated colors.

---

## Phase 4: US2 — Proportion Felt at a Glance (Priority: P1)

**Goal**: Cluster blob sizes scale with counts AND each cluster shows its share (`68%`), so the majority sentiment is obvious instantly.

**Independent Test**: Load ~70% positive / ~30% negative. Without reading numbers the blue blob visibly dominates; the `%` labels read ~70 / ~30.

### Implementation for US2

- [x] T004 [US2] Add cluster proportion labels to `src/components/output/ArticleScatter.tsx`: after the dots layer, map over `clusters` and render one label per cluster positioned `absolute z-20 pointer-events-none -translate-x-1/2 text-center` at `style={{ left: c.cx, top: Math.max(8, c.cy - 70) }}`; color by sentiment (`positive` → `text-neon-blue`, `negative` → `text-neon-red`, `neutral` → `text-white/50`); content: category name `text-[10px] font-mono uppercase tracking-widest`, then `{c.percent}%` in `text-2xl font-bold leading-none`, then `{c.count} articles` in `text-[9px] font-mono text-white/30`

**Checkpoint**: Each cluster shows CATEGORY + big % + count; dominant sentiment's blob is visibly largest; labels match the actual distribution.

---

## Phase 5: US3 — Clusters React to Filter Changes (Priority: P2)

**Goal**: Toggling a keyword re-forms the clusters to the new distribution with smooth dot motion.

**Independent Test**: Note cluster sizes. Toggle a keyword that changes the mix. Clusters re-form with sizes matching the new distribution; dots animate smoothly to new positions.

### Implementation for US3

- [x] T005 [US3] Verify reactivity in `src/hooks/useClustering.ts` and `src/components/output/ArticleScatter.tsx`: confirm the `useClustering` effect dependency array includes `articles`, `activeKeywords`, `filterWeights`, `width`, `height` so clusters recompute on keyword toggle; confirm the dot `<motion.div>` spring animation in `ArticleScatter` carries dots smoothly to new cluster positions (existing framer-motion `animate={{ x, y }}` handles this); no code change expected unless a dependency is missing — this is verification

**Checkpoint**: Keyword toggle → clusters re-form with correct new proportions; dots glide (not jump); labels update.

---

## Phase 6: Tests & Verification

- [x] T006 [P] Update `tests/utils/clustering.test.ts` for the new return shape: change the 5 existing tests to read `result.points` (one point per article; no input mutation; dedup by url; empty input → `result.points` empty; bounds); ADD: empty input → `result.clusters` is also empty; ADD: bipartite input (e.g., 7 articles sentiment `positive` + 3 `negative`) → every positive point's `x` is on the opposite side of `width/2` from every negative point's `x` (clusters separated); ADD: `result.clusters` counts sum to `result.points.length` and percents sum within `[99,101]`; ADD: single-sentiment input (all `positive`) → exactly one cluster with `percent === 100`
- [x] T007 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (clustering + sentimentField suites pass); fix any type errors from the return-shape change
- [x] T008 Manual verification against spec: (a) blue/red dots separated into distinct zones with a gap; (b) bigger group = bigger blob; (c) `%` labels match distribution; (d) zero/single-sentiment edge cases render correctly; (e) keyword toggle re-forms smoothly; (f) gradient field now shows clean separated color regions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (T001)**: The engine change. BLOCKS everything.
- **US1 (Phase 3)**: T002 after T001 (hook consumes new shape); T003 after T002 (component consumes hook).
- **US2 (Phase 4)**: T004 after T003 (labels need `clusters` wired into the component).
- **US3 (Phase 5)**: T005 after US1 (verifies the wired flow).
- **Tests/Verify (Phase 6)**: T006 after T001 (shape change); T007 after all code; T008 last.

### User Story Dependencies

- **US1 (P1)**: Needs T001. → first half of MVP
- **US2 (P1)**: Needs US1 (component must already destructure `clusters`). → second half of MVP
- **US3 (P2)**: Needs US1. Mostly verification (reactivity is inherent).

### Critical Path

```
T001 → T002 → T003 → T004 → T005 → (T006 ∥ T007) → T008
```
T006 can be written in parallel with T007 once T001 lands (different concern), but T007's run reflects T006's edits — run T007 after T006 for a clean pass.

---

## Parallel Execution Examples

Most tasks are sequential (they touch `clustering.ts` → hook → component in a chain). Parallelizable:

```
After T001 lands:
  Task A (T006): rewrite clustering.test.ts for new shape
  Task B (T002→T003→T004): wire hook + component + labels
Then T007 (tsc + test) once both land.
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. T001 (engine) → T002 (hook) → T003 (component wire) → T004 (labels)
2. **STOP and VALIDATE**: separated clusters + % labels = the user's request fully delivered
3. Ship

### Incremental

1. Foundational (T001) → US1 (T002–T003) → see separated dots
2. US2 (T004) → see proportions + labels → **MVP done**
3. US3 (T005) verify re-form
4. Tests + manual (T006–T008) → done

---

## Notes

- T001 is the substantive change; the rest is wiring + a label block + tests
- Removing the keyword-hash angular offset is intentional — keyword still filters the article set upstream; it should no longer scatter dots within the panel (that caused the intermixing)
- `ClassificationField.tsx` is deliberately NOT edited — it auto-benefits from co-located same-sentiment dots (FR-011)
- Watch the return-shape change ripple: any code calling `calculateClustering` or `useClustering` must use `.points` — only the hook and (indirectly) the component do
