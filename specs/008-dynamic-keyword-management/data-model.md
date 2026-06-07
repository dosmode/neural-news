# Data Model: User-Managed Keywords with Dynamic Trending Defaults

**Feature**: 008-dynamic-keyword-management | **Date**: 2026-05-31

---

## New Entity: KeywordDef

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Slug of label (stable key for toggling/clustering) |
| `label` | `string` | Human display text; used for the news query + relevance matching |

---

## Store Changes (AppState)

### Fields to ADD

| Field | Type | Default | Description |
|---|---|---|---|
| `keywords` | `KeywordDef[]` | `[]` | Full set of keyword nodes (replaces hardcoded list) |
| `hydrated` | `boolean` | `false` | True once localStorage/trending init has run (gates persistence) |

### Fields CHANGED

| Field | Change |
|---|---|
| `activeKeywords` | `Set<string>` of keyword **ids** — unchanged meaning; now references ids in `keywords`. Initial value becomes empty (filled by init hook) |

### Actions to ADD

| Action | Signature | Behavior |
|---|---|---|
| `addKeyword` | `(label: string) => { ok: boolean; error?: string }` | Validate via `validateNewKeyword`; on ok, append `{id,label}` to `keywords`, add id to `activeKeywords`, recompute `dynamicFilterNodes` + `filterWeights`; return result |
| `removeKeyword` | `(id: string) => void` | Remove from `keywords` and `activeKeywords`; recompute derived nodes/weights |
| `setKeywords` | `(keywords: KeywordDef[], activeIds: string[]) => void` | Bulk set (used by init/hydration); recompute derived |

### Actions UNCHANGED

| Action | Note |
|---|---|
| `toggleKeyword(id)` | Still toggles active membership; recomputes derived nodes/weights |

---

## Constants

| Constant | Value | Meaning |
|---|---|---|
| `MAX_KEYWORDS` | `8` | Max simultaneous keywords (FR-005) |
| `MAX_LABEL_LEN` | `32` | Max keyword length (FR-011) |
| `TRENDING_COUNT` | `5` | Number of default trending topics (FR-008) |
| `TRENDING_POOL` | ~18 topics | Curated candidate pool (Decision 2) |

---

## localStorage Schema

Key: `neural-news:keywords`

```json
{
  "keywords": [{ "id": "nvidia", "label": "Nvidia" }, ...],
  "activeIds": ["nvidia", "bitcoin", ...]
}
```

- Written whenever `keywords`/`activeKeywords` change AND `hydrated === true`
- Read once on mount by `useKeywordInit`

---

## Validation Rules (keywordUtils — pure)

| Function | Rule |
|---|---|
| `slugify(label)` | lowercase, non-alphanumeric → `-`, collapse repeats, trim `-` |
| `normalizeForCompare(label)` | `label.trim().toLowerCase()` (dedupe key) |
| `validateNewKeyword(label, existing, max)` | empty/whitespace → `error:'empty'`; len > MAX_LABEL_LEN → `error:'too-long'`; normalized match in existing → `error:'duplicate'`; existing.length ≥ max → `error:'limit'`; else `ok` |

---

## Relationships

- `activeKeywords ⊆ keywords.map(k => k.id)` (every active id exists in keywords)
- `dynamicFilterNodes` derived from `activeKeywords` via `KEYWORD_CATEGORY_MAP` (`?? 'General'`) — unchanged engine
- News fetch uses `keywords.filter(k => activeKeywords.has(k.id))` → labels for query
- `relevanceMap` keys = keyword ids; matching done against labels

---

## State Transitions

```
mount → useKeywordInit:
  saved keywords present AND non-empty?
    yes → setKeywords(saved)            (returning user, US3-AS3)
    no  → getTrendingKeywords()         (first visit OR empty set, US3)
            success → setKeywords(top5, all active)
            fail/<5 → curated fallback fill (FR-009)
  hydrated = true
→ thereafter: add/remove/toggle mutate store → subscription persists to localStorage
```

Note: an empty saved set is treated like a first visit and re-seeded with trending (friendlier than restoring nothing). The in-session empty state (FR-007) still shows immediately after a user removes their last keyword.

---

## Edge-case data handling

- Remove last keyword → `keywords: []`, `activeKeywords: ∅` → output shows empty state (FR-007); persisted as empty (next load re-seeds trending only if storage cleared — empty saved set is respected as "user removed all")
- Duplicate (case/space-insensitive) → rejected, existing highlighted (FR-004)
- Over MAX_KEYWORDS → rejected with `limit` error (FR-005)
