# Research: Obsidian-Style Force-Directed Graph View

**Feature**: 014-force-directed-graph
**Date**: 2026-06-09

## Decision Log

### D-001: Visualization Library Selection

**Decision**: `d3-force` (physics simulation) + custom SVG rendering in React, with `d3-drag` for node dragging. No new dependency.

**Rationale**:
- `d3@^7.9.0` is **already a project dependency** (used in `ArticleScatter`, `clustering.ts`, `sentimentField.ts`). `d3-force` and `d3-drag` ship inside it and are confirmed present in `node_modules`.
- The project already renders SVG graphs by hand (see existing `GraphEdges.tsx` and `ArticleScatter.tsx`), so a custom React+SVG renderer fits the established pattern.
- Full control over node/link styling to match the existing neon/dark design language — no fighting a canvas library's default look.

**Alternatives considered**:
| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **react-force-graph** | Turnkey force graph, Canvas/WebGL, built-in drag & zoom | New ~100KB+ dependency; Canvas rendering makes neon CSS theming hard; less control over per-node React styling | Rejected — adds weight, theming friction |
| **Cytoscape.js** | Powerful graph analysis, many layouts | Heavy (~1MB), imperative API, own styling DSL, overkill for a keyword tree | Rejected — too heavy |
| **Vis.js Network** | Easy network rendering | Canvas-based, dated API, theming friction | Rejected |
| **d3-force + custom SVG** | Zero new deps, full styling control, matches existing patterns | Must wire simulation tick → React state ourselves | **Chosen** |

**Learning curve note**: `d3-force` simulation lifecycle (`forceSimulation`, `forceManyBody`, `forceLink`, `forceCenter`, `tick`) is the main concept. Manageable since the team already uses d3 scales/selection elsewhere.

---

### D-002: Simulation ↔ React State Bridge

**Decision**: Run the `d3-force` simulation imperatively inside a `useRef`, and on each `tick` write node positions into a React state snapshot (throttled to animation frame). SVG re-renders from that snapshot.

**Rationale**: Keeping the mutable simulation in a ref avoids re-creating it every render. Reading positions into state on tick lets React render declaratively. This is the canonical "d3-for-physics, React-for-DOM" pattern.

**Alternatives considered**:
- Let d3 own the DOM (`d3.select` mutating SVG directly): conflicts with React's reconciliation; rejected.
- Re-create simulation each render: catastrophic for performance; rejected.

---

### D-003: Expand/Collapse Model

**Decision**: Maintain a tree of all *potential* nodes (derived from the existing keyword suggestion adjacency map). Each node has an `expanded` boolean. Only nodes that are the root or whose parent is expanded are added to the **live** simulation node set. Clicking toggles `expanded`; collapsing a node recursively removes all descendants from the live set.

**Rationale**: The suggestion adjacency data already exists (`src/services/keywordSuggestions.ts` → `KEYWORD_SUGGESTIONS_MAP`). Reusing it as the tree source means no new data authoring. Spring animation comes naturally: newly added nodes start at their parent's position and the simulation eases them outward.

**Alternatives considered**:
- Pre-render entire graph and hide with opacity: wrecks performance and the "unfolding" feel; rejected.

---

### D-004: Spring/Unfold Animation

**Decision**: New child nodes are initialized at the parent node's (x, y) with a small random jitter; the force simulation's link distance + charge naturally "springs" them outward over ~0.5–1s as `alpha` decays. On collapse, descendants animate back toward the parent before removal (brief exit transition).

**Rationale**: The force simulation IS the spring. No separate animation engine needed for the core unfold. Framer Motion (already installed) can layer a fade/scale on node mount/unmount for polish.

---

### D-005: Click vs. Drag Disambiguation

**Decision**: Track pointer-down position and a small movement threshold (~4px). If the pointer moves beyond the threshold before release → treat as drag (no expand toggle). If it stays within threshold → treat as click (toggle expand/collapse). `d3-drag` exposes this naturally via its `start`/`drag`/`end` events plus a distance check.

**Rationale**: Standard pattern; prevents accidental expand/collapse when the user meant to reposition.

---

### D-006: Hover Neighbor Highlight

**Decision**: On node `mouseenter`, compute the set of directly-connected node ids and link ids from the live link set. Apply full opacity to that set and reduced opacity (~0.15) to everything else via CSS classes. Clear on `mouseleave`.

**Rationale**: O(links) per hover, trivially cheap at our scale (≤50 nodes). Pure presentational state, kept local to the graph component.

---

### D-007: Drag Behavior & Fixing

**Decision**: While dragging, set the node's `fx`/`fy` (fixed position) to the pointer location and re-heat the simulation (`alphaTarget(0.3)`). On release, clear `fx`/`fy` so the node rejoins the simulation (OR keep it pinned — see below).

**Decision detail**: On release, **clear** `fx`/`fy` so connected nodes settle naturally (matches Obsidian's default "let go and it floats back into the layout" feel). A future enhancement could pin on drag-end, but default is unpinned.

---

### D-008: State Ownership (Zustand vs. Local)

**Decision**: Keep graph-visual state (positions, hover, drag, expanded set) **local** to the graph component. Only the set of *active keywords* (those expanded/adopted) syncs to the existing Zustand store so news filtering (`useGdeltFetch`) keeps working.

**Rationale**: Positions and hover are ephemeral view state — putting them in Zustand would cause excessive global re-renders. The store already owns `keywords`/`activeKeywords`; we bridge only that.

---

### D-009: Performance Strategy

**Decision**: Cap the live simulation at ~60 nodes. Stop the simulation when `alpha` drops below threshold (d3 does this automatically) to avoid burning CPU when settled. Restart (`alpha(0.3).restart()`) only on expand/collapse/drag.

**Rationale**: Meets SC-002 (50 nodes, smooth). Idle graphs cost ~0 CPU.

---

### D-010: Constitution — Mobile-First Tension

**Conflict**: Constitution Principle I (Mobile-First) vs. spec assumption deferring mobile touch optimization.

**Resolution**: The graph container uses the same responsive sizing as the panel it replaces (`w-full h-[300px]` mobile / `lg:w-[360px]` desktop). Pointer events (`onPointerDown/Move/Up`) work for both mouse and touch, so basic drag/expand function on mobile. Touch-specific gesture refinement (pinch-zoom, momentum) is explicitly deferred and recorded in Complexity Tracking.
