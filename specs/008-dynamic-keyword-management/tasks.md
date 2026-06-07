---
description: "Tasks for User-Managed Keywords with Dynamic Trending Defaults"
---

# Tasks: User-Managed Keywords with Dynamic Trending Defaults

**Input**: Design documents from `specs/008-dynamic-keyword-management/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Unit tests for the pure `keywordUtils` and the `trendingService` ranking (mocked fetch), per constitution Principle V. Existing suites must keep passing.

**Organization**: Tasks grouped by user story. US1 (add) + US2 (remove) are the P1 MVP; US3 (trending defaults + persistence) is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** No new dependencies (localStorage is a browser primitive); Vitest + path alias already configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, pure validation utils, and the store actions that all user stories build on.

⚠️ **CRITICAL**: All user stories depend on this phase.

- [x] T001 [P] Add `export interface KeywordDef { id: string; label: string }` to `src/types/index.ts`; extend `AppState` with `keywords: KeywordDef[]`, `hydrated: boolean`, and action signatures `addKeyword: (label: string) => { ok: boolean; error?: string }`, `removeKeyword: (id: string) => void`, `setKeywords: (keywords: KeywordDef[], activeIds: string[]) => void`
- [x] T002 [P] Create `src/utils/keywordUtils.ts`: export `MAX_KEYWORDS = 8`, `MAX_LABEL_LEN = 32`, `slugify(label)` (lowercase, non-alphanumeric → `-`, collapse repeats, trim `-`), `normalizeForCompare(label)` (trim + lowercase), and `validateNewKeyword(label, existing: {label:string}[], max = MAX_KEYWORDS): { ok:true } | { ok:false; error:'empty'|'too-long'|'duplicate'|'limit' }` implementing: empty/whitespace→empty, len>MAX_LABEL_LEN→too-long, normalized match in existing→duplicate, existing.length>=max→limit, else ok
- [x] T003 Update `src/store/useStore.ts`: set initial `keywords: []`, `activeKeywords: new Set()`, `hydrated: false`; extract a private `deriveFrom(activeKeywords, prevWeights)` helper returning `{ dynamicFilterNodes, filterWeights }` (reuse existing `computeDynamicFilterNodes` + weight-preserve logic); implement `addKeyword(label)` (call `validateNewKeyword`; if not ok return it; else append `{id: slugify(label), label: label.trim()}` to keywords, add id to a new activeKeywords set, recompute derived, return `{ok:true}`), `removeKeyword(id)` (drop from keywords + activeKeywords, recompute derived), `setKeywords(keywords, activeIds)` (replace both, recompute derived); set `hydrated` via a `setHydrated` or inside `setKeywords`

**Checkpoint**: `npx tsc --noEmit` passes; store exposes keyword data + actions; no UI yet.

---

## Phase 3: US1 — Add a Custom Keyword (Priority: P1) 🎯 MVP

**Goal**: Reader types a topic → new active keyword node appears → articles update to include it. Empty/duplicate/limit blocked with a hint.

**Independent Test**: Type "Bitcoin" in the add control → a new active node appears and Bitcoin articles load within a few seconds. Empty submit and duplicate/limit are rejected with a hint.

### Tests for US1

- [x] T004 [P] [US1] Create `tests/utils/keywordUtils.test.ts`: `slugify('Fed Rate')==='fed-rate'`, collapses punctuation, trims dashes; `validateNewKeyword` returns `empty` for `'  '`, `too-long` for a 40-char label, `duplicate` for `'nvidia'` when existing has `{label:'Nvidia'}` (case-insensitive), `limit` when existing.length===8, `ok` otherwise

### Implementation for US1

- [x] T005 [US1] Update `src/services/gdeltService.ts`: change `fetchGdeltNews` to accept `activeKeywords: KeywordDef[]`; build the query by joining the `label`s (`(label1 OR label2)`); update `calculateRelevanceMap(title, activeKeywords)` to match each keyword's `label` (lowercased substring) but store the score under the keyword `id` (so `relevanceMap` keys stay ids for clustering); keep the existing empty-result and error handling
- [x] T006 [US1] Update `src/hooks/useGdeltFetch.ts`: read `keywords`, `activeKeywords`, and `hydrated` from the store; compute `active = keywords.filter(k => activeKeywords.has(k.id))`; only execute the fetch when `hydrated && active.length > 0`, passing `active` to `fetchGdeltNews`; when `active.length === 0`, clear articles (empty output); keep the existing debounce/cooldown
- [x] T007 [US1] Update `src/components/neural/NeuralPanel.tsx` to render input-layer nodes from the store `keywords` (remove the hardcoded `KEYWORD_DEFINITIONS` source for node generation; keep a separate `KEYWORD_CATEGORY_MAP` only if referenced — it lives in the store); add an **AddKeywordControl** at the bottom of the input column: a text `<input maxLength={32}>` + a **＋** button; on Enter or click call `addKeyword(value)`; if result `{ok:false}` show a brief inline hint mapped from `error` (`empty`→"Enter a topic", `duplicate`→"Already added", `limit`→"Max 8 keywords", `too-long`→"Too long"); clear the input on success; `onPointerDown stopPropagation` on the input so the panel doesn't intercept

**Checkpoint**: Adding a keyword shows a node and loads its articles; invalid inputs are blocked with hints; existing keyword toggling still works.

---

## Phase 4: US2 — Remove a Keyword (Priority: P1)

**Goal**: Reader removes a keyword node → it disappears and the visualization re-derives from the rest; removing the last shows an empty-state prompt.

**Independent Test**: Click the × on a keyword node → node disappears, output excludes that topic, hidden layers re-derive. Remove all → "Add a keyword to start" prompt appears (no blank/broken view).

### Implementation for US2

- [x] T008 [US2] Add a remove affordance to `KeywordPill` in `src/components/neural/NeuralPanel.tsx`: a small **×** button shown on hover, positioned at the pill corner, with `onPointerDown stopPropagation` and `onClick` → `removeKeyword(node.id)` (must not trigger the pill's toggle); ensure the SVG edges + filter nodes recompute from the reduced keyword set (they already derive from `dynamicFilterNodes`/store)
- [x] T009 [US2] Add the empty-state prompt to `src/components/neural/NeuralPanel.tsx`: when store `keywords.length === 0`, render a centered "Add a keyword to start" message in the input column instead of nodes (the AddKeywordControl remains visible); confirm no NaN/edge issues in the layout helper when there are zero keyword nodes

**Checkpoint**: Removing a node updates everything; removing the last shows the prompt; no broken visualization.

---

## Phase 5: US3 — Dynamic Trending Defaults + Persistence (Priority: P2)

**Goal**: First visit (or empty saved set) seeds ~5 trending topics (hybrid: curated pool ranked by live headline frequency); the reader's set persists per-browser and is restored on return.

**Independent Test**: Clear localStorage, load → ~5 trending nodes appear and articles load automatically, zero legacy NVDA/TSMC hardcode. Customize, refresh → exact set restored. Force a failed seed → curated fallback of 5 still appears.

### Tests for US3

- [x] T010 [P] [US3] Create `tests/services/trendingService.test.ts`: mock global `fetch` to return a JSON body with `articles` whose titles mention some pool topics more than others → assert `getTrendingKeywords(5)` ranks the most-mentioned first and returns exactly 5 with `slugify`'d ids; mock `fetch` rejecting/empty → assert it still returns 5 pool items in pool order (never throws)

### Implementation for US3

- [x] T011 [P] [US3] Create `src/services/trendingService.ts`: export `TRENDING_POOL` (~18 `{id,label}` topics: Nvidia, AI, Bitcoin, Tesla, Fed Rate, OpenAI, TSMC, Apple, Inflation, Gold, Oil, US-China, Ethereum, Semiconductors, Interest Rates, Stock Market, Recession, Crypto — ids via `slugify`); `getTrendingKeywords(count = 5)`: `fetch('/api/gdelt?query=' + encodeURIComponent('business OR technology OR markets'))`, parse `articles`, score each pool label by count of titles containing it (case-insensitive), sort by score desc then pool order, return first `count`; wrap in try/catch so any failure returns the first `count` pool items; never throws
- [x] T012 [US3] Create `src/hooks/useKeywordInit.ts`: a `useEffect(() => { ... }, [])` that reads `localStorage['neural-news:keywords']`; if parsed `saved.keywords?.length` → `setKeywords(saved.keywords, saved.activeIds)`; else `getTrendingKeywords(5).then(top => setKeywords(top, top.map(k => k.id)))`; mark `hydrated` true after; add a second `useEffect` (or store subscription) that, when `hydrated`, writes `{ keywords, activeIds: Array.from(activeKeywords) }` to localStorage whenever `keywords` or `activeKeywords` change; guard all localStorage access for client-only (`typeof window !== 'undefined'`)
- [x] T013 [US3] Call `useKeywordInit()` in `src/app/page.tsx` (next to `useGdeltFetch()`), so hydration/seeding runs once on mount before the gated fetch fires

**Checkpoint**: First load seeds trending + loads articles; refresh restores the saved set; failed seed falls back to 5 curated topics.

---

## Phase 6: Polish & Verification

- [x] T014 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (clustering + sentimentField + keywordUtils + trendingService all pass); fix any type errors from the `KeywordDef[]` signature changes
- [x] T015 Manual verification against spec: (a) first load → ~5 trending, no hardcoded legacy; (b) add "Bitcoin" → node + articles <5s; (c) remove a node → updates <3s; (d) remove all → prompt; (e) refresh → set restored; (f) duplicate/empty/limit/too-long blocked with hints; (g) toggling existing keywords still works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 + T002 in parallel; T003 after T001+T002. BLOCKS all stories.
- **US1 (Phase 3)**: T004 after T002; T005 after T001; T006 after T005; T007 after T003 (store actions) + T005/T006 (fetch). 
- **US2 (Phase 4)**: T008, T009 after T003 + T007 (NeuralPanel must already read store keywords).
- **US3 (Phase 5)**: T010+T011 after T002 (slugify); T012 after T011 + T003 (setKeywords); T013 after T012 + T006 (gated fetch).
- **Polish (Phase 6)**: after all.

### User Story Dependencies

- **US1 (P1)**: Foundational. → first MVP half
- **US2 (P1)**: Foundational + US1's NeuralPanel store-wiring (T007). → second MVP half
- **US3 (P2)**: Foundational + US1 fetch gating (T006). Independent of US2.

### Critical Path

```
T001+T002 → T003 → T005 → T006 → T007 → T008/T009 → (US3: T011 → T012 → T013) → T014 → T015
```

---

## Parallel Execution Examples

### Phase 2

```
Task A (T001): types
Task B (T002): keywordUtils
→ then T003 (store) needs both
```

### Across stories (after T003 + T007)

```
Dev A: US2 (T008, T009) — NeuralPanel remove + empty state
Dev B: US3 (T010+T011 → T012 → T013) — trending + persistence
```

### Test authoring in parallel

```
T004 (keywordUtils.test) ∥ T010 (trendingService.test) — different files, after their utils exist
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Foundational (T001→T003)
2. US1 (T004, T005→T006→T007) → add works
3. US2 (T008, T009) → remove works
4. **STOP and VALIDATE**: user can fully manage keywords (still seeded by the temporary empty→no-fetch path; trending comes in US3)

### Then US3

5. T010→T011 (trending) → T012 (init+persist) → T013 (wire) → first-visit dynamic defaults + persistence
6. Polish T014→T015

Note: before US3 lands, the app has no default keywords (empty start). US3 delivers the trending seed and persistence, completing the feature.

---

## Notes

- T002 (keywordUtils) and T011 (trendingService) are the pure, unit-tested cores
- The biggest integration ripple is the `KeywordDef[]` signature change through `gdeltService` → `useGdeltFetch` (T005/T006) — do them together
- `NeuralPanel` is touched by T007 (read store + add control), T008 (remove ×), T009 (empty state) — keep these sequential to avoid conflicts
- Downstream (clustering, field, scatter, strip) is intentionally untouched — keyword changes flow through the existing pipeline
- localStorage access must be client-only guarded to avoid SSR errors
