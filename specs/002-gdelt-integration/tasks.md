# Tasks: GDELT Live Data Integration (MVP 2)

**Input**: Design documents from `/specs/002-gdelt-integration/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/gdelt-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (State & Types Update)

**Purpose**: Update the core types and global state to support live fetching.

- [x] T001 Update `Article` interface in `src/types/index.ts` to include GDELT fields (`url`, `domain`, `seendate`, `socialimage`).
- [x] T002 Update `AppState` interface in `src/types/index.ts` to include `isLoading` and `error` properties.
- [x] T003 Update Zustand store in `src/store/useStore.ts` to initialize and manage `isLoading` and `error` state.

---

## Phase 2: User Story 1 & 2 - Live Data Fetching and Transformation (Priority: P1)

**Goal**: Fetch live data from GDELT DOC API based on active keywords and transform it into the internal `Article` format.

**Independent Test**: Select a keyword, check network tab for GDELT API request, and verify state contains mapped `Article` objects.

### Implementation for User Story 1 & 2

- [x] T004 [P] [US1] Create `src/services/gdeltService.ts` to handle the HTTP GET request to `api.gdeltproject.org`.
- [x] T005 [P] [US2] Implement data transformation logic within `gdeltService.ts` to map GDELT JSON to the updated `Article` interface.
- [x] T006 [P] [US2] Implement pseudo-relevance scoring logic within `gdeltService.ts` to populate `relevanceMap` based on keyword presence in titles.
- [x] T007 [US1] Create `useGdeltFetch` custom hook in `src/hooks/useGdeltFetch.ts` to orchestrate fetching and Zustand state updates.
- [x] T008 [US1] Integrate `useGdeltFetch` in `src/app/page.tsx` and remove the static `mockData` loading `useEffect`.

---

## Phase 3: User Story 3 - Sentiment Assignment (Priority: P2)

**Goal**: Assign a fallback sentiment score to each live article to preserve heatmap and dot colors.

**Independent Test**: Inspect the state of mapped articles and verify that `sentiment` is populated and dots render with colors.

### Implementation for User Story 3

- [x] T009 [P] [US3] Implement a deterministic sentiment heuristic (e.g., title hashing) in `src/services/gdeltService.ts` during transformation.
- [x] T010 [P] [US3] Implement a fallback `type` ('breaking'/'deep-dive') heuristic in `src/services/gdeltService.ts`.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Update UI components to handle loading states, errors, and new data fields.

- [x] T011 [P] Update `CurationMap` in `src/components/map/CurationMap.tsx` to handle `isLoading` and `error` states visually.
- [x] T012 [P] Update `ArticleModal` in `src/components/shared/ArticleModal.tsx` to display `domain`, `seendate`, and provide a clickable link to the original `url`.
- [x] T013 Update `page.tsx` status bar footer to show `isLoading` or `error` messages from the store instead of static "SYNCED".

---

## Dependencies & Execution Order

1. **Foundational (Phase 1)** must be completed first to provide the correct types.
2. **Phase 2 (Fetching/Transforming)** builds the core logic. `gdeltService.ts` is the foundation for the hook.
3. **Phase 3 (Sentiment)** can be integrated directly into the transformation logic built in Phase 2.
4. **Phase 4 (UI Polish)** depends on the state and data structure being fully wired up.

## Parallel Execution Examples

- T004, T005, T006, T009, T010 can be developed sequentially within `gdeltService.ts` without blocking UI work.
- T011 and T012 can be developed in parallel as they touch different UI components.
