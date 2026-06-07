# Implementation Plan: User-Managed Keywords with Dynamic Trending Defaults

**Branch**: `008-dynamic-keyword-management` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-dynamic-keyword-management/spec.md`

---

## Summary

Make keywords user-managed data instead of a hardcoded list. Users add keywords (compact input in the neural panel) and remove them (× on each node); the set persists per-browser in localStorage. On first visit (or an empty saved set), the app seeds ~5 trending topics via a **hybrid**: a curated candidate pool ranked by how often each appears in a live top-news fetch (dynamic + clean, with pool fallback). Keyword changes flow through the existing fetch → cluster → field pipeline. Search uses each keyword's human label; clustering keeps using its slug id.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Zustand 5, Framer Motion 12, D3 7. New: browser `localStorage` (no package). Reuses the existing `/api/gdelt` proxy.

**Storage**: Zustand (in-memory) + `localStorage` for keyword persistence

**Testing**: Vitest 4 — new unit tests for `keywordUtils` (validation/slug) and `trendingService` ranking (with a mocked fetch)

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: Add keyword → articles in <5s (SC-001); remove → update <3s (SC-002); first-visit trending + articles <5s (SC-003)

**Constraints**: Per-browser persistence only (no accounts); max 8 keywords; reuse existing fetch/cluster/field pipeline; no new external API

**Scale/Scope**: ≤8 keywords; one seed fetch on first visit

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first, consistent with prior features |
| II. High Performance | ✅ Pass | One seed fetch on first visit; debounced refresh reused |
| III. Data Privacy & Security | ✅ Pass | Only keyword text stored locally in the user's own browser; no PII, no server storage |
| IV. Component-Based Architecture | ✅ Pass | Pure utils + service + init hook; store owns state; NeuralPanel presentational |
| V. Continuous Automated Testing | ✅ Pass | `keywordUtils` + `trendingService` ranking unit-tested |
| Technology Stack | ✅ Pass | No new dependency |

---

## Project Structure

```text
specs/008-dynamic-keyword-management/
├── plan.md  research.md  data-model.md
├── contracts/ui-components.md
└── tasks.md  (/speckit-tasks)
```

### Source Code Changes

```text
CREATE:
  src/utils/keywordUtils.ts              ← slugify, normalize, validateNewKeyword, MAX_*
  src/services/trendingService.ts        ← TRENDING_POOL + getTrendingKeywords()
  src/hooks/useKeywordInit.ts            ← hydrate from localStorage or seed trending; persist
  tests/utils/keywordUtils.test.ts       ← validation + slug unit tests
  tests/services/trendingService.test.ts ← ranking unit test (mocked fetch)

UPDATE:
  src/types/index.ts                     ← KeywordDef; AppState additions
  src/store/useStore.ts                  ← keywords, hydrated; addKeyword/removeKeyword/setKeywords
  src/components/neural/NeuralPanel.tsx   ← read keywords from store; add/remove controls; empty state
  src/hooks/useGdeltFetch.ts             ← pass active KeywordDef[]; gate on hydrated
  src/services/gdeltService.ts           ← fetchGdeltNews(KeywordDef[]); query/match by label, key by id
  src/app/page.tsx                       ← call useKeywordInit()

UNCHANGED:
  clustering.ts, useClustering.ts, ClassificationField.tsx, ArticleScatter.tsx, ArticleStrip.tsx
  (all consume points/keywords downstream; no edits)
