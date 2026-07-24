# UI Contract: ForceGraphPanel

**Feature**: 014-force-directed-graph
**Replaces**: `src/components/neural/KeywordGraphPanel.tsx` (and its child node components)

## Component Interface

### `ForceGraphPanel`
Drop-in replacement for the current left panel. Same prop signature as `KeywordGraphPanel`.

```typescript
interface ForceGraphPanelProps {
  className?: string;
  style?: React.CSSProperties;
}
```

### `useForceSimulation` (hook)
Encapsulates the d3-force lifecycle.

```typescript
interface UseForceSimulationParams {
  width: number;
  height: number;
  nodes: GraphNode[];   // live nodes (mutated in place by sim)
  links: GraphLink[];   // live links
}

interface UseForceSimulationResult {
  // positions tick snapshot, version counter to trigger re-render
  tickVersion: number;
  // imperative controls
  reheat: () => void;            // alpha(0.3).restart()
  setFixed: (id: string, x: number | null, y: number | null) => void;
}
```

### `GraphNodeView` (presentational)
```typescript
interface GraphNodeViewProps {
  node: GraphNode;
  isHovered: boolean;
  isNeighborDimmed: boolean;   // true when another node is hovered and this isn't a neighbor
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerEnter: (id: string) => void;
  onPointerLeave: () => void;
}
```

### `GraphLinkView` (presentational, SVG)
```typescript
interface GraphLinkViewProps {
  link: GraphLink;
  isHighlighted: boolean;   // connected to hovered node
  isDimmed: boolean;        // another node hovered, this link not connected
}
```

## Behavior Contract

| Action | Expected Response | Maps to |
|--------|-------------------|---------|
| Render | Center/root node appears in middle of panel | FR-001 |
| Idle | Nodes settle via physics, no overlap | FR-002 |
| Click collapsed node | Children spring outward with animation | FR-003 |
| Click expanded node | Children (+ descendants) collapse inward and disappear | FR-004 |
| Click child node | Its children expand (multi-level) | FR-005 |
| — | Parent↔child links drawn as lines | FR-006 |
| Drag node | Node follows pointer | FR-007 |
| Drag node | Connected nodes/links react physically | FR-008 |
| Hover node | Only directly-connected nodes/links highlighted, rest dimmed | FR-009 |
| Leave hover | All opacities restored | FR-010 |
| — | Node with collapsed children shows an expand affordance | FR-011 |
| Click vs drag | <4px movement = click; ≥4px = drag (no toggle) | FR-012 |
| Expand/collapse | Active keyword set syncs to store; news feed updates | FR-013 |

## Visual Contract

| Element | Style |
|---------|-------|
| Root node | Larger, neon-blue glow, always visible |
| Expanded node | Neon-blue, solid |
| Collapsed-with-children node | Neon-purple ring / dot indicator |
| Leaf node (no children) | Dim white |
| Link (default) | Thin line, low opacity (~0.25) |
| Link (hover-highlighted) | Brighter, neon accent |
| Dimmed (non-neighbor on hover) | opacity ~0.15 |

## State Dependencies

**Reads from store**: `keywords`, `activeKeywords`, `isLoading`
**Writes to store**: `addKeyword` / `removeKeyword` (or equivalent active-set sync) so `useGdeltFetch` reacts
**Local only**: positions, velocities, hoveredId, draggingId, expanded flags
