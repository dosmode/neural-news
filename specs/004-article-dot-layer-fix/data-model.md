# Data Model: Article Dot Visualization & Keyword Layer Fix

**Feature**: 004-article-dot-layer-fix | **Date**: 2026-05-30

## Entities

### Article (existing — no schema change)

Represents a single news item fetched from the RSS feed.

| Field | Type | Description | Validation |
|---|---|---|---|
| `id` | `string` | Unique identifier (article URL) | Non-empty; used as dedup key |
| `title` | `string` | Article headline | Fallback: "Untitled Article" |
| `summary` | `string` | Short description or source domain | Fallback: "No summary available" |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | Heuristic sentiment classification | Always one of the three values |
| `relevanceMap` | `Record<string, number>` | Score per active keyword (0.0–1.0) | All active keyword IDs present as keys |
| `type` | `'breaking' \| 'deep-dive'` | Article type heuristic | Always one of the two values |
| `url` | `string` | Link to original article | Must be a valid URL |
| `domain` | `string` | Source news domain (e.g., "reuters.com") | Fallback: "unknown" |
| `seendate` | `string` | Publication date in compact ISO format (`YYYYMMDDTHHMMSSZ`) | Fallback: empty string |
| `socialimage` | `string?` | Optional thumbnail image URL | Optional |

**State transitions**: Articles are immutable after creation. They are replaced wholesale when a new fetch completes (no partial updates).

---

### MappedPoint (existing — behavior fix)

An Article with absolute pixel coordinates for rendering in the output panel. Currently mutated in-place by D3; after fix, coordinates are computed fresh each render on cloned objects.

| Field | Type | Description |
|---|---|---|
| all Article fields | — | Shallow copy of Article fields |
| `x` | `number` | Absolute pixel X within output panel container |
| `y` | `number` | Absolute pixel Y within output panel container |

**Invariant**: One MappedPoint exists per Article. Coordinates are bounded within `[0, containerWidth]` × `[0, containerHeight]` after the collision-avoidance simulation.

---

### KeywordNode (existing — no schema change)

An input layer node representing a search keyword.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique keyword identifier (e.g., `'nvda'`, `'ai-trend'`) |
| `label` | `string` | Display name (e.g., `'NVDA'`, `'AI Trend'`) |
| `isActive` | `boolean` | Whether this keyword is currently selected (from store) |

---

### DynamicFilterNode (new)

A hidden layer node derived from active keywords. Replaces the hardcoded Sentiment/Type/Market nodes.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Category identifier (e.g., `'Semiconductors'`, `'AI & Technology'`) |
| `label` | `string` | Display name (same as id for Layer 1; fixed label for Layer 2) |
| `layer` | `1 \| 2` | Which hidden layer this node belongs to |
| `weight` | `number` | Filter weight 0.0–1.0 (persisted in `filterWeights` store key by category id) |

**Layer 1 nodes**: Derived from `KEYWORD_CATEGORY_MAP` applied to active keywords. One node per unique category. Max 4 nodes. 

**Layer 2 nodes**: Always `[{ id: 'sentiment', label: 'Sentiment' }, { id: 'recency', label: 'Recency' }, { id: 'relevance', label: 'Relevance' }]` — fixed regardless of keywords.

---

### KEYWORD_CATEGORY_MAP (new constant)

Maps keyword IDs to topic category strings used for Layer 1 node generation.

```
'nvda'      → 'Semiconductors'
'tsmc'      → 'Semiconductors'
'ai-trend'  → 'AI & Technology'
'fed-rate'  → 'Monetary Policy'
'us-china'  → 'Geopolitics'
(fallback)  → 'General'
```

---

## Store Shape (updated)

### AppState changes

| Field | Change | Description |
|---|---|---|
| `activeKeywords` | No change | `Set<string>` of active keyword IDs |
| `filterWeights` | Key change | Now keyed by category ID (e.g., `'Semiconductors'`) instead of hardcoded names (`'sentiment'`). Persists across keyword toggles. |
| `dynamicFilterNodes` | **New** | `DynamicFilterNode[]` — derived from `activeKeywords`; updated by `toggleKeyword` action |
| `articles` | No change | `Article[]` — never mutated post-fetch |
| `selectedArticleId` | No change | `string \| null` |
| `isLoading` | No change | `boolean` |
| `error` | No change | `string \| null` |

### Actions

| Action | Change | Description |
|---|---|---|
| `toggleKeyword(id)` | **Updated** | Toggles keyword; also recomputes `dynamicFilterNodes` and prunes/adds `filterWeights` keys |
| `setFilterWeight(id, weight)` | No change | Sets weight for a given category ID |
| `setArticles` | No change | Replaces article array |
| `setIsLoading` | No change | |
| `setError` | No change | |

---

## Deduplication

Articles are deduplicated by `url` (the `id` field) before being passed to `calculateClustering`. If two articles share the same URL, only the first occurrence is kept.

---

## Validation Rules

- `relevanceMap` must contain an entry for every active keyword ID; entries for inactive keywords are ignored
- `filterWeights` must contain an entry for every `DynamicFilterNode` id; missing entries default to `0.5`
- `dynamicFilterNodes` is always kept in sync with `activeKeywords` — they are never stale relative to each other