```

---

## Implementation Phases

### Phase A: Pure foundations (utils + types) + tests

**A1 — `src/types/index.ts`**: add `export interface KeywordDef { id: string; label: string }`; add to `AppState`: `keywords: KeywordDef[]`, `hydrated: boolean`, and actions `addKeyword`, `removeKeyword`, `setKeywords`.

**A2 — `src/utils/keywordUtils.ts`**: `MAX_KEYWORDS=8`, `MAX_LABEL_LEN=32`, `slugify`, `normalizeForCompare`, `validateNewKeyword`.

**A3 — `tests/utils/keywordUtils.test.ts`**: slugify cases; validate empty/too-long/duplicate(case-insensitive)/limit/ok.

---

### Phase B: Trending service + test

**B1 — `src/services/trendingService.ts`**: `TRENDING_POOL` (~18 topics), `getTrendingKeywords(count=5)`: fetch `/api/gdelt?query=...broad...`, score pool labels by headline occurrence, return top-N (pool-order fallback), ids via `slugify`. Never throws; always returns `count`.

**B2 — `tests/services/trendingService.test.ts`**: mock `fetch`; given headlines mentioning some pool topics, the most-mentioned rank first; on empty/failed fetch, returns `count` pool items in order.

---

### Phase C: Store actions (P1 add/remove)

**C1 — `src/store/useStore.ts`**:
- initial `keywords: []`, `activeKeywords: new Set()`, `hydrated: false`
- `addKeyword(label)`: `const r = validateNewKeyword(label, keywords, MAX_KEYWORDS); if(!r.ok) return r;` build `{ id: slugify(label), label: label.trim() }`, append to keywords, add id to activeKeywords, recompute `dynamicFilterNodes` + `filterWeights`; return `{ ok: true }`
- `removeKeyword(id)`: filter out of keywords + activeKeywords; recompute derived
- `setKeywords(kw, activeIds)`: replace; recompute derived
- factor the derived recompute (nodes+weights) into a small helper to avoid repetition

---

### Phase D: Fetch integration (label-based search)

**D1 — `src/services/gdeltService.ts`**: change `fetchGdeltNews(activeKeywords: KeywordDef[])`; build query from `labels`; `calculateRelevanceMap(title, activeKeywords)` matches `label` (lowercased substring) but writes scores under `id`.

**D2 — `src/hooks/useGdeltFetch.ts`**: read `keywords`, `activeKeywords`, `hydrated`; `const active = keywords.filter(k => activeKeywords.has(k.id))`; only fetch when `hydrated && active.length > 0`; pass `active`. Empty active → clear articles.

---

### Phase E: Persistence + first-visit seeding (P2)

**E1 — `src/hooks/useKeywordInit.ts`**:
```
useEffect once:
  const raw = localStorage.getItem('neural-news:keywords')
  const saved = raw ? JSON.parse(raw) : null
  if (saved?.keywords?.length) {
    setKeywords(saved.keywords, saved.activeIds)
  } else {
    const top = await getTrendingKeywords(5)
    setKeywords(top, top.map(k => k.id))
  }
  set hydrated = true
// separate effect: subscribe to store; if hydrated, persist { keywords, activeIds }
```

**E2 — `src/app/page.tsx`**: call `useKeywordInit()` near `useGdeltFetch()`.

---

### Phase F: NeuralPanel UI (P1 add/remove + empty state)

**F1 — `src/components/neural/NeuralPanel.tsx`**:
- replace `KEYWORD_DEFINITIONS` usage with `keywords` from the store
- `KeywordPill`: add a hover **×** → `removeKeyword(id)` (stopPropagation so it doesn't toggle)
- below the input column, an **AddKeywordControl**: text input (maxLength=32) + **＋**; Enter or click → `addKeyword(value)`; on `{ok:false}` show a brief inline hint mapped from the error; clear on success
- if `keywords.length === 0`, show "Add a keyword to start" prompt in the input column

---

### Phase G: Verify

- `npx tsc --noEmit` clean
- `npm test` (clustering + sentimentField + keywordUtils + trendingService) all pass
- Manual: first load seeds ~5 trending; add "Bitcoin" → node + articles; remove a node → updates; refresh → set restored; remove all → empty prompt; duplicate/limit/empty blocked with hint

---

## Post-Design Constitution Re-check

All pass. New logic isolated in pure utils + a service (both unit-tested) + an init hook; the store stays the single source of truth; downstream visualization is untouched. Privacy: only the user's own keyword text in their own browser's localStorage.
