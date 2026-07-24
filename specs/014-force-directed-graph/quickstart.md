# Quickstart: Obsidian-Style Force-Directed Graph View

**For developers implementing feature 014-force-directed-graph**

## What We're Building

Replacing the current floating keyword panel (`KeywordGraphPanel`, feature 013) with a **real force-directed graph** using `d3-force` (already installed via `d3@7`):
1. Center node rendered in the middle
2. Click a node → children spring outward (physics), click again → collapse
3. Drag any node with the mouse → connected nodes react
4. Hover a node → only directly-connected neighbors/links highlight, rest dim

## Key Insight

**`d3` is already a dependency** — no `npm install` needed. `d3-force` and `d3-drag` are confirmed in `node_modules`. We use d3 for *physics only* and React+SVG for *rendering* (the "d3-for-math, React-for-DOM" pattern, same as the existing `ArticleScatter`).

## Files to Change

### New Files
```
src/
├── components/neural/
│   ├── ForceGraphPanel.tsx     — main panel (replaces KeywordGraphPanel)
│   ├── GraphNodeView.tsx       — single node (circle + label)
│   └── GraphLinkView.tsx       — single SVG link line
├── hooks/
│   └── useForceSimulation.ts   — d3-force lifecycle + tick→state bridge
└── utils/
    └── graphTree.ts            — build node/link tree from KEYWORD_SUGGESTIONS_MAP, expand/collapse helpers
```

### Modified Files
```
src/app/page.tsx               — swap KeywordGraphPanel → ForceGraphPanel
```

### Files to Delete (after parity reached)
```
src/components/neural/KeywordGraphPanel.tsx
src/components/neural/FloatingKeywordNode.tsx
src/components/neural/SuggestionNode.tsx
src/components/neural/GraphEdges.tsx
src/hooks/useKeywordSuggestions.ts   — replaced by graphTree expand logic
```
> Keep `src/services/keywordSuggestions.ts` — its `KEYWORD_SUGGESTIONS_MAP` is the graph's data source.

## Implementation Order

1. `src/utils/graphTree.ts` — pure functions: `buildInitialNodes`, `getChildren`, `collectDescendants`. Unit-testable, no React.
2. `src/hooks/useForceSimulation.ts` — wire `forceSimulation` with `forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`; tick → bump a version counter.
3. `src/components/neural/GraphLinkView.tsx` — SVG `<line>` with highlight/dim props.
4. `src/components/neural/GraphNodeView.tsx` — positioned node with pointer handlers.
5. `src/components/neural/ForceGraphPanel.tsx` — assemble: container + ResizeObserver, live node/link state, click/drag/hover handlers, store sync.
6. `src/app/page.tsx` — swap import.
7. Delete superseded 013 components.

## Core Code Sketches

### Simulation setup (useForceSimulation.ts)
```typescript
const sim = forceSimulation(nodes)
  .force('link', forceLink(links).id((d) => d.id).distance(70))
  .force('charge', forceManyBody().strength(-220))
  .force('center', forceCenter(width / 2, height / 2))
  .force('collide', forceCollide(28));
sim.on('tick', () => setTickVersion(v => v + 1)); // re-render from mutated x/y
```

### Expand on click (ForceGraphPanel.tsx)
```typescript
function expand(node) {
  const children = getChildren(node.id);     // from graphTree
  children.forEach(c => { c.x = node.x; c.y = node.y; }); // start at parent → springs out
  setLiveNodes(prev => [...prev, ...children]);
  setLiveLinks(prev => [...prev, ...children.map(c => ({ id:`${node.id}-${c.id}`, source: node.id, target: c.id }))]);
  reheat();
  syncActiveKeywords();
}
```

### Drag (d3-drag or pointer events)
```typescript
onPointerMove: if moved > 4px → node.fx = px; node.fy = py; reheat();
onPointerUp:   if moved < 4px → toggleExpand(node); else node.fx = node.fy = null;
```

### Hover highlight
```typescript
const neighbors = useMemo(() => computeNeighborIds(hoveredId, liveLinks), [hoveredId, liveLinks]);
// node dimmed if hoveredId && !neighbors.has(node.id) && node.id !== hoveredId
```

## Verification
```bash
npx tsc --noEmit       # 0 errors
npm test               # graphTree unit tests pass
npm run dev            # manual: click center → springs out; drag; hover dims others
```

## Gotchas
- d3 mutates `link.source`/`link.target` from string id → node object after first tick. Read positions via `link.source.x`, not the original string.
- Don't recreate the simulation on every render — own it in a `useRef`, update nodes/links imperatively.
- Stop reading from `useKeywordSuggestions` hook (013) — the new graph drives expansion itself.
- Keep active-keyword → store sync so `useGdeltFetch` still fetches news for adopted keywords (FR-013 / SC-007).
