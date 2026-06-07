# Research: User-Managed Keywords with Dynamic Trending Defaults

**Feature**: 008-dynamic-keyword-management | **Date**: 2026-05-31

---

## Decision 1: Keywords become store data (not hardcoded)

**Decision**: Replace the hardcoded `KEYWORD_DEFINITIONS` array in `NeuralPanel.tsx` with a store-managed `keywords: KeywordDef[]` list (`{ id, label }`). `NeuralPanel` renders input nodes from this list. `activeKeywords: Set<string>` keeps its current meaning (which keyword ids are toggled on).

**Rationale**: Add/remove/persist/seed all require keywords to be mutable data. Hardcoding blocks every user story.

**Ripple**: `NeuralPanel` reads `keywords` from the store; the fixed array is removed.

---

## Decision 2: Hybrid trending = curated pool ranked by live news frequency

**Decision**: Maintain a curated **candidate pool** of ~18 current finance/tech topics. On first visit, do one broad top-news fetch (no user keywords), count how often each pool topic's label appears across the returned headlines, and select the **top 5 by live frequency**. If fewer than 5 pool topics appear, fill the remainder from the pool's default order.

**Why this hybrid (the chosen option)**:
- **Dynamic**: which 5 surface depends on what's actually in today's news (frequency-ranked)
- **Clean**: only known-good, recognizable labels appear (no noisy extracted tokens)
- **Robust**: always yields 5 via pool fallback, even if the seed fetch is weak or rate-limited

**Algorithm**:
```
pool = [Nvidia, AI, Bitcoin, Tesla, Fed Rate, OpenAI, TSMC, Apple,
        Inflation, Gold, Oil, US-China, Ethereum, Semiconductors,
        Interest Rates, Stock Market, Recession, Crypto]
headlines = fetch top news (broad query) → titles
score(topic) = count of titles whose lowercased text includes topic.toLowerCase()
ranked = pool sorted by score desc, then pool order
return ranked.slice(0, 5)   // fallback fills from pool order when scores are 0
```

**Seed fetch**: reuse the existing `/api/gdelt` proxy with a broad query (e.g., `business OR technology OR markets`) — no new endpoint.

**Alternatives considered**:
- Pure headline-entity extraction: rejected as primary — noisy labels (random capitalized words), worse UX
- Pure curated rotation (date/random): rejected — not "live"; user explicitly wanted dynamic
The hybrid keeps the cleanliness of curation with the liveness of frequency ranking.

---

## Decision 3: Persistence via localStorage, seed only when empty

**Decision**: Persist `{ keywords, activeKeywordIds }` to `localStorage` under one key. A client-only init hook (`useKeywordInit`, called once in `page.tsx`) runs on mount:
1. If saved keywords exist → hydrate store from them
2. Else → call the trending seeder, set the 5 results as keywords (all active), persist
A store subscription re-persists whenever keywords/activeKeywords change (after hydration).

**Rationale**:
- localStorage = per-browser persistence (FR-010), no accounts (out of scope)
- "Seed only when empty" ensures trending defaults never overwrite a returning user's set (US3 AS3)
- Client-only hydration avoids SSR/localStorage mismatch (store starts empty; effect fills it)

**Alternatives considered**:
- Zustand `persist` middleware: viable, but the "seed-when-empty + trending fetch" branch is cleaner as an explicit init hook than via middleware hooks.

---

## Decision 4: Keyword id (slug) vs label, and search by label

**Decision**: `KeywordDef = { id, label }`. `id` = slug of label (lowercase, non-alphanumeric → `-`, collapsed). `label` = the human text the user typed (or pool topic). The **news query and relevance matching use the `label`**; `relevanceMap` keys and `activeKeywords` continue to use `id`.

**Rationale**: The slug is a stable key for toggling/clustering; the label is what makes a meaningful news search ("Fed Rate" not "fed-rate"). Today's code searches by id which is acceptable only because ids happened to be wordlike — user keywords need label-based search.

**Ripple**: `fetchGdeltNews` and `useGdeltFetch` take the active `KeywordDef[]` (id+label). The query joins labels; `calculateRelevanceMap` matches titles against labels but stores scores under ids (so clustering's `relevanceMap` vs `activeKeywords` id check still works).

---

## Decision 5: Validation rules (pure, testable)

**Decision**: A pure `keywordUtils` module:
- `slugify(label)` → id
- `normalizeForCompare(label)` → trimmed lowercase (dedupe key)
- `validateNewKeyword(label, existing, max)` → `{ ok } | { error: 'empty'|'duplicate'|'limit'|'too-long' }`
- `MAX_KEYWORDS = 8`, `MAX_LABEL_LEN = 32`

**Rationale**: Centralizes FR-003/004/005/011 in unit-testable pure functions; the store action just calls `validateNewKeyword` and applies.

---

## Decision 6: Category for user keywords

**Decision**: `KEYWORD_CATEGORY_MAP` stays for known topics; any keyword id not in the map falls to `'General'` (already the existing `?? 'General'` fallback in `computeDynamicFilterNodes`). Pool topics may get added to the map for nicer categories; user-added arbitrary keywords land in "General".

**Rationale**: No change needed to the category engine — it already handles unknown keywords gracefully.

---

## Decision 7: UI placement

**Decision**: The add-keyword control is a compact text input + "＋" button at the **bottom of the input column** in `NeuralPanel`. Each keyword node gets a small **×** remove affordance on hover. Validation errors show as a brief inline hint near the input.

**Rationale**: Keeps all keyword management within the existing input-layer area (spec assumption); no new panel.
