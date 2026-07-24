# Research: Graph Overview, Natural UX & Clicked-Node Article Sync

**Feature**: 015-graph-overview-news-sync
**Date**: 2026-06-09

## Decision Log

### D-001: News Sync — Recency-Based Active Set (the bug fix)

**Decision**: Replace the depth-priority cap in `syncToStore` with a **selection-recency** priority. Each `GraphNode` gains a `selectedAt` counter; clicking a node bumps it to the latest value. The active keyword set sent to the store = live nodes sorted by `selectedAt` descending, capped at `NEWS_ACTIVE_CAP` (8).

**Rationale**: The current code does `.sort((a, b) => a.depth - b.depth).slice(0, 8)` — roots (depth 0) always win, so a clicked child (depth ≥1) is dropped from the news query when roots fill the cap. The user clicks "OpenAI" but only the root keywords reach the article fetch. Recency priority makes the most recently clicked node lead the news results, which is the user's mental model ("I clicked it, show me its articles").

**Alternatives considered**:
- Raise the cap to include all nodes: a 30-term OR query degrades news relevance and clusters poorly. Rejected.
- Select only the single clicked node for news: loses the multi-keyword context the article scatter relies on. Rejected.
- Manual "pin to news" toggle separate from click: extra UI burden; spec wants click → results directly. Rejected.

---

### D-002: Clicking Any Node Selects It for News (incl. leaf nodes)

**Decision**: A node click does two things: (a) marks the node as most-recently-selected (updates `selectedAt`), and (b) if it has children, toggles expand/collapse. Leaf nodes (no children) still get selected for news on click even though they can't expand.

**Rationale**: Today `toggleNode` returns early for leaf nodes (`if (!node.hasChildren) return`), so clicking a leaf does nothing — including not updating news. Decoupling "select for news" from "expand" fixes this: every click contributes to the news filter regardless of whether the node can expand.

**Alternatives considered**:
- Separate select vs. expand gestures (e.g., click = select, double-click = expand): more discoverable controls but heavier UX; spec asks for a natural single interaction. Deferred.

---

### D-003: Default Overview — Auto-Expand One Level on Load

**Decision**: On initialization, after building root nodes, **batch-expand each root one level** (depth 1 children) in a single state update, then sync to the store **once**. Initial active news set = the root keywords (so news loads immediately without a flood).

**Rationale**: FR-005 wants the full structure visible on load. Building roots + their first-level children in one batch (not N sequential expands) avoids multiple re-renders and multiple news fetches (FR-011). One `setKeywords` call keeps the existing 6-second fetch cooldown happy.

**Alternatives considered**:
- Expand all levels fully: explodes node count (could exceed the 60 cap) and floods the view. Rejected — depth 1 is the right "overview" default.
- Lazy expand (current behavior): doesn't satisfy "전체적으로 보인 상태". Rejected.

---

### D-004: Initial Layout — Radial Seeding to Prevent Clustering

**Decision**: Seed root node positions on a circle around the panel center (evenly spaced by angle), and seed each child near its parent with a small outward offset. Combined with the force simulation, this yields an even, non-overlapping spread (FR-007, SC-004).

**Rationale**: The current code seeds roots on a short horizontal line (`x = center + (i - n/2)*24`), which starts them overlapping and lets the simulation untangle from a bad initial state — looking jumpy. Radial seeding starts closer to the settled layout, so motion is gentler and there's no initial pile-up.

**Alternatives considered**:
- Rely purely on the simulation from random positions: more chaotic initial motion. Rejected.

---

### D-005: Natural UX — Force & Transition Tuning

**Decision**: Tune the d3 simulation for smoother settling:
- Add `forceX(center).strength(0.04)` + `forceY(center).strength(0.04)` to gently keep the graph centered (prevents drift off-panel).
- Lower `alphaDecay` slightly (~0.0228 default → keep) but raise `velocityDecay` (friction) to ~0.45 so nodes glide to rest instead of oscillating.
- Increase `forceCollide` radius slightly and add a small strength so labels don't overlap.
- Keep `forceManyBody` charge moderate (around -180 to -240) tuned against panel size.

Plus presentation smoothing:
- Ensure hover dim/highlight uses CSS opacity transitions on both nodes and links (links already do; verify nodes animate opacity smoothly, no flicker).
- Children spawn at parent position (already in place) so expansion springs outward rather than popping in.

**Rationale**: Addresses "UXUI가 자연스럽지 못해" — drift, oscillation, and overlap are the main culprits. Centering forces + higher friction + collision spacing produce a calm, readable graph.

**Alternatives considered**:
- Swap d3-force for a spring-physics library: unnecessary; d3 parameters cover it. Rejected.

---

### D-006: Selected-Node Visual Indicator

**Decision**: Nodes currently in the active news set (top-N by recency) get a distinct visual treatment (e.g., a brighter ring / accent) so the user can see which keywords are driving the article results (FR-012).

**Rationale**: With recency-based selection, the user needs feedback on which nodes are "live" in the news filter. A subtle selected-state ring closes the loop between clicking and results.

---

### D-007: Constitution Alignment

**Decision**: No constitution conflicts beyond the already-documented partial-mobile stance from feature 014. All changes are local to the graph component, the simulation hook, and the graph-tree util. Performance principle is respected — one batched news sync, capped query, simulation parks at low alpha.
