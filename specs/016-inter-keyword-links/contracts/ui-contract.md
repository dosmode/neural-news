# UI Contract: Inter-Keyword Cross Links

**Feature**: 016-inter-keyword-links
**Modifies**: `src/utils/graphTree.ts`, `src/components/neural/ForceGraphPanel.tsx`, `src/components/neural/GraphLinkView.tsx`

## New / Changed Signatures

### graphTree.ts
```typescript
export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type?: 'hierarchy' | 'cross';   // NEW
}

export const MAX_CROSS_LINKS = 40;

export function areRelated(idA: string, idB: string): boolean;
export function computeCrossLinks(nodes: GraphNode[], hierarchyLinks: GraphLink[]): GraphLink[];
```

### ForceGraphPanel.tsx (internal)
```typescript
// hierarchy links keep living in state, now explicitly tagged:
{ id, source, target, type: 'hierarchy' }

const crossLinks = useMemo(
  () => computeCrossLinks(liveNodes, liveLinks),
  [liveNodes, liveLinks]
);
const allLinks = useMemo(() => [...liveLinks, ...crossLinks], [liveLinks, crossLinks]);

// allLinks is passed to:
useForceSimulation({ width, height, nodes: liveNodes, links: allLinks });
// rendered links iterate allLinks
// neighborIds hover computation iterates allLinks
```

### GraphLinkView.tsx
```typescript
// reads link.type to branch styling — no prop signature change required
// (component already receives `link`, `isHighlighted`, `isDimmed`)
```

## Behavior ↔ Requirement Map

| Requirement | Where |
|-------------|-------|
| FR-001 related live nodes get a link | `computeCrossLinks` over live node pairs |
| FR-002 relation from adjacency data | `areRelated` via `KEYWORD_SUGGESTIONS_MAP` |
| FR-003 new node → cross links update | derived via `useMemo` on `liveNodes` |
| FR-004 removed node → its cross links go | derivation only over live nodes |
| FR-005 no duplicate hierarchy+cross | dedup against hierarchy pair keys |
| FR-006 cross links affect physics | merged into `allLinks` → `forceLink` |
| FR-007 hover highlights cross neighbors | `neighborIds` iterates `allLinks` |
| FR-008 visual distinction | `GraphLinkView` branches on `link.type` |
| FR-009 smoothness preserved | memoized derivation, no recompute on tick |
| FR-010 density control | `MAX_CROSS_LINKS` cap + lighter cross styling |

## Visual Contract

| Link type | Style |
|-----------|-------|
| hierarchy | solid, current neon/white, opacity ~0.22 (highlighted brighter) |
| cross | dashed, muted purple (#bc13fe-ish), lower opacity (~0.15), thinner |
| hovered (either type, connected to hovered node) | brightened |
| dimmed (any, when another node hovered) | opacity ~0.06 |
