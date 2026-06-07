---
description: "Task list for Article Dot Visualization & Keyword Layer Fix"
---

# Tasks: Article Dot Visualization & Keyword Layer Fix

**Input**: Design documents from `specs/004-article-dot-layer-fix/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/gdelt-api.md ✅

**Tests**: Included — required by constitution (Principle V). Vitest 4.x already in `devDependencies`.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire test runner so test tasks in later phases can execute.

- [x] T001 Add `"test": "vitest"` script to `package.json` and create `vitest.config.ts` at project root to resolve `@/` path alias to `./src`

**Checkpoint**: `npm test` runs without error (zero tests is fine at this point).

---

## Phase 2: Foundational (Blocking Prerequisites)

**N/A for this feature.** US1 and US2 changes are in separate files with no shared blocking prerequisite. Each user story phase can begin immediately after Setup.

---

## Phase 3: User Story 1 - View Live News as Dots (Priority: P1) 🎯 MVP

**Goal**: Every fetched article appears as exactly one visible, non-drifting dot in the output visualization panel within 5 seconds of page load.

**Root cause** (from research.md): `calculateClustering` in `src/utils/clustering.ts` passes raw Zustand store articles to D3 forceSimulation, which mutates them in-place. Accumulated velocity values (`vx`, `vy`) push dots off-screen on re-renders. Additionally, the loading overlay in `CurationMap.tsx` hides dots whenever `isLoading` is true, causing a blank flash between re-fetches.

**Independent Test**: Open the app with "NVDA" keyword active. Within 10 seconds, count dots in the output panel — dot count must equal article count shown in sidebar. Hover any dot to see its title tooltip. Reload the page; dots must reappear without a permanent blank state.

### Implementation for User Story 1

- [x] T002 [P] [US1] Fix D3 state mutation in `src/utils/clustering.ts`: deduplicate articles by `url` using `new Map(articles.map(a => [a.url, a])).values()`, then shallow-clone each with `{ ...a }` before passing to `d3.forceSimulation`. Remove `d.x = d.x || width/2` (clones always have `x = undefined`, so always init at center).
- [x] T003 [P] [US1] Fix loading overlay in `src/components/map/CurationMap.tsx`: change `{!isLoading && points.map(...)}` to always render `points.map(...)`, adding `style={{ opacity: isLoading ? 0.4 : 1 }}` to the dot `<motion.div>` so last-known dots stay visible (dimmed) during re-fetch. Keep the spinner overlay for initial load (when `isLoading && points.length === 0`).
- [x] T004 [US1] Write unit tests for `calculateClustering` in `tests/utils/clustering.test.ts` covering these 5 cases: (1) returns exactly one MappedPoint per input article, (2) does NOT mutate the input article objects (assert `article.x === undefined` after call), (3) deduplicates articles with the same `url`, (4) returns empty array for empty input, (5) all returned `x` values are in `[0, width]` and `y` values in `[0, height]`.

**Checkpoint**: `npm test` passes all 5 clustering tests. Dots appear in the output panel on page load.

---

## Phase 4: User Story 2 - Keyword-Driven Layer Reclassification (Priority: P2)

**Goal**: Hidden layer nodes in the NetworkGraph derive their labels from the currently active keywords (via a keyword-to-category map) instead of showing hardcoded "Sentiment / Article Type / Market Context" regardless of context.

**Independent Test**: Load the app. Observe hidden layer node labels. Toggle "AI Trend" keyword off — hidden layer nodes should no longer show "AI & Technology". Toggle "US-China" on — a "Geopolitics" node should appear in hidden layer 1. Structural nodes (Sentiment, Recency, Relevance) must always remain in hidden layer 2.

### Implementation for User Story 2

- [x] T005 [P] [US2] Add `DynamicFilterNode` interface to `src/types/index.ts`: `{ id: string; label: string; layer: 1 | 2; }`. Also update `AppState` interface to add `dynamicFilterNodes: DynamicFilterNode[]`.
- [x] T006 [P] [US2] Add module-level helpers to `src/store/useStore.ts` (above `create<AppState>` call): `KEYWORD_CATEGORY_MAP` constant mapping keyword IDs to category strings, and `computeDynamicFilterNodes(activeKeywords: Set<string>): DynamicFilterNode[]` pure function that produces Layer 1 nodes (unique categories from active keywords, max 4) and fixed Layer 2 nodes `[{id:'sentiment', label:'Sentiment', layer:2}, {id:'recency', label:'Recency', layer:2}, {id:'relevance', label:'Relevance', layer:2}]`.
- [x] T007 [US2] Update initial state and `toggleKeyword` action in `src/store/useStore.ts`: set `dynamicFilterNodes` initial value by calling `computeDynamicFilterNodes(new Set(['nvda', 'ai-trend']))`, update initial `filterWeights` to use category IDs from those initial nodes (each defaults to `0.5`), and update `toggleKeyword` to call `computeDynamicFilterNodes(newKeywords)`, then rebuild `filterWeights` preserving existing weights for unchanged category IDs and defaulting new ones to `0.5`.
- [x] T008 [US2] Refactor `src/components/graph/NetworkGraph.tsx`: remove hardcoded `initialNodes` and `initialEdges` arrays. Read `activeKeywords` and `dynamicFilterNodes` from store. Use `useMemo` (dependency: `[activeKeywords, dynamicFilterNodes]`) to compute: input-layer nodes from a fixed keyword palette (`KEYWORD_DEFINITIONS` constant with id/label pairs for nvda/tsmc/ai-trend/fed-rate/us-china), hidden-layer nodes from `dynamicFilterNodes` (position Layer 1 at x=300, Layer 2 at x=500, y spaced evenly), and edges fully connecting input→Layer1 and Layer1→Layer2 (type `'weight'` for both layers). Keep `nodeTypes` and `edgeTypes` maps unchanged.

**Checkpoint**: NetworkGraph shows dynamic hidden layer labels that update when keywords are toggled. Layer 1 shows topic categories (e.g., "Semiconductors", "AI & Technology"); Layer 2 always shows "Sentiment", "Recency", "Relevance".

---

## Phase 5: User Story 3 - Click Dot to Read Article (Priority: P3)

**Goal**: Clicking any dot in the output panel opens the ArticleModal with the correct article's title, source, date, and working link.

**Context**: `ArticleModal.tsx` is fully implemented. `CurationMap.tsx` already calls `setSelectedArticle(point.id)` on click. After the Phase 3 D3 fix, `point.id` will correctly equal `article.id` (= `article.url`) on the shallow-cloned MappedPoint. US3 requires no new code — only verification that the wiring is intact end-to-end.

**Independent Test**: After Phase 3 is complete, click any dot in the output panel. Verify the modal opens showing the matching article title. Click "Read Full Source Article" — original article URL must open in a new tab.

### Implementation for User Story 3

- [x] T009 [P] [US3] Verify in `src/components/map/CurationMap.tsx` that `point.id` on the shallow-cloned MappedPoint equals `article.id` from the Zustand store — confirm that `{ ...a }` clone preserves the `id` field. Add an inline comment if needed to document the id-passing contract for future maintainers.
- [x] T010 [P] [US3] Review `src/components/shared/ArticleModal.tsx` — confirm `articles.find(a => a.id === selectedArticleId)` correctly matches after Phase 3 changes. Verify the modal's `href={article.url}` and `target="_blank"` link are present and correct.

**Checkpoint**: Clicking a visible dot opens the modal with the correct article. No code changes expected in this phase — these are verification tasks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Type safety, spec housekeeping.

- [x] T011 [P] Run `npx tsc --noEmit` and fix any TypeScript type errors introduced by new `DynamicFilterNode` interface and store shape changes in `src/types/index.ts` and `src/store/useStore.ts`
- [x] T012 [P] Update `specs/004-article-dot-layer-fix/checklists/requirements.md` — mark all checklist items complete and add implementation notes confirming each FR was addressed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Phase 2**: N/A
- **US1 (Phase 3)**: Depends on Setup (T001 needed before T004). T002 and T003 are independent — run in parallel.
- **US2 (Phase 4)**: Independent of US1. T005 and T006 are independent — run in parallel. T007 depends on T005 + T006. T008 depends on T007.
- **US3 (Phase 5)**: Depends on Phase 3 completion (dot visibility fix must be done first). T009 and T010 are independent.
- **Polish (Phase 6)**: Depends on US2 completion (type changes must be done before type-check).

### User Story Dependencies

- **US1 (P1)**: After Setup. No dependency on US2 or US3.
- **US2 (P2)**: After Setup. No dependency on US1 or US3.
- **US3 (P3)**: After US1 completion (dots must be visible before testing click behavior).

### Within Each User Story

- US1: T002 and T003 in parallel → T004 after T002
- US2: T005 and T006 in parallel → T007 after both → T008 after T007
- US3: T009 and T010 in parallel (after US1 complete)
- Polish: T011 and T012 in parallel (after US2 complete)

---

## Parallel Execution Examples

### User Story 1 (run T002 + T003 simultaneously)

```
Task A: "Fix D3 state mutation in src/utils/clustering.ts"
Task B: "Fix loading overlay in src/components/map/CurationMap.tsx"
→ Then: "Write unit tests in tests/utils/clustering.test.ts"
```

### User Story 2 (run T005 + T006 simultaneously)

```
Task A: "Add DynamicFilterNode interface to src/types/index.ts"
Task B: "Add KEYWORD_CATEGORY_MAP and computeDynamicFilterNodes to src/store/useStore.ts"
→ Then: "Update store initial state and toggleKeyword in src/store/useStore.ts"
→ Then: "Refactor NetworkGraph.tsx to use dynamic nodes"
```

### User Stories 1 and 2 (run both stories simultaneously after Setup)

```
Developer A: US1 phases (T002 → T003 → T004)
Developer B: US2 phases (T005 + T006 → T007 → T008)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Skip Phase 2 (N/A)
3. Complete Phase 3: US1 (T002, T003, T004)
4. **STOP and VALIDATE**: Dots visible, count matches sidebar, tests pass
5. Ship this fix independently if needed

### Incremental Delivery

1. Setup → US1 → Validate dots work → **MVP shipped**
2. Add US2 → Validate keyword layers update → **Enhanced shipped**
3. Add US3 verify → Validate click-to-read → **Complete shipped**
4. Polish → Type-check + checklist → **Done**

### Solo Developer (Fastest Path)

```
T001 → T002 + T003 (parallel) → T004 → T005 + T006 (parallel) → T007 → T008 → T009 + T010 (parallel) → T011 + T012 (parallel)
```

---

## Notes

- **[P]** tasks touch different files — confirmed no write conflicts
- T009 and T010 are verification tasks: expected outcome is "no changes needed"
- After Phase 3, US3 works without additional implementation because `ArticleModal.tsx` is already complete
- The `filterWeights` key migration (from `'sentiment'/'type'/'market'` to category IDs) happens in T007; existing slider behavior is preserved since `FilterNode.tsx` is generic and reads `filterWeights[id]` by the node's current id
- Vitest `@/` path alias resolution in `vitest.config.ts` uses `{ resolve: { alias: { '@': path.resolve(__dirname, './src') } } }`
