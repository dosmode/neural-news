# Quickstart: Inter-Keyword Cross Links

**For developers implementing feature 016-inter-keyword-links**

## What We're Adding

The graph currently shows only **parent→child** (hierarchy) links from expansion, so it reads as a tree. This feature adds **cross-links** between any two live keyword nodes that are related per the adjacency map — turning the tree into a real network (Obsidian-style).

## Files to Change (no new files, no new deps)

```
src/utils/graphTree.ts                     — add `type` to GraphLink; add areRelated + computeCrossLinks + MAX_CROSS_LINKS
src/components/neural/ForceGraphPanel.tsx  — tag hierarchy links; derive crossLinks + allLinks; feed allLinks to sim/render/hover
src/components/neural/GraphLinkView.tsx     — style cross vs hierarchy (dashed/dimmer)
tests/utils/graphTree.test.ts               — tests for areRelated + computeCrossLinks
```

## Implementation Order

1. `graphTree.ts` — `type` field, `areRelated`, `computeCrossLinks`, `MAX_CROSS_LINKS`.
2. `graphTree.test.ts` — related pairs linked, unrelated not, dedup vs hierarchy, cap, no self-links.
3. `ForceGraphPanel.tsx` — tag hierarchy links `type:'hierarchy'`; add `crossLinks`/`allLinks` memos; pass `allLinks` everywhere `liveLinks` was used for sim/render/hover.
4. `GraphLinkView.tsx` — branch styling on `link.type`.

## Key Code Sketches

### areRelated + computeCrossLinks (graphTree.ts)
```typescript
export const MAX_CROSS_LINKS = 40;

export function areRelated(a: string, b: string): boolean {
  if (a === b) return false;
  const aKids = KEYWORD_SUGGESTIONS_MAP[a] ?? [];
  const bKids = KEYWORD_SUGGESTIONS_MAP[b] ?? [];
  return aKids.some((l) => slugify(l) === b) || bKids.some((l) => slugify(l) === a);
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function computeCrossLinks(nodes: GraphNode[], hierarchyLinks: GraphLink[]): GraphLink[] {
  const existing = new Set(
    hierarchyLinks.map((l) => pairKey(
      typeof l.source === 'string' ? l.source : l.source.id,
      typeof l.target === 'string' ? l.target : l.target.id,
    ))
  );
  const out: GraphLink[] = [];
  const ids = nodes.map((n) => n.id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = pairKey(ids[i], ids[j]);
      if (existing.has(key)) continue;
      if (!areRelated(ids[i], ids[j])) continue;
      out.push({ id: `x-${key}`, source: ids[i], target: ids[j], type: 'cross' });
      if (out.length >= MAX_CROSS_LINKS) return out;
    }
  }
  return out;
}
```

### Wiring in ForceGraphPanel.tsx
```typescript
// when creating hierarchy links (expand + buildOverview path), tag them:
{ id: `${node.id}-${c.id}`, source: node.id, target: c.id, type: 'hierarchy' }

const crossLinks = useMemo(() => computeCrossLinks(liveNodes, liveLinks), [liveNodes, liveLinks]);
const allLinks   = useMemo(() => [...liveLinks, ...crossLinks], [liveLinks, crossLinks]);

const { tickVersion, reheat, setFixed } = useForceSimulation({
  width: dims.width, height: dims.height, nodes: liveNodes, links: allLinks,  // ← allLinks
});

// render: liveLinks.map(...) → allLinks.map(...)
// hover neighborIds: iterate allLinks instead of liveLinks
```
> `buildOverview` in graphTree.ts also creates hierarchy links — add `type: 'hierarchy'` there too.

### GraphLinkView.tsx styling
```typescript
const isCross = link.type === 'cross';
// stroke: isCross ? '#bc13fe' : (isHighlighted ? '#00f3ff' : '#ffffff')
// strokeDasharray: isCross ? '3 4' : undefined
// opacity: isDimmed ? 0.06 : isHighlighted ? 0.7 : isCross ? 0.15 : 0.22
// width:   isCross ? 0.7 : (isHighlighted ? 1.6 : 1)
```

## Verification
```bash
npx tsc --noEmit
npm test         # new computeCrossLinks/areRelated tests
npm run dev      # manual:
#   - expand AI + have Semiconductors/Nvidia present → cross link appears (not parent-child)
#   - unrelated nodes → no link
#   - hover a cross-linked node → its cross neighbors light up
#   - collapse a node → its cross links vanish
#   - cross links look different (dashed/dimmer) from hierarchy links
```

## Gotchas
- Build `crossLinks` with `useMemo([liveNodes, liveLinks])` — NOT recomputed per tick (those deps are stable between ticks), so the sim won't restart constantly.
- d3 mutates `link.source`/`target` string→object; `computeCrossLinks` and `pairKey` must handle both forms when reading hierarchy pair keys.
- Pass `allLinks` (not `liveLinks`) to the simulation, the render loop, AND the hover `neighborIds` memo — all three.
- Keep `liveLinks` (hierarchy) as the stored state; cross-links stay derived (never stored) so collapse/remove needs no extra cleanup.
