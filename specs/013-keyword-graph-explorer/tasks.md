# Tasks: Floating Keyword Graph Explorer

**Input**: Design documents from `specs/013-keyword-graph-explorer/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contract.md ✅ quickstart.md ✅

**Tests**: Unit tests included for the suggestion service and store actions (core business logic).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and prepare development baseline.

- [x] T001 Verify Framer Motion import works — open `src/components/neural/NeuralPanel.tsx` and confirm `framer-motion` can be imported without build errors (`npm run build` or `npx tsc --noEmit`)
- [x] T002 Create test directories `tests/services/` and `tests/store/` at repository root (they don't yet exist)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions, data service, and store extensions that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Extend `KeywordDef` with optional `parentId?: string | null` field and add `SuggestionDef` interface (`{ id, label, sourceKeywordId, isDismissed }`) in `src/types/index.ts`
- [x] T004 [P] Add `suggestions: SuggestionDef[]`, `addSuggestions`, `acceptSuggestion`, `dismissSuggestion` to `AppState` interface in `src/types/index.ts` (same file, same edit as T003 — do sequentially)
- [x] T005 Create `src/services/keywordSuggestions.ts` with `KEYWORD_SUGGESTIONS_MAP` (curated adjacency map for all TRENDING_POOL entries + 20 common topics) and `getSuggestionsFor(keywordId, existingKeywords, existingSuggestions): string[]` function
- [x] T006 Write unit tests for `getSuggestionsFor` in `tests/services/keywordSuggestions.test.ts`: covers correct count (3–5), excludes active keywords, excludes dismissed suggestions, fallback for unknown keywords
- [x] T007 Extend `useStore.ts` at `src/store/useStore.ts`: add `suggestions: []` to initial state; implement `addSuggestions(sourceKeywordId, labels)`, `acceptSuggestion(id)`, `dismissSuggestion(id)`; modify `removeKeyword(id)` to cascade-remove child suggestions and child keywords (where `parentId === id`)
- [x] T008 Write unit tests for new store actions in `tests/store/suggestions.test.ts`: `addSuggestions` populates state; `acceptSuggestion` moves suggestion → keyword with `parentId` set; `dismissSuggestion` sets `isDismissed`; `removeKeyword` cascades to suggestions + child keywords

**Checkpoint**: Types, service, and store are complete. Run `npm test` — all tests must pass before proceeding.

---

## Phase 3: User Story 1 — Add Keyword and Watch Suggestions Float In (Priority: P1) 🎯 MVP

**Goal**: User adds a keyword → keyword node floats in the panel → 3–5 suggestion nodes appear around it within 500ms.

**Independent Test**: Open the app, add "AI" in the keyword input. The "AI" keyword node should appear floating in the panel and 3–5 related suggestion nodes (e.g. "OpenAI", "Machine Learning") should appear around it in a dimmed/dashed style.

### Implementation for User Story 1

- [x] T009 [US1] Create `src/hooks/useKeywordSuggestions.ts` hook that watches `keywords` array length via `useEffect`, calls `getSuggestionsFor()` for newly added keywords, dispatches `store.addSuggestions()`, and tracks processed keyword IDs in a `useRef` to prevent duplicate generation
- [x] T010 [P] [US1] Create `src/components/neural/FloatingKeywordNode.tsx` — Framer Motion `motion.div` with continuous drift animation (randomized x/y keyframe arrays, `repeat: Infinity`, duration 8–12s), active/inactive visual states (neon-blue glow vs. white/30 dim), hover-revealed remove (×) button; props: `{ id, label, isActive, position, onToggle, onRemove }`
- [x] T011 [P] [US1] Create `src/components/neural/SuggestionNode.tsx` — similar to FloatingKeywordNode but 50% opacity, dashed neon-purple border, slower drift (duration 12–16s); full-node click calls `onAccept`, hover-revealed dismiss (×) calls `onDismiss`; props: `{ id, label, position, onAccept, onDismiss }`
- [x] T012 [P] [US1] Create `src/components/neural/GraphEdges.tsx` — SVG overlay (`absolute inset-0 pointer-events-none`) rendering curved paths from keyword node centers to their derived suggestion node centers; dashed stroke with `animate-neural-flow` class; dim opacity (0.25) for keyword-to-suggestion edges; props: `{ edges: Array<{id, sx, sy, tx, ty, type}>, width, height }`
- [x] T013 [US1] Create `src/components/neural/KeywordGraphPanel.tsx` — manages `positions: Map<nodeId, {x,y}>` in local state; `assignPosition(nodeId)` places new nodes in least-populated quadrant with 24px padding from edges; renders `FloatingKeywordNode` for each keyword, `SuggestionNode` for each non-dismissed suggestion, `GraphEdges` SVG overlay, `AddKeywordControl` (adapted from NeuralPanel pattern), and empty-state hint; integrates `useKeywordSuggestions()` hook; uses `containerRef + ResizeObserver` for panel dimensions (same pattern as NeuralPanel)
- [x] T014 [US1] Update `src/app/page.tsx` — replace `import NeuralPanel` with `import KeywordGraphPanel` and update the JSX element name (props identical: `className` and `style`)

**Checkpoint**: Run `npm run dev`. Add "AI" to the panel. Floating node should appear with suggestion nodes. News feed should still filter correctly.

---

## Phase 4: User Story 2 — Obsidian-Style Cascading Derivation (Priority: P2)

**Goal**: Clicking a suggestion node promotes it to a keyword and spawns new suggestions from it — enabling multi-level keyword graph expansion.

**Independent Test**: Add "Bitcoin" → accept suggestion "Ethereum" → verify "Ethereum" becomes an active keyword node and new suggestions ("DeFi", "Crypto", "Stablecoins") appear around it. Chain: Bitcoin → Ethereum → DeFi should be achievable (3-level depth).

### Implementation for User Story 2

- [x] T015 [US2] Update `acceptSuggestion` in `src/store/useStore.ts` to set `parentId` on the newly promoted keyword (the `sourceKeywordId` from the suggestion) — verify the promoted keyword appears in `keywords[]` with the correct `parentId`
- [x] T016 [US2] Update `useKeywordSuggestions.ts` hook at `src/hooks/useKeywordSuggestions.ts` to also fire on promoted keywords (those with `parentId` set) — the existing `useEffect` on `keywords.length` already covers this; verify with manual test that 2nd-level suggestions appear
- [x] T017 [US2] Add keyword node click-to-toggle-suggestions behavior in `src/components/neural/KeywordGraphPanel.tsx`: maintain a `collapsedKeywords: Set<string>` in local state; when a `FloatingKeywordNode` is clicked (not via remove), toggle that keyword's suggestions visibility; pass `isCollapsed` prop context so `SuggestionNode` components for that source are hidden when collapsed
- [x] T018 [US2] Update `src/components/neural/FloatingKeywordNode.tsx` to distinguish between "toggle active" click (existing behavior) and "collapse/expand suggestions" click — use a small indicator icon (▾/▸) that shows when the node has derived suggestions; clicking the indicator toggles collapse

**Checkpoint**: Multi-level derivation works. Collapsing a keyword node hides its suggestions. Expanding re-shows them.

---

## Phase 5: User Story 3 — Remove Keyword and Collapse Derived Graph (Priority: P3)

**Goal**: Removing a keyword collapses its derived branch — suggestions disappear, and any promoted-from-suggestion child keywords also disappear (cascade removal).

**Independent Test**: Add "Bitcoin" → accept "Ethereum" (child keyword with `parentId: "bitcoin"`) → remove "Bitcoin" → verify both "Bitcoin" node and "Ethereum" node disappear, along with all their suggestions. If "Ethereum" had been accepted from "Bitcoin", it should be gone.

### Implementation for User Story 3

- [x] T019 [US3] Verify cascade removal in `src/store/useStore.ts` `removeKeyword` action: when keyword A is removed, all suggestions where `sourceKeywordId === A.id` are removed AND all keywords where `parentId === A.id` are removed AND their suggestions are removed in turn — write a targeted test case in `tests/store/suggestions.test.ts` for this cascade scenario
- [x] T020 [US3] Update `src/components/neural/KeywordGraphPanel.tsx` to animate node removal — when a keyword or suggestion disappears from the store, its `FloatingKeywordNode` / `SuggestionNode` should fade out using Framer Motion `AnimatePresence` + `exit={{ opacity: 0, scale: 0.8 }}` rather than abruptly unmounting

**Checkpoint**: Remove "Bitcoin" after accepting "Ethereum" from it. Both nodes should gracefully fade out. News filter updates correctly.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX polish, cleanup, and validation pass.

- [x] T021 [P] Delete `src/components/neural/NeuralPanel.tsx` after confirming no other files import it (`grep -r "NeuralPanel" src/` should return 0 results)
- [x] T022 [P] Add loading state indicator to `KeywordGraphPanel` in `src/components/neural/KeywordGraphPanel.tsx` — reuse the existing bottom-edge pulse bar pattern from NeuralPanel (`isLoading && <div className="...animate-pulse..." />`)
- [x] T023 [P] Add entry animation to `FloatingKeywordNode` in `src/components/neural/FloatingKeywordNode.tsx` — `initial={{ opacity: 0, scale: 0.6 }}` + `animate={{ opacity: 1, scale: 1 }}` on mount so nodes "pop in" rather than appearing abruptly
- [x] T024 [P] Add entry animation to `SuggestionNode` in `src/components/neural/SuggestionNode.tsx` — staggered `initial={{ opacity: 0 }}` / `animate={{ opacity: 0.5 }}` with 100ms delay per suggestion index so they appear sequentially
- [x] T025 Wrap keyword node list and suggestion node list in `AnimatePresence` in `src/components/neural/KeywordGraphPanel.tsx` to enable exit animations (T020 depends on this)
- [x] T026 [P] Run `npx tsc --noEmit` and fix any TypeScript errors across all new/modified files
- [x] T027 [P] Run `npm test` — confirm all tests pass (suggestion service tests + store action tests)
- [ ] T028 Run `npm run dev` and manually validate all 11 functional requirements from `specs/013-keyword-graph-explorer/plan.md` acceptance checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — implements full floating UI
- **Phase 4 (US2)**: Depends on Phase 3 — extends cascading behavior
- **Phase 5 (US3)**: Depends on Phase 3 — adds cascade removal (can parallel with Phase 4)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5

### Within Phase 2 (Sequential — same files)

```
T003 → T004 (same file src/types/index.ts)
T005 → T006 (test after implementation)
T007 → T008 (test after implementation)
T003+T004 → T007 (store depends on types)
```

### Within Phase 3 (Parallel opportunities)

```
T009 (hook) — can start after T007
T010, T011, T012 — all [P], different files, can run in parallel
T013 (KeywordGraphPanel) — depends on T009, T010, T011, T012
T014 (page.tsx swap) — depends on T013
```

### Parallel Opportunities Summary

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 2 | T005 & T007 (after T003/T004 done) |
| Phase 3 | T010, T011, T012 simultaneously |
| Phase 5 | T019 & T020 simultaneously |
| Phase 6 | T021, T022, T023, T024, T026, T027 simultaneously |

---

## Parallel Example: Phase 3 (US1 Core Components)

```bash
# These 3 tasks touch different files — run in parallel:
Task: "T010 Create FloatingKeywordNode.tsx"
Task: "T011 Create SuggestionNode.tsx"
Task: "T012 Create GraphEdges.tsx"

# Then assemble:
Task: "T013 Create KeywordGraphPanel.tsx (depends on T010, T011, T012)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Phases 1–3)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T008) — critical blocker
3. Complete Phase 3: User Story 1 (T009–T014)
4. **STOP and VALIDATE**: Add keywords, see floating nodes + suggestions
5. Deploy MVP if validated

### Incremental Delivery

1. **MVP**: Phases 1–3 → floating keywords + auto-suggestions work
2. **v1.1**: Phase 4 → cascading derivation (Obsidian feel fully realized)
3. **v1.2**: Phase 5 → branch removal
4. **v1.3**: Phase 6 → animation polish + cleanup

---

## Notes

- `NeuralPanel.tsx` should NOT be deleted until Phase 6 (T021) — keep as reference during development
- The `positions` Map in `KeywordGraphPanel` is component-local state (not Zustand) — positions are recalculated on remount, which is acceptable behavior
- `acceptSuggestion` in the store must call `addKeyword` internally (or use same logic) to ensure the existing news-fetch hook (`useGdeltFetch`) still reacts correctly to the new keyword
- Existing `MAX_KEYWORDS = 8` limit applies to ALL keywords (including those promoted from suggestions) — `acceptSuggestion` must check this limit before promoting
