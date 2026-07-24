# Tasks: Graph Overview, Natural UX & Clicked-Node Article Sync

**Input**: Design documents from `specs/015-graph-overview-news-sync/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contract.md ✅ quickstart.md ✅

**Tests**: Unit tests updated for the pure graph-tree logic (`buildOverview`, `selectedAt`). Interactions validated manually.

**Organization**: Tasks grouped by user story. This is a refinement of feature 014 — 4 existing files modified, no new files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup

**Purpose**: Confirm baseline before editing.

- [x] T001 Confirm current graph builds clean — run `npx tsc --noEmit` and `npm test` to establish a green baseline before changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data-layer and simulation changes that the user stories build on.

**⚠️ CRITICAL**: US1/US2/US3 all depend on these.

- [x] T002 Add optional `selectedAt?: number` field to the `GraphNode` interface in `src/utils/graphTree.ts` (monotonic recency counter; higher = more recently clicked)
- [x] T003 Add `buildOverview(roots: KeywordDef[], width: number, height: number)` to `src/utils/graphTree.ts` — returns `{ nodes: GraphNode[]; links: GraphLink[] }` for roots + their depth-1 children; root positions seeded radially around center, children seeded near their parent with a small outward offset; roots get higher `selectedAt` than children; respect `MAX_LIVE_NODES` (skip extra children if cap would be exceeded, roots always included)
- [x] T004 [P] Update `tests/utils/graphTree.test.ts` — add cases for `buildOverview`: returns roots + depth-1 children only (no grandchildren), links wire each parent→child, leaf roots contribute no children, total nodes ≤ MAX_LIVE_NODES, roots have higher `selectedAt` than children
- [x] T005 [P] Tune `src/hooks/useForceSimulation.ts` for smoother settling — add `forceX(width/2).strength(0.04)` and `forceY(height/2).strength(0.04)`, set `simulation.velocityDecay(0.45)`, and give `forceCollide` a strength (~0.85); keep the hook's public signature unchanged

**Checkpoint**: `npm test` green for graphTree; `npx tsc --noEmit` clean.

---

## Phase 3: User Story 1 — Clicked Related Nodes Drive Article Results (Priority: P1) 🐞 MVP

**Goal**: Clicking any node (incl. leaf nodes) makes its keyword lead the article results; depth no longer drops clicked nodes.

**Independent Test**: Click a child node (e.g. "OpenAI" under "AI"). Within ~2s the right-side article area shows OpenAI-related articles. Click a deeper node — still reflected. Collapse/remove a node — its keyword leaves the results.

### Implementation for User Story 1

- [x] T006 [US1] Fix `syncToStore` in `src/components/neural/ForceGraphPanel.tsx` — replace `.sort((a, b) => a.depth - b.depth)` with `.sort((a, b) => (b.selectedAt ?? 0) - (a.selectedAt ?? 0))` (recency, not depth) before the `NEWS_ACTIVE_CAP` slice
- [x] T007 [US1] Add a `selectionCounter` ref in `ForceGraphPanel.tsx` and bump it on every node click: set `node.selectedAt = ++selectionCounter.current` so the clicked node becomes most-recent (mutate in place — do not spread)
- [x] T008 [US1] Update the click handler in `ForceGraphPanel.tsx` so leaf nodes (no children) also select-for-news: remove the early `return` for `!hasChildren` from the select path — leaf click still sets `selectedAt` and calls `syncToStore`; nodes with children additionally expand/collapse as before
- [x] T009 [US1] Ensure collapse/remove paths re-run `syncToStore(newNodes)` so deselected keywords drop out of the news query and the article results update (FR-004)

**Checkpoint**: `npm run dev` → click child/deep/leaf nodes, confirm their articles appear; collapse drops them.

---

## Phase 4: User Story 2 — Graph Shows Full Overview by Default (Priority: P2)

**Goal**: On first load the graph shows roots + their first-level related nodes already expanded, evenly spread, with a single news fetch.

**Independent Test**: Refresh the page — roots and their depth-1 children are already visible, spread out (no pile-up), and the news loads once.

### Implementation for User Story 2

- [x] T010 [US2] Replace the root-only init effect in `src/components/neural/ForceGraphPanel.tsx` with a batched overview: call `buildOverview(activeRootDefs, dims.width, dims.height)`, `setLiveNodes`/`setLiveLinks` in one update, mark the expanded roots' `expanded = true`, call `syncToStore` ONCE, then `reheat()` (guard with the existing `initializedRef`)
- [x] T011 [US2] Verify expand/collapse still works on initially-expanded roots in `ForceGraphPanel.tsx` — clicking an already-expanded root collapses its children, clicking again re-expands (no stuck state from the batch init)

**Checkpoint**: Refresh → overview visible, evenly spread, one fetch; roots still toggle.

---

## Phase 5: User Story 3 — Natural, Polished Interactions (Priority: P3)

**Goal**: Smooth expand/collapse/drag/hover with no jumps, overlap, or flicker.

**Independent Test**: Expand/collapse/drag/hover all feel fluid; nodes settle without oscillation or overlap.

### Implementation for User Story 3

- [x] T012 [US3] Verify radial seeding from `buildOverview` (T003) plus the centering/friction tuning (T005) produce an even, non-overlapping layout in `ForceGraphPanel.tsx`; adjust `LINK_DISTANCE`/charge constants in `src/hooks/useForceSimulation.ts` if nodes still cluster or overlap at the 360px panel width
- [x] T013 [US3] Ensure hover highlight transitions are smooth and flicker-free — confirm `GraphNodeView.tsx` node opacity changes animate via Framer Motion `animate` (not abrupt) and `GraphLinkView.tsx` keeps its `transition-[stroke-opacity]`; fix any node opacity snap

**Checkpoint**: Interactions feel natural; no jumpy motion, overlap, or hover flicker.

---

## Phase 6: Selected Indicator & Validation

**Purpose**: Visual feedback for news-active nodes (FR-012) and full validation.

- [x] T014 [US1] Derive `activeNewsIds` (top-`NEWS_ACTIVE_CAP` live nodes by `selectedAt`) in `src/components/neural/ForceGraphPanel.tsx` and pass `isSelected={activeNewsIds.has(n.id)}` to each `GraphNodeView`
- [x] T015 [US1] Add an `isSelected: boolean` prop to `GraphNodeView` in `src/components/neural/GraphNodeView.tsx` and render a distinct accent ring (e.g. brighter neon outline) when true, so the user sees which nodes drive the article results
- [x] T016 [P] Run `npx tsc --noEmit` and fix any TypeScript errors across the 4 modified files
- [x] T017 [P] Run `npm test` — confirm updated graphTree tests + existing suite pass
- [x] T018 Run `npm run dev` and manually validate all 12 functional requirements from `specs/015-graph-overview-news-sync/plan.md` acceptance checklist (overview on load, click→articles incl. deep/leaf nodes, recency priority, collapse drops keyword, smooth UX, selected ring)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — the P1 bug fix (MVP)
- **Phase 4 (US2)**: Depends on Phase 2; benefits from US1 (overview syncs via fixed `syncToStore`)
- **Phase 5 (US3)**: Depends on Phase 2 (tuning) — can parallel with US1/US2 polish
- **Phase 6**: Depends on US1 (selected indicator uses recency) + all prior

### Within Phase 2

```
T002 → T003 → T004     (field → buildOverview → its tests, same util file then test)
T005 [P]               (different file: useForceSimulation.ts — parallel with T002–T004)
```

### Within Phase 3 (same file — sequential)

```
T006 → T007 → T008 → T009   (all edit ForceGraphPanel.tsx)
```

### Parallel Opportunities Summary

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 2 | T005 (sim hook) alongside T002–T004 (graphTree) |
| Phase 2 | T004 (tests) parallel once T003 done |
| Phase 6 | T016 & T017 parallel |

> Note: T006–T010, T012, T014 all edit `ForceGraphPanel.tsx` — keep them sequential to avoid conflicts.

---

## Parallel Example: Phase 2

```bash
# Different files — run together:
Task: "T005 Tune useForceSimulation.ts (centering + friction)"
Task: "T002+T003 Edit graphTree.ts (selectedAt + buildOverview)"
# Then:
Task: "T004 Update graphTree.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 — the bug fix)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T005)
3. Phase 3: User Story 1 (T006–T009) — **fixes the broken news sync**
4. **STOP and VALIDATE**: click nodes → articles appear
5. Ship the fix

### Incremental Delivery

1. **MVP**: Phases 1–3 → clicked nodes drive article results (bug fixed)
2. **v1.1**: Phase 4 → default overview on load
3. **v1.2**: Phase 5 → natural/smooth interactions
4. **v1.3**: Phase 6 → selected indicator + full validation

---

## Notes

- This is a refinement — no new files, no new dependencies. Edits to: `graphTree.ts`, `useForceSimulation.ts`, `ForceGraphPanel.tsx`, `GraphNodeView.tsx`, and `graphTree.test.ts`.
- `selectedAt` must be mutated in place on the d3-owned node objects (never via spread, which would drop it).
- Initial overview must call `syncToStore` exactly once (GDELT route has a 6s cooldown — multiple fetches get throttled/cached).
- Keep `NEWS_ACTIVE_CAP` = 8 and `MAX_LIVE_NODES` ≈ 60 unchanged; only the *priority* (depth → recency) changes.
- After changing `syncToStore`, verify the existing news fetch + article scatter still work (SC-007, no regression).
