# Implementation Plan: Article Dot Visualization & Keyword Layer Fix

**Branch**: `004-article-dot-layer-fix` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-article-dot-layer-fix/spec.md`

## Summary

Fix two compounding bugs that prevent article dots from rendering (D3 forceSimulation mutates Zustand store articles causing off-screen drift; NetworkGraph uses hardcoded hidden layer nodes). Replace hardcoded filter nodes with dynamically generated nodes derived from active keywords via a keyword-to-category map. After the fix, every fetched article will appear as exactly one colored dot whose position reflects keyword relevance, and hidden layer nodes will automatically reflect the current keyword context.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 14 (App Router), React 18, Zustand 4, React Flow 11, D3.js 7, Framer Motion 11, fast-xml-parser

**Storage**: Client-side in-memory only (Zustand store); server-side in-memory cache in Next.js API route (no persistent DB)

**Testing**: No test suite currently exists; unit tests for `calculateClustering` and integration-level smoke tests required per constitution

**Target Platform**: Web browser, desktop landscape (1280px+ viewport width)

**Project Type**: Next.js 14 web application (App Router, server components + client components)

**Performance Goals**: Article dots visible within 5 seconds of page load (SC-001); hidden layer reclassification within 3 seconds of keyword toggle (SC-003)

**Constraints**: Google News RSS rate-limiting enforced (3s server cooldown, 6s client cooldown); desktop-only layout; no external database; no build-time data

**Scale/Scope**: Single-user browser app; 10–50 articles per fetch; 5 keyword nodes; up to 4 dynamic hidden nodes per layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Visualization requires horizontal space; mobile deferred to a future feature per spec assumptions |
| II. High Performance & Fast Loading | ✅ Pass | SC-001 (5s dots visible) and SC-003 (3s reclassification) enforced in requirements |
| III. Data Privacy & Security | ✅ Pass | No user data collected; only public RSS feeds consumed |
| IV. Component-Based Architecture | ✅ Pass | Changes encapsulated within existing files; new logic in existing hooks/utils |
| V. Continuous Automated Testing | ⚠️ Action Required | Unit tests for `calculateClustering` must be added (tasks included in plan) |
| Technology Stack | ✅ Pass | React/TypeScript + Next.js API routes = aligned with React/Node.js mandate |

## Project Structure

### Documentation (this feature)

```text
specs/004-article-dot-layer-fix/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── gdelt-api.md     ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/gdelt/route.ts           (no changes)
│   └── page.tsx                     (no changes)
├── components/
│   ├── graph/
│   │   ├── NetworkGraph.tsx          CHANGED: read dynamic nodes from store
│   │   ├── KeywordNode.tsx           (no changes)
│   │   ├── FilterNode.tsx            (no changes)
│   │   └── WeightEdge.tsx            (no changes)
│   ├── map/
│   │   └── CurationMap.tsx           CHANGED: keep last-known dots visible during loading
│   └── shared/
│       └── ArticleList.tsx           (no changes — already synced to store)
├── hooks/
│   ├── useClustering.ts              CHANGED: pass cloned articles to calculateClustering
│   └── useGdeltFetch.ts             (no changes)
├── services/
│   └── gdeltService.ts              (no changes)
├── store/
│   └── useStore.ts                   CHANGED: add dynamicFilterNodes + updated toggleKeyword
└── utils/
    └── clustering.ts                 CHANGED: deduplicate + clone before D3 simulation

tests/
└── utils/
    └── clustering.test.ts            NEW: unit tests for calculateClustering
```

**Structure Decision**: Single Next.js project. All changes are in existing files. One new test file. No new directories except `tests/utils/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Mobile-first exception | Desktop 3-column neural-network metaphor requires landscape viewport | Stacking columns vertically on mobile destroys the input→hidden→output flow that is the core UX |

---

## Implementation Phases

### Phase A: Fix Core Visualization Bugs (prerequisite for everything else)

**Files**: `src/utils/clustering.ts`, `src/hooks/useClustering.ts`, `src/components/map/CurationMap.tsx`

**A1 — Fix D3 mutation in `calculateClustering`**

In `src/utils/clustering.ts`, deduplicate articles by URL and shallow-clone each article before passing to D3:

```
const uniqueArticles = Array.from(new Map(sourceArticles.map(a => [a.url, a])).values());
const dataToSimulate = uniqueArticles.map(a => ({ ...a }));
```

D3 adds `x`, `y`, `vx`, `vy` to the clones. The original store articles are never touched. Position starts at `(width/2, height/2)` for all articles since clones always have `x = undefined`.

