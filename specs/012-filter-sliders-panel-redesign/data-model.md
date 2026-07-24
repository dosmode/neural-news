# Data Model: Working Filter Sliders & Neural Panel Redesign

**Feature**: 012-filter-sliders-panel-redesign | **Date**: 2026-06-07

No store schema change — `filterWeights` already exists. New concepts live in a pure util + the panel's presentation.

---

## New Entity: DotEmphasis

Per-article multiplier the filter weights produce; consumed by the dot renderer.

| Field | Type | Range | Meaning |
|---|---|---|---|
| `scale` | `number` | 0.55 – 1.45 | Size multiplier applied to the dot |
| `opacity` | `number` | 0.45 – 1.0 | Brightness multiplier (reduces only below neutral) |

Produced as `Map<articleId, DotEmphasis>` by `computeEmphasisMap`.

---

## Function: computeEmphasisMap (pure)

```
computeEmphasisMap(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  keywords: KeywordDef[],
) → Map<string /*article.id*/, DotEmphasis>
```

**Steps**:
1. `c(w) = (w − 0.5) * 2` for `sentiment`, `recency`, `relevance`, and each topic weight
2. recency: parse `seendate` (reuse `parseSeendate`), normalize newest=1/oldest=0 over dated articles (undated → 0)
3. relevance: `max(relevanceMap[id])` over active keyword ids (0 if none)
4. sentimentStrength: positive/negative → 1, neutral → 0.2
5. topic: `dominantTopic(article, activeIds, keywordOrder)` → `c(filterWeights[topicId])` (0 if `__other__`/missing)
6. `e = c(wS)·strength + c(wR)·recency + c(wRel)·relevance + c(wTopic)` ; `emphasis = clamp(e/4, −1, 1)`
7. `scale = 1 + emphasis*0.45` ; `opacity = 1 + min(0, emphasis)*0.55`

**Invariants**: all weights at 0.5 → every `emphasis = 0` → `scale = 1, opacity = 1` (baseline unchanged). Pure, deterministic, never throws.

---

## Existing: filterWeights (store, unchanged)

| Key | Source | Default |
|---|---|---|
| `sentiment` | Layer-2 fixed | 0.5 |
| `recency` | Layer-2 fixed | 0.5 |
| `relevance` | Layer-2 fixed | 0.5 |
| `<TopicCategory>` (e.g. `Semiconductors`) | Layer-1 dynamic | 0.5 |

`setFilterWeight(id, weight)` already updates these; `deriveFrom` initializes each to 0.5.

---

## Panel Presentation Concepts (no store state)

### NeuralFlow (top region of NeuralPanel)

The compact metaphor: keyword pills + filter nodes + edges, scaled to the top region; filter nodes are **label-only chips** (sliders removed).

### FilterSliderRow (bottom Filters strip)

| Aspect | Value |
|---|---|
| label | filter name (`Sentiment`/`Recency`/`Relevance`/topic) |
| track | large horizontal range, comfortable hit height |
| baseline | neutral 50% marker on the track |
| value | `{percent}%` |
| state cue | boosted (>50%, neon) / neutral (≈50%) / reduced (<50%, dim) |
| onChange | `setFilterWeight(id, value)` |

The strip lists Layer-2 filters first (Sentiment, Recency, Relevance), then active Layer-1 topic categories.

---

## Apply in ArticleScatter

For each dot: existing `scale` (hover 1.6 / 1) is multiplied by `emphasis.scale`; existing `opacity` (loading 0.35 / 1) is multiplied by `emphasis.opacity`. Position/color unchanged.

---

## Validation / Invariants

- Default weights → identical to current output (no regression)
- Every slider change recomputes emphasis → dots resize within a frame (SC-001)
- Reversible: returning a weight to its prior value restores prior emphasis (SC-005)
- All-min weights → dots at floor scale/opacity, still visible (FR-014)
- No overlap of sliders/edges (sliders are in the separate bottom strip)
