# Tasks: Neural Network News Curation MVP

**Input**: Design documents from `/specs/001-neural-news-curation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Project Initialization)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure folders: components/, data/, hooks/, store/, styles/, utils/
- [ ] T002 Initialize Next.js project with TypeScript, Tailwind CSS, and App Router
- [ ] T003 Install primary dependencies: `reactflow`, `d3`, `framer-motion`, `zustand`, `lucide-react`
- [ ] T004 Install dev dependencies: `vitest`, `@testing-library/react`, `@playwright/test`
- [ ] T005 [P] Configure global Tailwind theme with "Neon Glow" colors in `tailwind.config.ts`
- [ ] T006 [P] Setup basic global CSS with dark mode defaults in `src/app/globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T007 Create mock JSON dataset with ~50 articles in `src/data/mock-articles.json`
- [ ] T008 Define TypeScript interfaces for nodes, articles, and state in `src/types/index.ts`
- [ ] T009 Implement global state store using Zustand in `src/store/useStore.ts`
- [ ] T010 Create base layout component with Header and main visualization containers in `src/app/page.tsx`

---

## Phase 3: User Story 1 - Interactive Keyword Filtering (Priority: P1) 🎯 MVP

**Goal**: Select keywords and adjust weights between input and filter nodes

**Independent Test**: Select a node, verify it highlights, adjust a connection, verify weight value updates in console/state

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create custom `KeywordNode` component in `src/components/graph/KeywordNode.tsx`
- [ ] T012 [P] [US1] Create custom `FilterNode` component in `src/components/graph/FilterNode.tsx`
- [ ] T013 [P] [US1] Create custom `WeightEdge` component with handles in `src/components/graph/WeightEdge.tsx`
- [ ] T014 [US1] Initialize React Flow canvas with default nodes and edges in `src/components/graph/NetworkGraph.tsx`
- [ ] T015 [US1] Connect node/edge interactions to Zustand store actions in `src/components/graph/NetworkGraph.tsx`
- [ ] T016 [US1] Implement "pulse" animation for active nodes using Framer Motion in `src/components/graph/KeywordNode.tsx`

---

## Phase 4: User Story 2 - Visual Curation Map & Heatmap (Priority: P2)

**Goal**: Render articles as clustered dots on a dynamic gradient background

**Independent Test**: Change filter weights and verify dots move and background color shifts

### Implementation for User Story 2

- [ ] T017 [P] [US2] Implement D3 force simulation logic in `src/utils/clustering.ts`
- [ ] T018 [P] [US2] Create `CurationMap` component using SVG/Canvas in `src/components/map/CurationMap.tsx`
- [ ] T019 [US2] Create `useClustering` custom hook to bridge Zustand state and D3 in `src/hooks/useClustering.ts`
- [ ] T020 [US2] Implement dynamic gradient background logic in `src/components/map/HeatmapBackground.tsx`
- [ ] T021 [US2] Animate article dots movement using Framer Motion or D3 transitions in `src/components/map/CurationMap.tsx`
- [ ] T022 [US2] Integrate `NetworkGraph` and `CurationMap` into the main page in `src/app/page.tsx`

---

## Phase 5: User Story 3 - Article Preview & Summary (Priority: P3)

**Goal**: Display article details in a high-fidelity modal window

**Independent Test**: Click a dot on the map and verify the modal appears with the correct article title

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create `ArticleModal` component with neon glow styling in `src/components/shared/ArticleModal.tsx`
- [ ] T024 [US3] Implement click handler on article dots to select active article in `src/components/map/CurationMap.tsx`
- [ ] T025 [US3] Wire up modal visibility and data binding to selected article in `src/app/page.tsx`
- [ ] T026 [US3] Add enter/exit animations for the modal using Framer Motion in `src/components/shared/ArticleModal.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual refinements and final verification

- [ ] T027 [P] Implement responsive layout for tablet viewports in `src/styles/responsive.css`
- [ ] T028 Add loading state animations and "Empty Map" state in `src/app/page.tsx`
- [ ] T029 Perform final performance audit for 100+ points on low-power devices
- [ ] T030 Create a short interaction guide/onboarding tooltip in `src/components/shared/Onboarding.tsx`

---

## Dependencies & Execution Order

1. **Setup (Phase 1)** & **Foundational (Phase 2)** must be completed first.
2. **User Story 1 (P1)** is the primary blocker for the visual map as it provides the input weights.
3. **User Story 2 (P2)** can start once the state for weights is ready.
4. **User Story 3 (P3)** is the final polish step once data points are visible.

## Parallel Execution Examples

### Setup Concurrency
- T005 [P] & T006 [P] can run while T003/T004 are installing.

### MVP Implementation Concurrency
- T011 [P], T012 [P], and T013 [P] (React Flow custom components) can be developed simultaneously.
- T017 [P] (D3 logic) can be developed in parallel with the graph UI.

## Implementation Strategy

### MVP First (User Stories 1 & 2)
1. Complete Setup and Foundation.
2. Focus on getting the React Flow nodes to update a numeric weight in Zustand.
3. Immediately pipe that weight into a basic D3 simulation to move a few test dots.
4. Validate the "Input -> Output" feedback loop before adding neon styles or 100+ articles.

### Incremental Delivery
1. **Milestone 1**: Graph with weight adjustment (Story 1).
2. **Milestone 2**: Map with clustering dots and gradient (Story 2).
3. **Milestone 3**: Article modals and high-fidelity polish (Story 3).
