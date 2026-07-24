# Research: Working Filter Sliders & Neural Panel Redesign

**Feature**: 012-filter-sliders-panel-redesign | **Date**: 2026-06-07

---

## Decision 1: Root cause — weights aren't read by the output

**Decision**: Today only `fieldIntensity(filterWeights['sentiment'])` consumes a weight (it tweaks the classification field's opacity). `calculateClustering`/`calculateTimeline` and the dot renderer ignore `filterWeights`, so Recency, Relevance, and topic-category sliders change nothing — hence "dead controls." The fix introduces a **dot emphasis** layer that every weight modulates.

**Rationale**: Closing the feedback loop requires the weights to feed a visible output property. Emphasis (dot size + brightness) is a continuous, immediately visible channel that works in every view (cluster/topic/timeline) without changing positions/clustering logic.

---

## Decision 2: Centered-weight emphasis model (default = no change)

**Decision**: Each weight is centered around its neutral default 0.5: `c(w) = (w − 0.5) × 2 ∈ [−1, 1]`. At 0.5 every term is 0 → **the baseline looks exactly like today** (sliders boost above 0.5, reduce below).

Per dot, four signals (each ~0..1):
- `recency` — newest article = 1, oldest = 0 across the current dated set (reuse `parseSeendate` from `timeline.ts`)
- `relevance` — max `relevanceMap[id]` over active keyword ids (already 0..1)
- `sentimentStrength` — 1 for positive/negative, ~0.2 for neutral
- the dot's **dominant-topic weight** (reuse `dominantTopic` from `clustering.ts`)

Aggregate:
```
e = c(wSentiment)·sentimentStrength
  + c(wRecency)·recency
  + c(wRelevance)·relevance
  + c(wTopicOfDot)·1
emphasis = clamp(e / 4, −1, 1)
```

Apply to the dot:
- `scaleMul = 1 + emphasis · 0.45`  → [0.55 … 1.45]
- `opacityMul = 1 + min(0, emphasis) · 0.55` → reduced dots dim to ~0.45; neutral/boosted stay 1.0

**Rationale**:
- Default-preserving (0.5 everywhere → no visual change) so we don't regress the current look.
- Every slider has a clear matching effect: Recency↑ → recent dots grow; Relevance↑ → relevant dots grow; Sentiment↑ → pos/neg dots grow (and the field strengthens via the existing `fieldIntensity`); Topic↑ → that topic's dots grow. Down → shrink/dim.
- Continuous and view-independent (works in cluster, topic, and timeline views).
- Exact constants (0.45, 0.55, /4) are tunable; the spec only requires a clear, matching, reversible effect.

**Alternatives considered**:
- Weights drive **position** (force strength): rejected as primary — less legible than size, and conflicts with the deliberate sentiment/topic clustering of 007/009. Sentiment still influences the field (existing).
- Weights filter (hide) low-scoring dots: rejected — hiding loses the "one dot per article" guarantee and feels abrupt vs. smooth emphasis.

---

## Decision 3: Emphasis as a pure, memoized, tested function

**Decision**: Add `src/utils/emphasis.ts` with a pure `computeEmphasisMap(articles, activeKeywords, filterWeights, keywords) → Map<articleId, { scale, opacity }>`. `ArticleScatter` memoizes it on `[articles, filterWeights, activeKeywords, keywords]` and multiplies `scale`/`opacity` into each dot's existing animation. Unit-tested.

**Rationale**: Pure function = testable (constitution V), cheap for ≤100 dots, recomputes live as a slider drags (filterWeights change → memo recompute → dots resize via framer-motion). Keeps `ArticleScatter` presentational.

---

## Decision 4: Hybrid panel — compact flow on top, Filters strip below

**Decision**: Restructure `NeuralPanel` into two stacked regions:
- **Top (~58%) — Neural Flow**: the existing keyword pills → filter nodes → edges, but **compact** (sliders removed from the filter nodes; nodes become small labeled chips). This preserves the metaphor as a visualization.
- **Bottom (~42%) — Filters strip**: a dedicated, scrollable list of **large horizontal sliders**, one row per filter (Sentiment, Recency, Relevance, then the active topic categories). Each row: label · big draggable track with a **neutral 50% baseline marker** · value % · boosted(+, neon)/reduced(−, dim) color cue.

**Rationale (chosen hybrid)**:
- Keeps the neural-network "drawing" (top) AND gives sliders room to be operable and readable (bottom) — resolving both the "dead control" and "too tight" problems.
- Separating edges (top, behind) from sliders (bottom strip) eliminates the overlap that made sliders unusable.
- The Filters strip is information-rich: shows every filter, its value, and whether it's boosted/neutral/reduced at a glance.

**Layout**: top region uses the existing SVG layout but scaled to the smaller height; bottom strip is a normal fl. On mobile the panel grows taller (`h-auto`/larger min-height) so both regions fit; the responsive stack (011) is preserved.

---

## Decision 5: Cause→effect feedback (P2)

**Decision**: While a slider is active (focus/drag), briefly **highlight the matching filter node** in the top flow (pulse/glow) so the reader sees which node the slider corresponds to; the dots simultaneously resize. Lightweight, CSS/animation only.

**Rationale**: Makes the control→metaphor→output link explicit (FR-012) without heavy machinery. The dot resizing already provides the primary effect feedback.

---

## Decision 6: No new store shape; weights already present

**Decision**: `filterWeights` already holds `sentiment`/`recency`/`relevance` + topic category ids, each defaulting to 0.5 (via `deriveFrom`). No store schema change. `ArticleScatter` will additionally subscribe to `filterWeights` (it currently reads only the sentiment weight) so emphasis updates live.

**Rationale**: The data is already there; the bug is purely that nothing consumed it. Minimal blast radius.

---

## Decision 7: All-minimum and edge handling

**Decision**: With all weights at 0, `c(w) = −1` for all → dots shrink/dim uniformly toward the floor but still render (scale ≥ 0.55, opacity ≥ 0.45) — sensible, not blank (FR-014). Undated articles get `recency = 0` (no recency boost) but are otherwise emphasized normally. Neutral default (0.5) leaves the view unchanged.
