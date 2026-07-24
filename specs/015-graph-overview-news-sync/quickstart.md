# Quickstart: Graph Overview, Natural UX & Clicked-Node Article Sync

**For developers implementing feature 015-graph-overview-news-sync**

## What We're Fixing/Improving

Refinement of the force-directed graph (feature 014). Three changes:
1. **🐞 Bug fix**: clicked related nodes don't reach the article results → make news priority **recency-based**, not depth-based.
2. **Default overview**: on load, auto-expand each root one level so the whole structure shows.
3. **Natural UX**: tune the physics (centering, friction, collision) + radial seeding so motion is smooth and nodes don't pile up.

## Root Cause of the Bug

`src/components/neural/ForceGraphPanel.tsx`, `syncToStore`:
```typescript
const activeIds = nodes
  .sort((a, b) => a.depth - b.depth)   // ← roots always win
  .slice(0, NEWS_ACTIVE_CAP)            // ← clicked deep node gets cut
  .map((n) => n.id);
```
A clicked child (depth ≥1) never enters the 8-keyword news query when roots fill the cap.

## Files to Change

```
src/utils/graphTree.ts                    — add `selectedAt` to GraphNode; helper to build depth-1 overview
src/components/neural/ForceGraphPanel.tsx — recency syncToStore; selectNode (click = select + maybe expand);
                                            batch overview init; radial seeding; selected-ring wiring
src/components/neural/GraphNodeView.tsx    — add `isSelected` accent ring
src/hooks/useForceSimulation.ts            — forceX/forceY centering + velocityDecay + collide strength
```

No new files. No new dependencies.

## Implementation Order

1. `graphTree.ts` — add `selectedAt: number` to `GraphNode`; add `buildOverview(activeRootDefs, dims)` that returns `{ nodes, links }` for roots + depth-1 children with radial seeding.
2. `useForceSimulation.ts` — add centering forces + friction (internal only).
3. `ForceGraphPanel.tsx` — recency `syncToStore`; rename/extend `toggleNode` → `selectNode`; batch init via `buildOverview`; derive `activeNewsIds`; pass `isSelected`.
4. `GraphNodeView.tsx` — render the selected accent ring when `isSelected`.

## Key Code Sketches

### Recency sync (the fix)
```typescript
const syncToStore = useCallback((nodes: GraphNode[]) => {
  const keywords = nodes.map((n) => ({ id: n.id, label: n.label }));
  const activeIds = nodes
    .slice()
    .sort((a, b) => (b.selectedAt ?? 0) - (a.selectedAt ?? 0))  // recency, not depth
    .slice(0, NEWS_ACTIVE_CAP)
    .map((n) => n.id);
  setKeywords(keywords, activeIds);
}, [setKeywords]);
```

### Click = select (+ maybe expand)
```typescript
const selectionCounter = useRef(0);
const selectNode = useCallback((id: string) => {
  const node = liveNodes.find((n) => n.id === id);
  if (!node) return;
  node.selectedAt = ++selectionCounter.current;   // most recent → leads news
  if (node.hasChildren) { /* existing expand/collapse */ }
  // even leaf nodes fall through to syncToStore below
  syncToStore(liveNodes /* or the post-expand array */);
  reheat();
}, [liveNodes, liveLinks, dims, reheat, syncToStore]);
```

### Batch overview init
```typescript
const { nodes, links } = buildOverview(activeRootDefs, dims); // roots + depth-1 children
// roots get higher selectedAt than children so roots lead initial news
setLiveNodes(nodes);
setLiveLinks(links);
syncToStore(nodes);  // ONE fetch
reheat();
```

### Radial seeding (buildOverview)
```typescript
roots.forEach((r, i) => {
  const angle = (i / roots.length) * Math.PI * 2;
  r.x = cx + Math.cos(angle) * radius;
  r.y = cy + Math.sin(angle) * radius;
});
// children seeded near their parent + small outward offset
```

### Simulation tuning (useForceSimulation)
```typescript
.force('x', forceX(width / 2).strength(0.04))
.force('y', forceY(height / 2).strength(0.04))
// ...
sim.velocityDecay(0.45);             // more friction → glides to rest
forceCollide(COLLIDE_RADIUS).strength(0.85);
```

## Verification
```bash
npx tsc --noEmit          # 0 errors
npm test                  # graphTree tests (update for selectedAt/buildOverview)
npm run dev               # manual:
#   - on load: roots + first-level nodes already spread out, no pile-up
#   - click a child node → its articles appear on the right within ~2s
#   - click a deep node → still reflected (not dropped for roots)
#   - drag/hover feel smooth, nodes don't overlap
```

## Gotchas
- Build the overview in ONE state update — don't loop `selectNode` per root (that fires N news fetches; the GDELT route has a 6s cooldown).
- Keep `selectedAt` monotonic; never reset it on re-render.
- The store's `setKeywords` marks `hydrated: true` and `useKeywordInit` persists — initialize the graph from the store once (guard with the existing `initializedRef`).
- Recency sort must read `selectedAt` from the SAME node objects d3 mutates — set it in place, not via spread that drops it.
