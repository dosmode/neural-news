# Data Model: Graph Overview, Natural UX & Clicked-Node Article Sync

**Feature**: 015-graph-overview-news-sync
**Date**: 2026-06-09

## Entity Changes

### GraphNode (extended — `src/utils/graphTree.ts`)
Add one field for selection-recency tracking.

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| id | string | existing | Keyword slug |
| label | string | existing | Display text |
| depth | number | existing | 0 = root, 1 = child, … |
| parentId | string \| null | existing | Parent id |
| expanded | boolean | existing | Children shown |
| hasChildren | boolean | existing | Has adjacency entry |
| x, y, vx, vy, fx, fy | number | existing | d3 simulation state |
| **selectedAt** | **number** | **NEW** | Monotonic counter; higher = more recently clicked. Drives news priority. |

### Active News Selection (logic, not a stored entity)
The active keyword set for news = live nodes sorted by `selectedAt` descending, capped at `NEWS_ACTIVE_CAP` (8). Replaces the old depth-based sort.

## State Transitions

### Node Click (new unified behavior)
```
[node clicked]
  → node.selectedAt = ++selectionCounter   // becomes most-recent for news
  → if node.hasChildren: toggle expand/collapse (existing logic)
  → if leaf: no expand, but still selected for news
  → syncToStore(liveNodes)                  // recency-capped active set
```

### Initialization (new — default overview)
```
[store has active root keywords AND dims ready AND not yet initialized]
  → build root GraphNodes (radial layout around center)
  → for each root with children: build depth-1 children (seeded near parent)
  → assemble ALL nodes + links in ONE batch
  → roots get higher selectedAt than children (roots lead initial news)
  → setLiveNodes(batch) / setLiveLinks(batch)  // single update
  → syncToStore(batch)                          // single news fetch
  → reheat()
```

### syncToStore (fixed)
```
syncToStore(nodes):
  keywords = nodes.map(id,label)
  activeIds = nodes
      .sort(by selectedAt DESC)        // recency, NOT depth
      .slice(0, NEWS_ACTIVE_CAP)
      .map(id)
  setKeywords(keywords, activeIds)
```

## Derived/View State (local to ForceGraphPanel)

| State | Type | Description |
|-------|------|-------------|
| selectionCounterRef | number (ref) | Monotonic source for `selectedAt` |
| activeNewsIds | Set<string> (derived) | Top-N by selectedAt → drives selected-node ring (FR-012) |

## Validation Rules

- `NEWS_ACTIVE_CAP` (8) unchanged — bounds the OR query size.
- Live node count cap (~60) unchanged.
- Initial auto-expand limited to **depth 1** only (FR-005, FR-011).
- Initial overview must fit within the live-node cap: if roots × children would exceed 60, expand fewer roots (roots themselves always shown).
- A node's `selectedAt` only ever increases (monotonic), so recency ordering is stable.
