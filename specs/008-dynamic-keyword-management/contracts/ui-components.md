# Contracts: User-Managed Keywords

**Feature**: 008-dynamic-keyword-management | **Date**: 2026-05-31

---

## keywordUtils (new, pure)

**File**: `src/utils/keywordUtils.ts`

```typescript
export const MAX_KEYWORDS = 8;
export const MAX_LABEL_LEN = 32;

export function slugify(label: string): string;
export function normalizeForCompare(label: string): string; // trim + lowercase

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: 'empty' | 'too-long' | 'duplicate' | 'limit' };

export function validateNewKeyword(
  label: string,
  existing: { label: string }[],
  max?: number,
): ValidateResult;
```

**Contract**:
- `slugify('Fed Rate')` → `'fed-rate'`; collapses non-alphanumerics; trims dashes
- `validateNewKeyword`: empty/whitespace → `empty`; `>MAX_LABEL_LEN` → `too-long`; normalized-equal to an existing → `duplicate`; `existing.length >= max` → `limit`; else `ok`

---

## trendingService (new)

**File**: `src/services/trendingService.ts`

```typescript
export const TRENDING_POOL: { id: string; label: string }[]; // ~18 curated topics
export async function getTrendingKeywords(count?: number): Promise<{ id: string; label: string }[]>;
```

**Contract**:
- Fetches a broad top-news sample via the existing `/api/gdelt` proxy (query e.g. `business OR technology OR markets`)
- Scores each `TRENDING_POOL` topic by occurrence count across returned headlines (case-insensitive substring)
- Returns top `count` (default 5) by score desc, then pool order
- On fetch failure or <count scored, fills from pool order (never returns fewer than `count`, never throws)
- Returned items use `slugify(label)` for `id`

---

## Store (modified)

**File**: `src/store/useStore.ts` + `src/types/index.ts`

Adds `keywords: KeywordDef[]`, `hydrated: boolean`; actions `addKeyword(label) → ValidateResult`, `removeKeyword(id)`, `setKeywords(keywords, activeIds)`. `KeywordDef = { id, label }` added to types. `activeKeywords` initial value becomes empty `Set`.

**Contract**:
- `addKeyword` validates then mutates `keywords` + `activeKeywords` + derived nodes/weights; returns the validation result so the UI can show errors
- `removeKeyword` prunes from both lists + recomputes derived
- `setKeywords` replaces the set wholesale (init/hydration), recomputes derived
- All keyword mutations keep `dynamicFilterNodes` and `filterWeights` consistent (FR-012)

---

## useKeywordInit (new hook)

**File**: `src/hooks/useKeywordInit.ts`

**Contract**:
- Runs once on mount (client only)
- Reads `localStorage['neural-news:keywords']`; if present and non-empty → `setKeywords(saved)`
- Else → `await getTrendingKeywords(5)` → `setKeywords(result, allIdsActive)`
- Sets `hydrated = true`
- Subscribes to store changes; while `hydrated`, persists `{ keywords, activeIds }` to localStorage on change
- Called once in `src/app/page.tsx`

---

## useGdeltFetch (modified)

**File**: `src/hooks/useGdeltFetch.ts`

**Contract change**: instead of reading `activeKeywords` (ids) and passing the Set, it reads both `keywords` and `activeKeywords`, computes the active `KeywordDef[]` = `keywords.filter(k => activeKeywords.has(k.id))`, and passes that to `fetchGdeltNews`. Gates fetching on `hydrated` so it doesn't fetch before init. No fetch when the active set is empty (empty output state).

---

## fetchGdeltNews (modified)

**File**: `src/services/gdeltService.ts`

**Contract change**: signature `fetchGdeltNews(activeKeywords: KeywordDef[])`:
- Query string joins the `label`s (human text) → meaningful news search
- `calculateRelevanceMap` matches article titles against `label`s but stores scores under keyword `id`s (so clustering's `relevanceMap` vs `activeKeywords` id-based check is unchanged)

---

## NeuralPanel (modified)

**File**: `src/components/neural/NeuralPanel.tsx`

**Changes**:
- Remove hardcoded `KEYWORD_DEFINITIONS`; read `keywords` from the store for input-layer nodes
- Each keyword node (`KeywordPill`) gains a small **×** remove button (visible on hover) → `removeKeyword(id)`
- Add an **add-keyword control** at the bottom of the input column: a compact text input + **＋** button; on submit calls `addKeyword(label)`, clears the input on success, shows a brief inline hint on error (`empty`/`duplicate`/`limit`/`too-long`)
- When `keywords` is empty, the input column shows a prompt ("Add a keyword to start") — supports FR-007 empty state
- Node vertical layout adapts to the keyword count (existing spacing formula already does this)

**Layout note**: with up to 8 keywords + the add control, the input column must remain readable; spacing uses the existing `place(count, i)` helper, and the add control sits below the last node.
