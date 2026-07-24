# Tasks: Obsidian-Style Force-Directed Graph View

**Input**: Design documents from `specs/014-force-directed-graph/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contract.md ✅ quickstart.md ✅

**Tests**: Unit tests included for the pure graph-tree logic (`graphTree.ts`). Interaction/rendering validated manually.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify dependencies and prepare the baseline.

- [x] T001 Verify `d3-force` and `d3-drag` are importable from the installed `d3@7` package — run `npx tsc --noEmit` after adding a temporary `import { forceSimulation } from 'd3-force'` probe, or confirm presence in `node_modules/d3-force` and `node_modules/d3-drag`
- [x] T002 Confirm `@types/d3` is present (it is in devDependencies) so `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`, `drag` are typed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure data layer, simulation hook, and presentational node/link components that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Define `GraphNode` and `GraphLink` TypeScript interfaces in `src/utils/graphTree.ts` per data-model.md (id, label, depth, parentId, expanded, hasChildren, x, y, vx, vy, fx, fy for nodes; id, source, target for links)
- [x] T004 Implement pure functions in `src/utils/graphTree.ts`: `buildInitialNodes(activeKeywords)` (root nodes), `getChildren(nodeId, liveNodeIds)` (children from `KEYWORD_SUGGESTIONS_MAP`, deduped against live ids), `collectDescendants(nodeId, links)` (recursive descendant id collection), `isLeaf(nodeId)` (no entry in adjacency map)
- [x] T005 Write unit tests in `tests/utils/graphTree.test.ts`: `getChildren` resolves & dedups against live ids; `collectDescendants` returns full recursive subtree; `isLeaf` true for unknown keyword; `buildInitialNodes` sets depth 0 / parentId null
- [x] T006 Create `src/hooks/useForceSimulation.ts` — own a `forceSimulation` in a `useRef`, configure `forceLink(links).id(d=>d.id).distance(70)`, `forceManyBody().strength(-220)`, `forceCenter(w/2,h/2)`, `forceCollide(28)`; `tick` handler bumps a `tickVersion` state; expose `reheat()` (`alpha(0.3).restart()`) and `setFixed(id,x,y)`; update sim `.nodes()`/link force when the live arrays change; stop/cleanup on unmount
- [x] T007 [P] Create `src/components/neural/GraphLinkView.tsx` — SVG `<line>` reading `source.x/y`, `target.x/y` (guard against string source before first tick); props `{ link, isHighlighted, isDimmed }`; styling per ui-contract (default opacity ~0.25, highlighted neon accent, dimmed ~0.15)
- [x] T008 [P] Create `src/components/neural/GraphNodeView.tsx` — positioned node (circle + label) sized/colored by `depth` and children state; expand affordance (ring/indicator) when `hasChildren && !expanded`; props `{ node, isHovered, isNeighborDimmed, onPointerDown, onPointerEnter, onPointerLeave }`; Framer Motion mount/unmount fade-scale

**Checkpoint**: `npm test` green for graphTree. Components compile. Run `npx tsc --noEmit`.

---

## Phase 3: User Story 1 — Click to Expand/Collapse (Priority: P1) 🎯 MVP

**Goal**: Center node renders; clicking a node springs its children outward via physics; clicking again collapses them; multi-level expansion works.

**Independent Test**: Center node "AI" renders mid-panel. Click it → "OpenAI", "Nvidia", etc. spring outward with links. Click again → they collapse. Click "Deep Learning" (if present) → its children expand (3-level depth).

### Implementation for User Story 1

- [x] T009 [US1] Create `src/components/neural/ForceGraphPanel.tsx` shell — `containerRef` + `ResizeObserver` for dims (same pattern as KeywordGraphPanel); local state `liveNodes`, `liveLinks`; initialize root node(s) via `buildInitialNodes`; integrate `useForceSimulation({ width, height, nodes: liveNodes, links: liveLinks })`; render `GraphLinkView` list then `GraphNodeView` list using simulation positions (keyed off `tickVersion`)
- [x] T010 [US1] Implement expand/collapse in `ForceGraphPanel.tsx`: on node click, if collapsed → `getChildren` (init at parent x/y + jitter), append to `liveNodes`/`liveLinks`, set `expanded=true`, `reheat()`; if expanded → `collectDescendants`, remove them from `liveNodes`/`liveLinks`, set `expanded=false`, `reheat()`
- [x] T011 [US1] Sync active keywords to store in `ForceGraphPanel.tsx`: when a node is expanded/added its keyword id joins the active set (via `addKeyword`/existing store action); when collapsed/removed it leaves — so `useGdeltFetch` fetches news for live keywords (FR-013)
- [x] T012 [US1] Update `src/app/page.tsx` — replace `import KeywordGraphPanel` with `import ForceGraphPanel` and swap the JSX element (identical `className`/`style` props)

**Checkpoint**: `npm run dev` → center node visible, click springs children out and back, multi-level works, news feed updates.

---

## Phase 4: User Story 2 — Drag Nodes to Reposition (Priority: P2)

**Goal**: Any node can be dragged with the mouse; connected nodes/links react physically; click vs drag disambiguated.

**Independent Test**: Grab a node and move it — it follows the pointer, neighbors react, releasing settles it. A quick click (no movement) still toggles expand/collapse instead of dragging.

### Implementation for User Story 2

- [x] T013 [US2] Add pointer drag handling in `src/components/neural/ForceGraphPanel.tsx` (or a `useNodeDrag` helper): on `pointerdown` record start pos + node id; on `pointermove` if moved >4px set `node.fx/fy` to pointer coords and `reheat()`; on `pointerup` clear `node.fx/fy` and reset
- [x] T014 [US2] Implement click vs drag disambiguation in `ForceGraphPanel.tsx`: on `pointerup`, if total movement <4px treat as click → call the expand/collapse toggle (T010); if ≥4px treat as completed drag → no toggle (FR-012)
- [x] T015 [US2] Wire pointer capture in `GraphNodeView.tsx` so drag continues smoothly when the pointer leaves the node bounds (`setPointerCapture` on pointerdown)

**Checkpoint**: Drag moves nodes with neighbors reacting; quick clicks still expand/collapse without accidental drags.

---

## Phase 5: User Story 3 — Hover to Highlight Connected Neighbors (Priority: P3)

**Goal**: Hovering a node highlights only its directly-connected nodes/links; the rest dim; leaving restores all.

**Independent Test**: With several nodes expanded, hover one — only it and its direct neighbors/links stay bright, everything else dims. Move the mouse away → all restore to uniform brightness.

### Implementation for User Story 3

- [x] T016 [US3] Add `hoveredId` state + neighbor computation in `src/components/neural/ForceGraphPanel.tsx`: `computeNeighborIds(hoveredId, liveLinks)` returns the set of node ids directly linked to the hovered node; set on `pointerEnter`, clear on `pointerLeave`
- [x] T017 [US3] Pass dimming props down: `GraphNodeView` gets `isNeighborDimmed = hoveredId && id !== hoveredId && !neighbors.has(id)`; `GraphLinkView` gets `isHighlighted` (touches hovered node) and `isDimmed` (hovered active but link not connected) — per ui-contract visual table (FR-009/FR-010)

**Checkpoint**: Hover dims non-neighbors within ~0.2s; leaving restores full graph.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup of superseded 013 code, performance guard, and validation.

- [x] T018 [P] Enforce live-node cap (~60) in `src/utils/graphTree.ts` or `ForceGraphPanel.tsx` — block further expansion with a subtle affordance when the cap is reached (performance, SC-002)
- [x] T019 [P] Add leaf-node feedback in `GraphNodeView.tsx` — clicking a node with `hasChildren === false` shows a subtle "no further connections" cue rather than doing nothing
- [x] T020 Delete superseded 013 files after confirming no remaining imports (`grep -r` each): `src/components/neural/KeywordGraphPanel.tsx`, `FloatingKeywordNode.tsx`, `SuggestionNode.tsx`, `GraphEdges.tsx`, `src/hooks/useKeywordSuggestions.ts`
- [x] T021 [P] Remove now-unused suggestion store actions if no longer referenced (`addSuggestions`/`acceptSuggestion`/`dismissSuggestion`/`suggestions` state) in `src/store/useStore.ts` and `src/types/index.ts` — only if grep confirms zero remaining usages; otherwise leave intact
- [x] T022 [P] Run `npx tsc --noEmit` and fix any TypeScript errors across new/modified files
- [x] T023 [P] Run `npm test` — confirm graphTree unit tests + existing suite pass
- [x] T024 Run `npm run dev` and manually validate all 13 functional requirements from `specs/014-force-directed-graph/plan.md` acceptance checklist (expand/collapse, multi-level, drag, hover, news sync)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — delivers MVP (expand/collapse)
- **Phase 4 (US2)**: Depends on Phase 3 (operates on the same panel/nodes)
- **Phase 5 (US3)**: Depends on Phase 3 (can parallel with Phase 4 — different concern)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### Within Phase 2

```
T003 → T004 → T005   (types → functions → tests, same file then test)
T006 (sim hook)      — independent, can parallel with T003-T005
T007, T008 [P]       — different files, parallel
```

### Within Phase 3

```
T009 (panel shell) → T010 (expand/collapse) → T011 (store sync) → T012 (page swap)
```

### Parallel Opportunities Summary

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 2 | T006 alongside T003–T005; T007 & T008 together |
| Phase 4 & 5 | US2 (drag) and US3 (hover) can be built in parallel after US1 |
| Phase 6 | T018, T019, T021, T022, T023 parallel |

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Different files — run in parallel:
Task: "T006 Create useForceSimulation.ts"
Task: "T007 Create GraphLinkView.tsx"
Task: "T008 Create GraphNodeView.tsx"
# (T003–T005 proceed on graphTree.ts in sequence)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Phases 1–3)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T008) — critical blocker
3. Complete Phase 3: User Story 1 (T009–T012)
4. **STOP and VALIDATE**: center node + click-to-spring expand/collapse, multi-level, news sync
5. Deploy MVP if validated

### Incremental Delivery

1. **MVP**: Phases 1–3 → Obsidian-style expand/collapse with physics
2. **v1.1**: Phase 4 → drag nodes
3. **v1.2**: Phase 5 → hover neighbor highlight
4. **v1.3**: Phase 6 → cleanup of old 013 code + performance + validation

---

## Notes

- `d3` mutates `link.source`/`link.target` from string id → node object after the first tick — read positions via `link.source.x`, not the original string (guard in `GraphLinkView`).
- Own the simulation in a `useRef`; never recreate it per render.
- Keep `src/services/keywordSuggestions.ts` — `KEYWORD_SUGGESTIONS_MAP` is the graph's data source.
- Do not delete 013 components until Phase 6 (T020) — keep them as reference during development.
- Active-keyword → store sync (T011) is what keeps `useGdeltFetch` working (FR-013 / SC-007) — verify news still loads after expanding keywords.
