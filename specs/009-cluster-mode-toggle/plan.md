# Implementation Plan: Cluster Mode Toggle (Sentiment ↔ Topic)

**Branch**: `009-cluster-mode-toggle` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-cluster-mode-toggle/spec.md`

---

## Summary

Add a Sentiment ↔ Topic clustering toggle to the output scatter. The 007 force-cluster layout is generalized to group by either the dot's sentiment (today's behavior) or its dominant active topic (the keyword it scores highest on). Dot color stays sentiment-based in both modes, so Topic mode shows position = topic, color = sentiment. Cluster labels and blob sizes reveal which topic has the most coverage. The mode lives in the store (session-scoped) and is surfaced as a segmented control in the output top bar.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Zustand 5, Framer Motion 12, D3 7 (force layout already used)

**Storage**: Zustand in-memory (session-scoped mode); no persistence/localStorage

**Testing**: Vitest 4 — extend `clustering.test.ts` with `dominantTopic` + topic-mode tests

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: Mode switch re-forms dots within 2s with smooth motion (SC-001)

**Constraints**: Sentiment mode unchanged; dot color always = sentiment; reuse 007 layout; no new dependency

**Scale/Scope**: ≤100 dots; up to ~8 topic clusters (+ optional Other)

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first, consistent with prior features |
| II. High Performance | ✅ Pass | One settle pass per mode/keyword change; same cost as 007 |
| III. Data Privacy & Security | ✅ Pass | Pure re-layout of existing dots; no data collection |
| IV. Component-Based Architecture | ✅ Pass | Grouping logic in `clustering.ts` (pure); component presentational |
| V. Continuous Automated Testing | ✅ Pass | `dominantTopic` + topic-mode unit tests added |
| Technology Stack | ✅ Pass | No new dependency |

---

## Project Structure

```text
specs/009-cluster-mode-toggle/
├── plan.md  research.md  data-model.md
├── contracts/ui-components.md
└── tasks.md  (/speckit-tasks)
```

### Source Code Changes

```text
UPDATE:
  src/utils/clustering.ts                  ← ClusterMode, Cluster, dominantTopic; mode-parameterized layout
  src/types/index.ts                       ← ClusterMode; AppState.clusterMode + setClusterMode
  src/store/useStore.ts                    ← clusterMode state + setClusterMode action
  src/hooks/useClustering.ts               ← pass clusterMode + keywords to calculateClustering
  src/components/output/ArticleScatter.tsx  ← segmented mode control; kind-aware cluster labels
  tests/utils/clustering.test.ts           ← dominantTopic + topic-mode tests

UNCHANGED:
  ClassificationField.tsx (reads points; color from sentiment — fine in both modes)
  NeuralPanel, ArticleStrip, gdeltService, useGdeltFetch, page.tsx
```

---

## Implementation Phases

### Phase A: Clustering engine generalization (P1 core)

**File**: `src/utils/clustering.ts`

1. Export `type ClusterMode = 'sentiment' | 'topic'` and generalize `SentimentCluster` → `Cluster` (add `key`, `kind`, optional `sentiment`); keep `export type SentimentCluster = Cluster`.
2. Export `dominantTopic(article, activeIds, keywordOrder)`: argmax of `relevanceMap[id]` over `activeIds`, ties by `keywordOrder` index, `'__other__'` if none.
3. Generalize `calculateClustering(..., mode = 'sentiment', keywords = [])`:
   - compute `groupKeyOf(d)`: sentiment mode → `d.sentiment`; topic mode → `dominantTopic(d, activeIds, keywordOrder)`
   - `present` groups + order: sentiment → `['negative','neutral','positive']` filtered to present; topic → `keywords.map(k=>k.id)` filtered to present, then `'__other__'` if present
   - anchors/forces/collide/centroid: unchanged from 007 but keyed by group
   - build `Cluster[]`: `kind`, `label` (sentiment name | keyword label | 'Other'), `sentiment?` (sentiment mode only), count, percent, centroid
   - `activeIds = Array.from(activeKeywords)`; `keywordOrder = keywords.map(k=>k.id)`; `labelOf(id)` from keywords map

---

### Phase B: Store + types

**B1 — `src/types/index.ts`**: add `export type ClusterMode = 'sentiment' | 'topic'` (or import from clustering); add `clusterMode: ClusterMode` and `setClusterMode: (m: ClusterMode) => void` to `AppState`.

**B2 — `src/store/useStore.ts`**: init `clusterMode: 'sentiment'`; `setClusterMode: (clusterMode) => set({ clusterMode })`.

---

### Phase C: Hook wiring

**File**: `src/hooks/useClustering.ts`
- read `clusterMode` and `keywords` from store
- pass to `calculateClustering(articles, activeKeywords, filterWeights, w, h, clusterMode, keywords)`
- add `clusterMode`, `keywords` to effect deps

---

### Phase D: ArticleScatter UI (P1 + P2)

**File**: `src/components/output/ArticleScatter.tsx`
1. Read `clusterMode`, `setClusterMode`.
2. Segmented control in the top bar (place left of the field toggle, e.g. `top-4 right-44`):
```tsx
<div className="absolute top-4 right-44 z-20 flex rounded-full border border-white/15 overflow-hidden text-[9px] font-mono uppercase tracking-widest">
  {(['sentiment','topic'] as const).map(m => (
    <button key={m} onClick={() => setClusterMode(m)}
      className={`px-2.5 py-1 transition-colors ${clusterMode===m ? 'bg-neon-blue/20 text-neon-blue' : 'text-white/35 hover:text-white/60'}`}>
      {m}
    </button>
  ))}
</div>
```
   (verify spacing vs. existing `right-32` field toggle + `right-5` count; nudge values so they don't overlap)
3. Generic cluster labels — style by `c.kind`:
   - `sentiment`: existing sentiment color + dot
   - `topic`: `text-white/80`, small cyan dot, label `c.label`
   - both: `{c.percent}%` + `{c.count} articles`

---

### Phase E: Tests + verify

**E1 — `tests/utils/clustering.test.ts`**: keep 8 existing; add `dominantTopic` (argmax/ties/other), topic-mode grouping + labels + count-sum + single-topic-100%, and color-invariance across modes.

**E2 — verify**: `npx tsc --noEmit` clean; `npm test` all pass; manual: toggle Sentiment↔Topic re-forms smoothly; topic blob sizes reflect coverage; dot colors unchanged; labels correct; mode persists in session.

---

## Post-Design Constitution Re-check

All pass. Grouping logic centralized + unit-tested in `clustering.ts`; component stays presentational; sentiment mode behavior preserved by default params; no new dependency; classification field and dot colors untouched.
