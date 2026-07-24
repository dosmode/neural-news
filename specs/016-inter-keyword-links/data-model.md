# Data Model: Inter-Keyword Cross Links

**Feature**: 016-inter-keyword-links
**Date**: 2026-06-09

## Entity Changes

### GraphLink (extended — `src/utils/graphTree.ts`)
Add a link-type discriminator.

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| id | string | existing | Unique link id |
| source | string \| GraphNode | existing | Endpoint (d3 mutates string→object) |
| target | string \| GraphNode | existing | Endpoint |
| **type** | **'hierarchy' \| 'cross'** | **NEW (optional)** | `hierarchy` = parent→child from expansion; `cross` = related-keyword association. Absent = treated as hierarchy. |

### Cross Link (derived — not stored)
A `GraphLink` with `type: 'cross'` produced by `computeCrossLinks`. Not persisted in state; recomputed from live nodes.

## New Pure Function (graphTree.ts)

```typescript
// Returns cross-links among the live nodes, excluding pairs already joined by a
// hierarchy link, deduped by unordered pair, capped at MAX_CROSS_LINKS.
computeCrossLinks(nodes: GraphNode[], hierarchyLinks: GraphLink[]): GraphLink[]

// Helper: are two keyword ids related per the adjacency map (bidirectional union)?
areRelated(idA: string, idB: string): boolean
```

### `areRelated(a, b)` rule
```
true if  KEYWORD_SUGGESTIONS_MAP[a]?.some(label => slugify(label) === b)
      OR KEYWORD_SUGGESTIONS_MAP[b]?.some(label => slugify(label) === a)
```

### `computeCrossLinks` algorithm
```
existingPairs = set of unordered "min|max" keys from hierarchyLinks
result = []
for each unordered pair (a, b) of live node ids:
    if pairKey(a,b) in existingPairs: continue        // FR-005 dedup
    if not areRelated(a, b): continue                 // FR-002
    result.push({ id: `x-${pairKey}`, source: a, target: b, type: 'cross' })
    if result.length >= MAX_CROSS_LINKS: break        // FR-010 density cap
return result
```

## Derived View State (ForceGraphPanel)

| State | Type | Description |
|-------|------|-------------|
| crossLinks | GraphLink[] (useMemo) | `computeCrossLinks(liveNodes, liveLinks)`, recomputed on structural change |
| allLinks | GraphLink[] (useMemo) | `[...liveLinks, ...crossLinks]` — fed to simulation, render, and hover neighbor computation |

## State Transitions

```
[node expanded / added]   → liveNodes changes → crossLinks recomputed → allLinks updated → sim + render reflect new cross links
[node collapsed / removed]→ liveNodes shrinks → crossLinks recomputed (lost-node pairs gone) → cross links to it disappear (FR-004)
[simulation tick]         → liveNodes array identity unchanged → crossLinks NOT recomputed (perf, FR-009)
```

## Validation Rules

- Hierarchy links always tagged `type: 'hierarchy'` when created (FR-008 distinction).
- A pair with a hierarchy link never also gets a cross link (FR-005).
- Cross-link endpoints must both be live nodes (derivation only iterates live nodes).
- Total cross-links ≤ `MAX_CROSS_LINKS` (FR-010).
- `areRelated(a, a)` must be false (no self-links).
