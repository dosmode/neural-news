# UI Contract: Graph Overview & News Sync Changes

**Feature**: 015-graph-overview-news-sync
**Modifies**: `src/components/neural/ForceGraphPanel.tsx`, `src/components/neural/GraphNodeView.tsx`, `src/hooks/useForceSimulation.ts`, `src/utils/graphTree.ts`

## Changed Behaviors

### `syncToStore(nodes)` — recency priority (FR-001, FR-002, FR-003)
```typescript
// BEFORE: sort((a,b) => a.depth - b.depth).slice(0, 8)   ← roots win, clicked child dropped
// AFTER:  sort((a,b) => b.selectedAt - a.selectedAt).slice(0, 8)   ← most recently clicked win
```

### `toggleNode(id)` → `selectNode(id)` (FR-001, FR-004)
| Input | Expected |
|-------|----------|
| Click node with children | Bump `selectedAt`; toggle expand/collapse; syncToStore |
| Click leaf node | Bump `selectedAt`; no expand; syncToStore (news still updates) |
| Collapse / remove node | Node leaves live set; syncToStore re-derives active set |

### Initialization → default overview (FR-005, FR-006, FR-011)
| Input | Expected |
|-------|----------|
| First load, store has root keywords | Build roots + their depth-1 children in ONE batch; single news fetch |
| After overview shown | Clicking a root toggles its children normally (expand/collapse still works) |
| Roots × children > 60 | Cap respected; some roots remain collapsed; roots always visible |

### Layout seeding (FR-007, SC-004)
| Input | Expected |
|-------|----------|
| Roots created | Positioned on a circle around panel center (even angular spacing) |
| Children created | Seeded near parent with small outward offset |

## Changed Component Props / Signatures

### `GraphNodeView` — add selected indicator (FR-012)
```typescript
interface GraphNodeViewProps {
  node: GraphNode;
  isHovered: boolean;
  isNeighborDimmed: boolean;
  isSelected: boolean;          // NEW: in the active news set → show accent ring
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerEnter: (id: string) => void;
  onPointerLeave: () => void;
}
```

### `useForceSimulation` — gentler settling (FR-008, FR-009, FR-010, SC-005)
```typescript
// Add centering + friction tuning inside the hook:
//   forceX(width/2).strength(0.04), forceY(height/2).strength(0.04)
//   simulation.velocityDecay(0.45)
//   forceCollide(radius).strength(~0.8)
// Signature unchanged — internal tuning only.
```

## Behavior ↔ Requirement Map

| Requirement | Where |
|-------------|-------|
| FR-001 clicked node → news filter | `selectNode` bumps selectedAt + syncToStore |
| FR-002 depth-agnostic reflection | recency sort (no depth bias) |
| FR-003 recent-first priority | `sort(b.selectedAt - a.selectedAt)` |
| FR-004 deselect on collapse/remove | syncToStore re-derives after node removal |
| FR-005 default overview | batch depth-1 auto-expand on init |
| FR-006 toggle still works after overview | expand/collapse unchanged on already-expanded roots |
| FR-007 even distribution | radial seeding + centering forces |
| FR-008 smooth expand/collapse | children seeded at parent; tuned alpha/friction |
| FR-009 responsive drag | existing fx/fy drag + reheat |
| FR-010 smooth hover | CSS opacity transitions on node + link |
| FR-011 no fetch flood on init | single batched syncToStore |
| FR-012 selected indicator | `isSelected` accent ring in GraphNodeView |