**A2 — Keep last-known dots visible during loading in `CurationMap.tsx`**

Change the rendering condition from `!isLoading && points.map(...)` to always render the current `points` array, but reduce dot opacity to 40% while `isLoading`. This prevents the "blank screen during re-fetch" UX issue.

```jsx
// Before:
{!isLoading && points.map(...)}

// After:
{points.map(point => (
  <motion.div
    ...
    style={{ opacity: isLoading ? 0.4 : 1 }}
    ...
  />
))}
```

---

### Phase B: Dynamic Hidden Layer Node Generation

**Files**: `src/store/useStore.ts`, `src/components/graph/NetworkGraph.tsx`

**B1 — Add `KEYWORD_CATEGORY_MAP` and `computeDynamicFilterNodes` to store**

In `src/store/useStore.ts`:

```typescript
const KEYWORD_CATEGORY_MAP: Record<string, string> = {
  'nvda': 'Semiconductors',
  'tsmc': 'Semiconductors',
  'ai-trend': 'AI & Technology',
  'fed-rate': 'Monetary Policy',
  'us-china': 'Geopolitics',
};

function computeDynamicFilterNodes(activeKeywords: Set<string>): DynamicFilterNode[] {
  // Layer 1: unique categories from active keywords
  const categories = new Set(
    Array.from(activeKeywords).map(kw => KEYWORD_CATEGORY_MAP[kw] ?? 'General')
  );
  const layer1 = Array.from(categories).slice(0, 4).map(cat => ({
    id: cat, label: cat, layer: 1 as const
  }));

  // Layer 2: fixed structural filters
  const layer2: DynamicFilterNode[] = [
    { id: 'sentiment', label: 'Sentiment', layer: 2 },
    { id: 'recency', label: 'Recency', layer: 2 },
    { id: 'relevance', label: 'Relevance', layer: 2 },
  ];

  return [...layer1, ...layer2];
}
```

Add `dynamicFilterNodes: DynamicFilterNode[]` to `AppState` (initialized from default `activeKeywords`).

Update `toggleKeyword` to recompute `dynamicFilterNodes` and sync `filterWeights`:

```typescript
toggleKeyword: (id) => set((state) => {
  const newKeywords = new Set(state.activeKeywords);
  if (newKeywords.has(id)) newKeywords.delete(id);
  else newKeywords.add(id);

  const newNodes = computeDynamicFilterNodes(newKeywords);
  const newWeights: Record<string, number> = {};
  newNodes.forEach(node => {
    newWeights[node.id] = state.filterWeights[node.id] ?? 0.5;
  });

  return {
    activeKeywords: newKeywords,
    dynamicFilterNodes: newNodes,
    filterWeights: newWeights,
  };
}),
```

**B2 — Refactor `NetworkGraph.tsx` to read dynamic nodes from store**

Remove the hardcoded `initialNodes` and `initialEdges` arrays. Instead, read `dynamicFilterNodes` from the store and compute React Flow nodes/edges reactively:

```typescript
const activeKeywords = useStore(s => s.activeKeywords);
const dynamicFilterNodes = useStore(s => s.dynamicFilterNodes);
```

Generate input layer nodes from the hardcoded keyword list (these remain fixed — the user selects from a fixed keyword palette). Generate hidden layer edges by fully connecting input nodes to Layer 1 nodes, and Layer 1 nodes to Layer 2 nodes.

The `useMemo` for nodes and edges depends on `[activeKeywords, dynamicFilterNodes]` to avoid unnecessary re-renders.

---

### Phase C: Automated Tests

**Files**: `tests/utils/clustering.test.ts` (new)

Write unit tests covering:
1. `calculateClustering` returns exactly one `MappedPoint` per input article
2. `calculateClustering` does not mutate the input article objects
3. `calculateClustering` deduplicates articles with the same URL
4. `calculateClustering` returns empty array for empty input
5. All returned points have `x` and `y` within the provided `[width, height]` bounds (after simulation)

---

## Post-Design Constitution Re-check

After Phase 1 design:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Unchanged — documented in Complexity Tracking |
| II. High Performance & Fast Loading | ✅ Pass | Shallow-clone is O(n) where n ≤ 50; negligible overhead |
| III. Data Privacy & Security | ✅ Pass | No change to data handling |
| IV. Component-Based Architecture | ✅ Pass | Changes are localized; `computeDynamicFilterNodes` is a pure function |
| V. Continuous Automated Testing | ✅ Pass | Unit tests for `calculateClustering` included in Phase C |
| Technology Stack | ✅ Pass | No new dependencies introduced |

All gates pass post-design.
