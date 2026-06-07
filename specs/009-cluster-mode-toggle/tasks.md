---
description: "Tasks for Cluster Mode Toggle (Sentiment ↔ Topic)"
---

# Tasks: Cluster Mode Toggle (Sentiment ↔ Topic)

**Input**: Design documents from `specs/009-cluster-mode-toggle/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Extend `tests/utils/clustering.test.ts` with `dominantTopic` + topic-mode + color-invariance assertions (constitution Principle V).

**Organization**: Tasks grouped by user story. US1 (toggle + topic grouping) + US2 (coverage labels) are the P1 MVP; US3 (sentiment color preserved) is mostly inherent + verified.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** D3 force, Vitest, and the sentiment palette already exist. No new dependencies.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Generalize the clustering engine + add the mode to the store. Everything else consumes these.

⚠️ **CRITICAL**: All user stories depend on this phase.

- [x] T001 Generalize `src/utils/clustering.ts`: export `type ClusterMode = 'sentiment' | 'topic'`; replace `interface SentimentCluster` with `interface Cluster { key: string; label: string; kind: 'sentiment' | 'topic'; sentiment?: 'positive'|'negative'|'neutral'; count: number; percent: number; cx: number; cy: number }` and add `export type SentimentCluster = Cluster`; export `dominantTopic(article, activeIds: string[], keywordOrder: string[]): string` returning the active id with the highest `relevanceMap[id]` (ties broken by `keywordOrder` index, `'__other__'` when none present); change `calculateClustering` signature to `(articles, activeKeywords, filterWeights, width, height, mode: ClusterMode = 'sentiment', keywords: {id:string;label:string}[] = [])`; inside, compute `activeIds = Array.from(activeKeywords)` and `keywordOrder = keywords.map(k=>k.id)`, a `groupKeyOf(d)` = `mode==='topic' ? dominantTopic(d, activeIds, keywordOrder) : d.sentiment`, and `present`/order = sentiment→`['negative','neutral','positive']` filtered to present, topic→`keywordOrder` filtered to present then `'__other__'` if present; keep the existing anchor/forceX/forceY/forceCollide/centroid math but key it by group; build `clusters: Cluster[]` with `kind`, `label` (sentiment name | keyword label via a `id→label` map | `'Other'`), `sentiment` set only in sentiment mode, count, percent, centroid; return `{ points, clusters }`
- [x] T002 [P] Add `ClusterMode` + store fields to `src/types/index.ts`: `export type ClusterMode = 'sentiment' | 'topic'` (or re-export from clustering), and add to `AppState`: `clusterMode: ClusterMode` and `setClusterMode: (mode: ClusterMode) => void`
- [x] T003 Add the mode state to `src/store/useStore.ts`: import `ClusterMode`; initial `clusterMode: 'sentiment'`; action `setClusterMode: (clusterMode) => set({ clusterMode })`

**Checkpoint**: `npx tsc --noEmit` passes; engine accepts a mode; store exposes `clusterMode` + setter; sentiment path unchanged by default.

---

## Phase 3: US1 — Switch Clustering Between Sentiment and Topic (Priority: P1) 🎯 MVP

**Goal**: A toggle switches the scatter grouping between Sentiment and Topic; dots re-form (smoothly) into the chosen grouping; mode persists in session.

**Independent Test**: With several keywords active and articles loaded, flip to Topic → per-topic clusters; flip back to Sentiment → sentiment clusters. Smooth both ways; mode stays after other interactions.

### Tests for US1

- [x] T004 [P] [US1] Extend `tests/utils/clustering.test.ts`: update existing calls (default `mode` works); ADD `dominantTopic`: article with `relevanceMap{nvda:0.9, ai:0.2}` + activeIds `['nvda','ai']` → `'nvda'`; tie picks earlier in `keywordOrder`; empty relevance → `'__other__'`; ADD topic-mode: build 6 articles (4 dominant-`nvda`, 2 dominant-`ai`) with `keywords=[{id:'nvda',label:'Nvidia'},{id:'ai',label:'AI'}]`, call `calculateClustering(..., 'topic', keywords)` → all `nvda`-dominant points share an X-region distinct from `ai`-dominant points; `clusters` have `kind==='topic'` and labels `'Nvidia'`/`'AI'`; counts sum to points length

### Implementation for US1

- [x] T005 [US1] Update `src/hooks/useClustering.ts`: read `clusterMode` and `keywords` from the store; pass them as the 6th/7th args to `calculateClustering(articles, activeKeywords, filterWeights, width, height, clusterMode, keywords)`; add `clusterMode` and `keywords` to the effect dependency array so clusters re-form on mode or keyword change
- [x] T006 [US1] Add the segmented mode control to `src/components/output/ArticleScatter.tsx`: read `clusterMode` and `setClusterMode` from the store; render a segmented toggle in the top bar (position so it does NOT overlap the existing `Field ON/OFF` at `right-32` or the count at `right-5` — e.g. place at `top-4 right-44`, and shift the field toggle/count if needed): `<div className="absolute top-4 right-44 z-20 flex rounded-full border border-white/15 overflow-hidden text-[9px] font-mono uppercase tracking-widest">` with two buttons for `'sentiment'` and `'topic'`, active = `bg-neon-blue/20 text-neon-blue`, inactive = `text-white/35 hover:text-white/60`, each `onClick={() => setClusterMode(m)}`

**Checkpoint**: Toggling Sentiment↔Topic re-forms dots smoothly (framer-motion springs already animate `x/y`); mode persists across keyword toggles within the session.

---

## Phase 4: US2 — Topic Clusters Reveal Coverage at a Glance (Priority: P1)

**Goal**: In Topic mode each cluster is labeled with the topic name + share, and the biggest cluster (most articles) is obvious.

**Independent Test**: Activate keywords where one topic clearly has more articles; in Topic mode that topic's cluster is visibly largest and its label shows the highest count/share.

### Implementation for US2

- [x] T007 [US2] Update the cluster proportion labels in `src/components/output/ArticleScatter.tsx` to be `kind`-aware: for each `c` in `clusters`, if `c.kind === 'sentiment'` keep today's sentiment-colored label (color/dot by `c.sentiment`); if `c.kind === 'topic'` use a neutral accent (`text-white/80`, a small `bg-neon-blue` dot) and show `c.label` (topic name) as the title; both render `{c.percent}%` (big) and `{c.count} articles` (small); keep the existing centroid-based positioning (`left: c.cx`, `top` lifted above the blob)

**Checkpoint**: Topic mode shows `TOPIC NAME · NN% · N articles` per cluster; the dominant topic's blob is visibly largest; sentiment mode labels unchanged.

---

## Phase 5: US3 — Dot Color Still Encodes Sentiment in Topic Mode (Priority: P2)

**Goal**: In Topic mode dots keep their sentiment colors, so within a topic cluster the positive/negative mix is visible; switching modes never changes colors.

**Independent Test**: In Topic mode, a topic cluster with mixed coverage shows a mix of blue/red dots; switching modes changes only positions, never colors.

### Implementation for US3

- [x] T008 [US3] Verify (no expected code change) in `src/components/output/ArticleScatter.tsx` that the dot className still derives color solely from `point.sentiment` (independent of `clusterMode`), so colors are identical across modes; add a test in `tests/utils/clustering.test.ts` asserting that for the same input the `points[i].sentiment` values are identical whether `mode='sentiment'` or `mode='topic'` (only x/y differ)

**Checkpoint**: Dot colors are mode-invariant; topic clusters visibly show their sentiment mix.

---

## Phase 6: Polish & Verification

- [x] T009 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (clustering + sentimentField + keywordUtils + trendingService all pass); fix any type errors from the `Cluster`/signature change
- [x] T010 Manual verification: (a) toggle Sentiment↔Topic → smooth re-form <2s; (b) Topic mode → biggest topic cluster obvious + correct labels; (c) dot colors unchanged across modes; (d) single active keyword in Topic → one 100% cluster; (e) keyword add/remove in Topic mode re-forms clusters, mode preserved; (f) hover/click/detail + classification field still work in both modes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: T001 (engine) + T002 (types) → T003 (store, needs T002 type). BLOCKS all stories.
- **US1 (Phase 3)**: T004 after T001; T005 after T001+T003; T006 after T003.
- **US2 (Phase 4)**: T007 after T005 (labels need `clusters` flowing with mode).
- **US3 (Phase 5)**: T008 after T005 (verifies the wired flow).
- **Polish (Phase 6)**: after all.

### User Story Dependencies

- **US1 (P1)**: Foundational. → MVP core (toggle + topic grouping)
- **US2 (P1)**: US1 (labels render the topic clusters). → MVP completion
- **US3 (P2)**: US1. Mostly verification (color is already sentiment-based).

### Critical Path

```
T001 + T002 → T003 → T005 → T006 → T007 → T008 → T009 → T010
(T004 in parallel after T001)
```

---

## Parallel Execution Examples

```
After T001:
  Task A (T002): types  →  Task B (T004): clustering tests (topic mode)
  → T003 (store, needs T002) → T005 (hook) → T006 (toggle UI) → T007 (labels)
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. Foundational T001→T002→T003
2. US1 T005 (hook) → T006 (toggle)
3. US2 T007 (kind-aware labels)
4. **STOP and VALIDATE**: switch modes, topic clusters with labels, coverage obvious
5. Ship

### Then US3 + Polish

6. T008 (color-invariance verify + test) → T009 (tsc+test) → T010 (manual)

---

## Notes

- T001 is the substantive change; the rest is store wiring + a toggle + label styling + tests
- Sentiment mode is the default param path — existing behavior and the 8 existing clustering tests stay valid
- `ClassificationField` is intentionally untouched — dot/field color comes from sentiment in both modes
- Watch top-bar spacing in T006: the new segmented control must not overlap the existing `Field ON/OFF` (`right-32`) and count (`right-5`); nudge positions as needed
- The smooth re-form on mode switch is free — framer-motion already animates dot `x/y` toward new cluster positions
