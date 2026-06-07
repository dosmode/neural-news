# Research: Article Dot Visualization & Keyword Layer Fix

**Feature**: 004-article-dot-layer-fix | **Date**: 2026-05-30

## Decision 1: Root Cause of Missing Dots

**Decision**: Two compounding bugs prevent dots from appearing.

**Root Cause A — D3 simulation mutates Zustand store articles**

`src/utils/clustering.ts` passes the raw article objects from the Zustand store directly to `d3.forceSimulation`. D3 adds `x`, `y`, `vx`, `vy` properties to each object in-place. Because Zustand holds object references, the store's articles are silently mutated on every clustering run. On the second and subsequent runs, `d.x = d.x || width/2` reads the stale D3 `x` value (which may have drifted off-screen due to accumulated velocity), then adds another velocity delta on top of it. After a few frames, all dots are off-screen at coordinates like `(−2400, 1800)`.

**Root Cause B — Loading state flicker hides dots**

`useGdeltFetch` calls `setIsLoading(true)` both inside `scheduleFetch` (while waiting for the cooldown) and inside `executeFetch`. `CurationMap` renders dots only when `!isLoading`. If the cooldown triggers a re-render cycle, isLoading briefly flips true/false/true, causing a visible "no dots" flash that users perceive as articles not loading.

**Fix**: In `calculateClustering`, shallow-clone every article before passing to D3 so the store is never mutated. In `CurationMap`, keep the last known `points` array visible while loading (show stale dots with reduced opacity instead of hiding all dots).

**Alternatives considered**:
- Running D3 simulation on a separate copy using `JSON.parse(JSON.stringify(...))` — rejected because deep-clone is expensive; shallow clone is sufficient since D3 only adds top-level properties.
- Moving article storage out of Zustand — rejected because it would require a full store refactor unrelated to this feature.

---

## Decision 2: Dynamic Hidden Layer Node Generation

**Decision**: Introduce a `KEYWORD_CATEGORY_MAP` constant that maps each keyword ID to a topic category string. Derive hidden layer nodes from the set of unique categories among active keywords.

**Category mapping**:
| Keyword ID | Category |
|---|---|
| `nvda` | Semiconductors |
| `tsmc` | Semiconductors |
| `ai-trend` | AI & Technology |
| `fed-rate` | Monetary Policy |
| `us-china` | Geopolitics |
| (any unknown) | General |

**Layer 1 (hidden)**: One node per unique category derived from active keywords (e.g., if "nvda" + "tsmc" are active → one "Semiconductors" node). Max 4 nodes.

**Layer 2 (hidden)**: Fixed structural classifications that apply across all keyword contexts: "Sentiment", "Recency", "Relevance". These are structural, not keyword-specific.

**Why two layers**: Matches the reference screenshot structure (input → topic cluster layer → structural filter layer → output). Layer 1 collapses keyword space into categories; Layer 2 applies universal article attributes.

**Alternatives considered**:
- Purely dynamic layer 2 (also keyword-driven) — rejected because structural filters (sentiment, recency, relevance) are always meaningful regardless of topic context.
- AI/NLP-based category inference — rejected as out of scope and adds an external dependency.

---

## Decision 3: One-Dot-Per-Article Guarantee

**Decision**: Deduplicate articles by URL before passing to `calculateClustering`. Use URL as the canonical unique key.

**Implementation**: In `calculateClustering`, deduplicate input with `new Map(articles.map(a => [a.url, a]))` before running the simulation. Remove any article with an empty/undefined URL from visualization (it can still appear in the sidebar list as a fallback).

**Alternatives considered**:
- Deduplicate in `gdeltService.ts` at fetch time — acceptable, but deduplication in the clustering layer is more defensive and catches any duplicates introduced by future code paths.
- Using article title as dedup key — rejected because titles can be near-duplicates but distinct articles; URL is authoritative.

---

## Decision 4: Store Shape Changes

**Decision**: Add `dynamicFilterNodes` to the Zustand store. This is a derived value (array of `{ id, label }` objects) recomputed whenever `activeKeywords` changes.

The `NetworkGraph` will read `dynamicFilterNodes` from the store instead of using hardcoded node arrays. `filterWeights` in the store will be keyed by category IDs (e.g., `'Semiconductors'`) instead of hardcoded names.

**Alternatives considered**:
- Compute dynamic nodes in `NetworkGraph` via `useMemo` — cleaner but makes it harder for `useClustering` to use the same category-keyed weights. Centralizing in the store keeps clustering and visualization in sync.

---

## Decision 5: Backward Compatibility of filterWeights Keys

**Decision**: When `activeKeywords` changes and new `dynamicFilterNodes` are generated, preserve existing weight values for any category that was already present. New categories default to weight `0.5`. Old categories that no longer have active keywords are removed.

**Rationale**: Users who have adjusted weights for a category should not lose those settings when they deactivate a keyword temporarily.
