# Tasks: Inter-Keyword Cross Links

**Input**: Design documents from `specs/016-inter-keyword-links/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contract.md ✅ quickstart.md ✅

**Tests**: Unit tests for the pure cross-link logic (`areRelated`, `computeCrossLinks`). Rendering/physics validated manually.

**Organization**: Tasks grouped by user story. Refinement of features 014/015 — 3 existing files modified, no new files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup

**Purpose**: Confirm baseline before editing.

- [x] T001 Confirm green baseline — run `npx tsc --noEmit` and `npm test` before changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure cross-link data layer that all user stories build on.

**⚠️ CRITICAL**: US1/US2/US3 all depend on these.

- [x] T002 Add `type?: 'hierarchy' | 'cross'` to the `GraphLink` interface and add `export const MAX_CROSS_LINKS = 40;` in `src/utils/graphTree.ts`
- [x] T003 Implement `areRelated(idA: string, idB: string): boolean` in `src/utils/graphTree.ts` — returns false for self; true if `KEYWORD_SUGGESTIONS_MAP[idA]` has a label slugging to `idB` OR `KEYWORD_SUGGESTIONS_MAP[idB]` has a label slugging to `idA` (bidirectional union)
- [x] T004 Implement `computeCrossLinks(nodes: GraphNode[], hierarchyLinks: GraphLink[]): GraphLink[]` in `src/utils/graphTree.ts` — iterate unordered live-node pairs; skip pairs already joined by a hierarchy link (use a sorted `a|b` pair key, resolving string|object endpoints); skip non-related pairs; push `{ id: 'x-'+key, source, target, type: 'cross' }`; stop at `MAX_CROSS_LINKS`
- [x] T005 Tag links created in `buildOverview` (in `src/utils/graphTree.ts`) with `type: 'hierarchy'`
- [x] T006 [P] Add unit tests in `tests/utils/graphTree.test.ts`: `areRelated` true for a known related pair and false for unrelated + self; `computeCrossLinks` links related non-hierarchy pairs, excludes unrelated pairs, dedups against a hierarchy pair, produces no duplicate per pair, and never exceeds `MAX_CROSS_LINKS`

**Checkpoint**: `npm test` green for graphTree; `npx tsc --noEmit` clean.

---

## Phase 3: User Story 1 — Related Keywords Connected Across Branches (Priority: P1) 🎯 MVP

**Goal**: Related live nodes show a connecting line even when not parent-child; the graph reads as a network.

**Independent Test**: Expand "AI" (→ Nvidia, etc.) with "Semiconductors" present → a cross link appears between related non-parent nodes; unrelated nodes have none; collapsing a node removes its cross links.

### Implementation for User Story 1

- [x] T007 [US1] In `src/components/neural/ForceGraphPanel.tsx`, tag every hierarchy link created on expand (the `children.map(...)` in `selectNode`) with `type: 'hierarchy'`
- [x] T008 [US1] Add `const crossLinks = useMemo(() => computeCrossLinks(liveNodes, liveLinks), [liveNodes, liveLinks])` and `const allLinks = useMemo(() => [...liveLinks, ...crossLinks], [liveLinks, crossLinks])` in `src/components/neural/ForceGraphPanel.tsx` (import `computeCrossLinks`)
- [x] T009 [US1] Render `allLinks` instead of `liveLinks` in the SVG link map in `src/components/neural/ForceGraphPanel.tsx` (keys remain `l.id`)

**Checkpoint**: `npm run dev` → cross links appear between related non-parent nodes; none between unrelated; collapse removes them.

---

## Phase 4: User Story 2 — Cross Links Behave Like Real Connections (Priority: P2)

**Goal**: Cross links exert physics attraction and participate in hover highlighting.

**Independent Test**: Hover a cross-linked node → its cross neighbors light up too; cross-linked nodes are pulled toward each other in the layout.

### Implementation for User Story 2

- [x] T010 [US2] Pass `allLinks` (not `liveLinks`) to `useForceSimulation({ ..., links: allLinks })` in `src/components/neural/ForceGraphPanel.tsx` so cross links exert `forceLink` attraction (FR-006)
- [x] T011 [US2] Update the hover `neighborIds` memo in `src/components/neural/ForceGraphPanel.tsx` to iterate `allLinks` instead of `liveLinks` so cross neighbors highlight on hover (FR-007)

**Checkpoint**: Hover lights cross neighbors; cross-linked nodes attract in the simulation.

---

## Phase 5: User Story 3 — Visual Distinction (Priority: P3)

**Goal**: Cross links look distinct from hierarchy links.

**Independent Test**: Hierarchy and cross links are visibly different (cross = dashed, muted purple, dimmer).

### Implementation for User Story 3

- [x] T012 [US3] In `src/components/neural/GraphLinkView.tsx`, branch styling on `link.type`: cross = dashed (`strokeDasharray`), muted purple stroke, lower opacity (~0.15), thinner; hierarchy = current solid style; keep highlight/dim behavior for both

**Checkpoint**: Cross vs hierarchy links are visually distinguishable.

---

## Phase 6: Validation

**Purpose**: Type-check, tests, manual pass.

- [x] T013 [P] Run `npx tsc --noEmit` and fix any TypeScript errors across the 3 modified files
- [x] T014 [P] Run `npm test` — confirm new graphTree tests + existing suite pass
- [x] T015 Run `npm run dev` and manually validate all 10 functional requirements from `specs/016-inter-keyword-links/plan.md` acceptance checklist (related→linked, unrelated→none, new node→links update, collapse→links gone, no duplicates, physics, hover, visual distinction, smoothness, density)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — renders cross links (MVP)
- **Phase 4 (US2)**: Depends on Phase 3 — physics + hover (operates on the same `allLinks`)
- **Phase 5 (US3)**: Depends on Phase 2 data (`link.type`) — can parallel with US1/US2 (different file: GraphLinkView)
- **Phase 6**: Depends on all prior

### Within Phase 2 (same file — sequential)

```
T002 → T003 → T004 → T005   (all edit graphTree.ts)
T006 [P]                     (test file — after T002–T005)
```

### Within Phase 3 (same file — sequential)

```
T007 → T008 → T009          (all edit ForceGraphPanel.tsx)
```

### Parallel Opportunities Summary

| Phase | Parallel Tasks |
|-------|---------------|
| Phase 5 | T012 (GraphLinkView) can proceed alongside Phase 3/4 once T002 lands |
| Phase 6 | T013 & T014 parallel |

> Note: T007–T011 all edit `ForceGraphPanel.tsx` — keep sequential.

---

## Parallel Example: Phase 6

```bash
Task: "T013 npx tsc --noEmit"
Task: "T014 npm test"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T006)
3. Phase 3: User Story 1 (T007–T009) — cross links visible
4. **STOP and VALIDATE**: related non-parent nodes are connected
5. Ship

### Incremental Delivery

1. **MVP**: Phases 1–3 → cross links rendered (the requested change)
2. **v1.1**: Phase 4 → physics + hover integration
3. **v1.2**: Phase 5 → visual distinction
4. **v1.3**: Phase 6 → validation

---

## Notes

- Refinement — no new files, no new deps. Edits to: `graphTree.ts`, `ForceGraphPanel.tsx`, `GraphLinkView.tsx`, and `graphTree.test.ts`.
- Cross-links are DERIVED via `useMemo([liveNodes, liveLinks])` — never stored — so collapse/remove needs no cleanup (the lost node's pairs simply aren't recomputed).
- The memo deps are stable between simulation ticks, so cross-links are NOT recomputed each tick (keeps 60fps; FR-009).
- `computeCrossLinks` and the dedup pair-key must handle d3's string→object endpoint mutation when reading hierarchy links.
- Pass `allLinks` to THREE places: `useForceSimulation`, the render loop, and the hover `neighborIds` memo.
