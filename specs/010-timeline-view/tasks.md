---
description: "Tasks for Timeline View (News Flow Over Time)"
---

# Tasks: Timeline View (News Flow Over Time)

**Input**: Design documents from `specs/010-timeline-view/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Unit tests for `parseSeendate` + `calculateTimeline` (constitution Principle V). Existing suites must keep passing.

**Organization**: Tasks grouped by user story. US1 (toggle + time-axis) + US2 (bursts) are the P1 MVP; US3 (interactions/color in timeline) is mostly inherent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** No new dependencies; Vitest + path alias already configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure timeline engine + the `viewMode` store field that all stories consume.

⚠️ **CRITICAL**: All user stories depend on this phase.

- [x] T001 [P] Create `src/utils/timeline.ts`: export `interface TimeTick { x: number; label: string }`; module constants `AXIS_PAD = 60`, `COL_W = 24`, `STACK_STEP = 22`, `TICK_COUNT = 5`, `DAY_MS = 86_400_000`; `export function parseSeendate(s: string): number | null` parsing `YYYYMMDDTHHMMSSZ` via regex to `Date.UTC(...)` (null on no-match/NaN); `export function calculateTimeline(articles: Article[], width: number, height: number): { points: MappedPoint[]; ticks: TimeTick[] }` that: returns empty on no articles or zero dims; dedups by `url`; maps to `{a, t: parseSeendate(a.seendate)}` and drops null `t`; sorts ascending by `t`; computes `min`/`max` (pad ±3_600_000 if equal); `x(t) = AXIS_PAD + (t-min)/(max-min) * (width - 2*AXIS_PAD)`; stacks per column (`col = round(px/COL_W)`, alternating `dir` up/down by `STACK_STEP`) with `y` clamped to `[50, height-50]`; builds `TICK_COUNT` ticks labeled `M/D` when `span > DAY_MS` else `HH:MM`; returns `{ points, ticks }`
- [x] T002 [P] Add `ViewMode` to `src/types/index.ts`: `export type ViewMode = 'cluster' | 'timeline'`; add to `AppState`: `viewMode: ViewMode` and `setViewMode: (mode: ViewMode) => void`
- [x] T003 Add the view state to `src/store/useStore.ts`: import `ViewMode`; initial `viewMode: 'cluster'`; action `setViewMode: (viewMode) => set({ viewMode })`

**Checkpoint**: `npx tsc --noEmit` passes; `calculateTimeline` is callable; store exposes `viewMode` + setter.

---

## Phase 3: US1 — Switch to a Timeline of News (Priority: P1) 🎯 MVP

**Goal**: A toggle switches the output between Cluster and Timeline; in Timeline, articles sit on a time axis (older→newer) with readable tick labels; switching back restores the cluster scatter; view persists in session.

**Independent Test**: With articles loaded, switch to Timeline → dots arrange left→right by publication time with visible time ticks; switch back to Cluster → scatter returns; reselect persists.

### Tests for US1

- [x] T004 [P] [US1] Create `tests/utils/timeline.test.ts`: `parseSeendate('20260530T120000Z')` is a finite number, malformed/empty → `null`; `calculateTimeline([], W, H)` → `{points:[],ticks:[]}`; given 3 articles with increasing `seendate`, the returned `points` (already time-sorted) have strictly increasing `x`; an article with bad `seendate` is excluded from `points`; all points have `x` in `[0,width]` and `y` in `[0,height]`; `ticks` length === 5

### Implementation for US1

- [x] T005 [P] [US1] Create `src/hooks/useTimeline.ts`: `export function useTimeline(width, height)` that reads `articles` from the store and returns `useMemo(() => calculateTimeline(articles, width, height), [articles, width, height])`
- [x] T006 [US1] Wire view selection into `src/components/output/ArticleScatter.tsx`: read `viewMode`, `setViewMode`; compute `const isTimeline = viewMode === 'timeline'`; keep `const { points: clusterPoints, clusters } = useClustering(w,h)` and add `const { points: timelinePoints, ticks } = useTimeline(w,h)`; set `const points = isTimeline ? timelinePoints : clusterPoints` (use `points` for the dots/hover/count as today); add a segmented `[ CLUSTER | TIMELINE ]` control to the controls row (first item, before the Sentiment/Topic toggle), each button `onClick={() => setViewMode(m)}`, active = `bg-neon-blue/20 text-neon-blue`
- [x] T007 [US1] Add the time axis to `src/components/output/ArticleScatter.tsx`: when `isTimeline && dimensions.width > 0`, render a faint horizontal axis line near the bottom (`absolute left-0 right-0` at e.g. `bottom-10`) plus, for each `tick` in `ticks`, a faint vertical gridline and a label at `left: tick.x` (`z-20 pointer-events-none`, `text-[9px] font-mono text-white/30`); gridlines very subtle (`bg-white/5`)

**Checkpoint**: Toggle Cluster↔Timeline re-arranges dots (framer-motion springs animate x/y); time axis + ticks readable; view persists.

---

## Phase 4: US2 — See When News Clustered (Bursts) (Priority: P1)

**Goal**: Busy publication windows read as visibly denser (tall stacks); quiet windows are sparse.

**Independent Test**: Load articles with a clear time burst; in Timeline that window is visibly denser (a taller stack of dots) than the rest.

### Implementation for US2

- [x] T008 [US2] Verify the burst density in `tests/utils/timeline.test.ts` (extend): given e.g. 5 articles within one minute and 1 article an hour later, the 5 share (nearly) the same `x` and occupy distinct `y` (a tall stack), while the lone article sits at a different `x` with a single `y` — asserting the column-stacking produces a denser column for the burst (no code change to `timeline.ts` expected if T001 is correct; this is a verification + safety test)

**Checkpoint**: Burst windows form tall stacks; sparse windows stay short; dots remain individually placed.

---

## Phase 5: US3 — Read Details and Sentiment in Timeline (Priority: P2)

**Goal**: In Timeline, dots keep sentiment color and support hover preview + click-to-open detail; cluster-only UI (field, proportion labels) is hidden.

**Independent Test**: In Timeline, hover a dot → preview; click → detail; dot colors = sentiment; the classification field and cluster labels are not shown.

### Implementation for US3

- [x] T009 [US3] In `src/components/output/ArticleScatter.tsx`, scope the cluster-only UI to cluster view: pass `visible={showClassificationField && !isTimeline}` to `<ClassificationField>`; wrap the cluster proportion-label map in `{!isTimeline && clusters.map(...)}`; render the Sentiment/Topic segmented control only when `!isTimeline`; confirm the dot renderer, `HoverCard`, and `setSelectedArticle` onClick are shared/unchanged so hover + click + sentiment color work in both views

**Checkpoint**: Timeline shows colored, interactive dots on the axis; no field/cluster-labels/cluster-mode toggle in timeline; cluster view unchanged.

---

## Phase 6: Polish & Verification

- [x] T010 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (clustering + sentimentField + keywordUtils + trendingService + timeline all pass); fix any type errors
- [x] T011 Manual verification: (a) Cluster↔Timeline toggle re-arranges smoothly <2s; (b) busy time = tall stack, sparse = empty; (c) ticks readable + scale to the range; (d) hover/click work + colors unchanged in timeline; (e) field + cluster labels + Sentiment/Topic toggle hidden in timeline; (f) view persists across interactions; (g) undated/all-same-time/resize edge cases don't break the axis

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: T001 (engine) + T002 (types) in parallel → T003 (store, needs T002). BLOCKS all stories.
- **US1 (Phase 3)**: T004 after T001; T005 after T001; T006 after T003+T005; T007 after T006.
- **US2 (Phase 4)**: T008 after T001 (test of the engine).
- **US3 (Phase 5)**: T009 after T006 (component already wired to `isTimeline`).
- **Polish (Phase 6)**: after all.

### User Story Dependencies

- **US1 (P1)**: Foundational. → MVP core (toggle + axis)
- **US2 (P1)**: Foundational (engine already stacks). → verified by T008
- **US3 (P2)**: US1 (component wired). Cluster-UI scoping + interaction reuse.

### Critical Path

```
T001 + T002 → T003 → T005 → T006 → T007 → T009 → T010 → T011
(T004 ∥ after T001;  T008 ∥ after T001)
```

---

## Parallel Execution Examples

```
After foundational types exist:
  Task A (T001): timeline.ts engine
  Task B (T002): ViewMode types
  → T003 store → T005 hook → T006 toggle → T007 axis → T009 scope cluster UI
  Tests T004 + T008 in parallel once T001 lands
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Foundational T001+T002 → T003
2. US1: T005 (hook) → T006 (toggle + layout pick) → T007 (axis)
3. US2: T008 (burst verification)
4. **STOP and VALIDATE**: timeline arranges by time, bursts visible
5. Ship

### Then US3 + Polish

6. T009 (scope cluster-only UI + verify interactions) → T010 (tsc+test) → T011 (manual)

---

## Notes

- T001 (`timeline.ts`) is the substantive, unit-tested core; the rest is store wiring + a toggle + an axis + scoping
- No D3 for the timeline — it's a pure linear scale + column stacking (fast, deterministic)
- Both layouts (`useClustering` + `useTimeline`) compute each change; fine for ≤100 dots (optional later: gate cluster compute when in timeline)
- Dot color/hover/click are shared — never branch them on `viewMode` (keeps SC-004 color-invariance + FR-007 interactions)
- Classification field + proportion labels + Sentiment/Topic toggle are cluster-view concepts — scope them behind `!isTimeline`
