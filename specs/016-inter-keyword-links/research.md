# Research: Inter-Keyword Cross Links

**Feature**: 016-inter-keyword-links
**Date**: 2026-06-09

## Decision Log

### D-001: Cross-Link Source — Reuse the Adjacency Map (bidirectional union)

**Decision**: Two live nodes A and B are "related" (get a cross link) if **either** `KEYWORD_SUGGESTIONS_MAP[A.id]` contains a label that slugs to B.id **or** `KEYWORD_SUGGESTIONS_MAP[B.id]` contains a label slugging to A.id (a bidirectional union).

**Rationale**: The adjacency map already encodes keyword relationships and is the same data driving expansion. The union (not intersection) is the right default because the map is often one-directional (e.g. `nvidia → ['semiconductors', ...]` but `semiconductors` may not list `nvidia`); requiring both directions would miss obvious relations. This matches the spec assumption.

**Alternatives considered**:
- Require mutual (intersection) relation: too strict — drops many intuitive links. Rejected.
- Live co-occurrence in fetched articles: needs runtime article analysis, adds latency, unstable. Rejected.

---

### D-002: Cross-Links Are Derived, Not Stored

**Decision**: Hierarchy (parent→child) links remain in component state (`liveLinks`, created on expand). Cross-links are **derived** with `useMemo` from the current `liveNodes` + hierarchy links, then combined into a single `allLinks` array fed to both the simulation and the renderer.

**Rationale**: Cross-links are a pure function of which nodes are currently live — deriving them avoids state-sync bugs (no separate add/remove bookkeeping; FR-003/FR-004 fall out for free). Memoizing on `liveNodes`/`liveLinks` (which change only on structural events, not on every simulation tick) keeps the derivation off the hot path, so the sim doesn't restart on ticks (FR-009).

**Alternatives considered**:
- Store cross-links in state and mutate on every expand/collapse: duplicates logic, error-prone for removal. Rejected.

---

### D-003: Deduplicate Against Hierarchy Pairs

**Decision**: When building cross-links, skip any unordered pair {A,B} that already has a hierarchy link. Use an unordered-pair key (`[a,b].sort().join('|')`) to dedup. Cross-link ids are stable (`x-${a}-${b}` with a,b sorted).

**Rationale**: FR-005 — a pair must show exactly one connection. Hierarchy wins (it represents the explicit expansion path). Sorted keys also prevent A→B and B→A producing two cross links for the same pair.

---

### D-004: Density Control

**Decision**: Cap total cross-links at a constant (`MAX_CROSS_LINKS`, ~40) and render cross-links visually lighter than hierarchy links. If the cap is hit, prefer cross-links among lower-depth / more-recently-added nodes (stable, deterministic order).

**Rationale**: FR-010 — at ~60 nodes the number of related pairs can clutter the view. A cap plus lighter styling keeps it readable without a hard relationship-quality judgment.

**Alternatives considered**:
- Per-node degree cap only: less predictable total; harder to reason about. Combined a total cap with lighter styling instead.

---

### D-005: Link Type & Visual Distinction

**Decision**: Add an optional `type?: 'hierarchy' | 'cross'` to `GraphLink`. `GraphLinkView` renders hierarchy links as the current solid style and cross-links as a **dimmer, dashed** line in a distinct accent (e.g. muted purple) so the two are distinguishable (FR-008).

**Rationale**: Minimal data change; rendering branches on `link.type`. Dashed + dimmer reads as "associative" vs the solid "structural" hierarchy line.

---

### D-006: Physics & Hover Integration Come Free

**Decision**: Because cross-links are merged into the single `allLinks` array passed to `useForceSimulation` and to the hover `neighborIds` computation, they automatically (a) participate in `forceLink` attraction (FR-006) and (b) light up neighbors on hover (FR-007). Cross-links may use a slightly longer link distance so related-but-not-parent nodes don't clump too tightly.

**Rationale**: No special-casing needed in the simulation hook or hover logic — they already operate over whatever links they're given. Keeps the change surface small.

---

### D-007: Constitution Alignment

**Decision**: No new conflicts. Pure-logic addition (`computeCrossLinks`) is unit-tested (Principle V). Performance (Principle II) preserved via memoized derivation + cap. Component architecture (Principle IV) unchanged — edits confined to graph util, panel, and link view. Inherits 014/015 partial-mobile stance.
