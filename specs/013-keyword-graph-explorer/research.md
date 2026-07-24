# Research: Floating Keyword Graph Explorer

**Feature**: 013-keyword-graph-explorer
**Date**: 2026-06-09

## Decision Log

### D-001: Floating Animation Approach

**Decision**: Framer Motion `animate` + `transition` with randomized continuous drift per node.

**Rationale**: Framer Motion is already installed (`framer-motion@^12.40.0`). Each node receives randomized x/y delta arrays that loop indefinitely, creating an organic floating effect. This avoids adding D3 force simulation complexity for a purely visual concern.

**Alternatives considered**:
- D3 force simulation: More physically accurate, but adds ~5KB overhead and complex imperative code for what is essentially a visual effect. Overkill at panel scale (≤15 nodes in 360px).
- CSS keyframes: Less flexible for per-node randomization; can't easily vary duration/amplitude per node.

---

### D-002: Keyword Suggestion Algorithm

**Decision**: Curated static adjacency map (`KEYWORD_SUGGESTIONS_MAP: Record<string, string[]>`) in `src/services/keywordSuggestions.ts`.

**Rationale**: The project already follows this pattern — `KEYWORD_CATEGORY_MAP` in `useStore.ts` and `TRENDING_POOL` in `trendingService.ts` are both curated static data. No external AI/recommendation API is available. The suggestion map can cover all keywords in `TRENDING_POOL` plus common user-entered topics with meaningful related terms.

**Alternatives considered**:
- Live GDELT co-occurrence: Would require additional API calls and server processing; adds latency; GDELT is already rate-limited.
- Claude API integration: Out of scope per spec assumptions; no backend AI endpoint exists.

---

### D-003: Node Position Management

**Decision**: Each node stores a `(baseX, baseY)` position assigned at creation time (random within panel bounds with padding), plus Framer Motion handles the continuous drift offset independently. Collision avoidance is soft — new nodes are placed in the least-occupied quadrant.

**Rationale**: With a max of 8 keywords + ~6 suggestions per keyword = ~56 potential nodes visible at once, but in practice the panel shows ~10-20 nodes at a time (most suggestions are dismissed or collapsed). Simple quadrant placement avoids visible overlaps at creation time.

**Alternatives considered**:
- Full force-directed layout: More correct, but requires D3 force simulation and defeats the "floating freely" aesthetic where nodes drift on their own.

---

### D-004: Suggestion Lifecycle

**Decision**: Suggestions are stored in Zustand state as `SuggestionDef[]` with `sourceKeywordId`, `isVisible`, and `isDismissed` flags. When a suggestion is accepted, it becomes a full `KeywordDef` with `parentId` tracking (for cascading removal). Dismissed suggestions are filtered out client-side but not re-shown.

**Rationale**: Keeping suggestions in global store (not component-local state) allows the panel to re-render correctly when keywords are toggled/removed from elsewhere.

---

### D-005: Graph Edge Rendering

**Decision**: SVG overlay with animated dashed lines connecting parent keyword nodes to their derived suggestion nodes. Uses the same pattern as existing `NeuralPanel.tsx` (SVG `path` with `strokeDasharray` and CSS `animate-neural-flow`).

**Rationale**: Consistency with existing visual language. Reuses existing animation class. SVG is GPU-composited when using `will-change: transform` on parent.

---

### D-006: Store Modifications

**Decision**: Extend `AppState` with:
- `suggestions: SuggestionDef[]` — all active suggestions
- `addSuggestions(sourceId, labels)` — called after keyword added
- `acceptSuggestion(id)` — promotes suggestion to keyword, triggers new suggestions
- `dismissSuggestion(id)` — hides suggestion permanently

**Rationale**: Suggestions need global state because multiple components could theoretically reference them. Keeps the same Zustand pattern as existing keyword actions.

---

### D-007: Constitution Conflict Resolution (Mobile-First)

**Conflict**: Constitution Principle I requires mobile-first design. The spec explicitly defers mobile support.

**Resolution**: The `KeywordGraphPanel` will be built with the same responsive CSS classes as `NeuralPanel` — `w-full h-[300px]` on mobile, `lg:w-[360px] lg:h-auto` on desktop. The floating animation will still work on mobile (nodes just drift within the narrower panel). Full mobile UX optimization (touch gestures, tap targets) is deferred per the spec assumption, but the component will not break on mobile.
