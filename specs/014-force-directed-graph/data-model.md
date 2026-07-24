# Data Model: Obsidian-Style Force-Directed Graph View

**Feature**: 014-force-directed-graph
**Date**: 2026-06-09

## Entities

### GraphNode (new — local view model)
Represents one keyword point in the graph. Lives in the graph component, augmented in-place by the d3 simulation.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Stable keyword slug (reuses existing `slugify`) |
| label | string | Display keyword text |
| depth | number | 0 = center/root, 1 = child, 2 = grandchild, … |
| parentId | string \| null | Parent node id; null for root nodes |
| expanded | boolean | Whether this node's children are currently shown |
| hasChildren | boolean | Whether the adjacency map has any children for this id |
| x, y | number | Current position (written by d3 simulation each tick) |
| vx, vy | number | Velocity (managed by d3 simulation) |
| fx, fy | number \| null | Fixed position during drag (null = free) |

### GraphLink (new — local view model)
Represents an edge between a parent and child node.

| Field | Type | Description |
|-------|------|-------------|
| id | string | `${source}-${target}` |
| source | string \| GraphNode | Parent node (d3 mutates string → object ref) |
| target | string \| GraphNode | Child node |

### GraphViewState (new — local component state)
Ephemeral interaction state, not persisted, not in Zustand.

| Field | Type | Description |
|-------|------|-------------|
| liveNodes | GraphNode[] | Nodes currently in the simulation (root + expanded subtrees) |
| liveLinks | GraphLink[] | Links among live nodes |
| hoveredId | string \| null | Node currently hovered (drives neighbor highlight) |
| draggingId | string \| null | Node currently being dragged |

### Reused: KeywordDef / activeKeywords (existing Zustand store)
No schema change required. The graph syncs its expanded/adopted keyword set into the existing `keywords` / `activeKeywords` so `useGdeltFetch` continues to filter news.

## Data Source: Keyword Adjacency Tree

Reuses `KEYWORD_SUGGESTIONS_MAP` from `src/services/keywordSuggestions.ts`.

```
"ai" → ["Machine Learning", "OpenAI", "Nvidia", "Deep Learning", ...]
"deep-learning" → [...]   // grandchildren when "Deep Learning" is expanded
```

The map already provides parent → children adjacency. The graph treats a keyword id as a node and its mapped labels as child nodes (lazily instantiated on expand).

## State Transitions

### Node Expand/Collapse
```
[collapsed node clicked]
  → expanded = true
  → instantiate child GraphNodes (start at parent x,y + jitter)
  → add child nodes + parent→child links to liveNodes/liveLinks
  → simulation.alpha(0.3).restart()   // spring outward
  → sync newly active keyword ids → Zustand activeKeywords

[expanded node clicked]
  → expanded = false
  → recursively collect all descendant ids
  → remove descendants from liveNodes/liveLinks
  → simulation nodes/links updated, alpha re-heated
  → sync removed keyword ids out of Zustand activeKeywords
```

### Drag
```
[pointerdown on node] → record start pos
[pointermove > 4px]   → draggingId = node.id; node.fx/fy = pointer; alphaTarget(0.3)
[pointerup]           → node.fx/fy = null; alphaTarget(0); draggingId = null
[pointerup within 4px movement] → treat as click → expand/collapse toggle
```

### Hover
```
[mouseenter node] → hoveredId = node.id  → compute neighbor id set → dim non-neighbors
[mouseleave node] → hoveredId = null      → restore all opacities
```

## Validation Rules

- Live node count capped at ~60 (performance; SC-002).
- A node with no entry in the adjacency map has `hasChildren = false` → clicking shows a subtle "no further connections" affordance (no expand).
- Collapsing the root collapses the entire tree back to the root node.
- Expand depth supported to at least 3 levels (SC-005).
- Duplicate child labels already present as live nodes are skipped (no duplicate nodes).
