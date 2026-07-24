# Contracts: Working Filter Sliders & Neural Panel Redesign

**Feature**: 012-filter-sliders-panel-redesign | **Date**: 2026-06-07

---

## emphasis.ts (new, pure)

**File**: `src/utils/emphasis.ts`

```typescript
export interface DotEmphasis { scale: number; opacity: number; }

export function computeEmphasisMap(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  keywords: { id: string; label: string }[],
): Map<string, DotEmphasis>;
```

**Behavior**:
- All weights 0.5 → every entry `{ scale: 1, opacity: 1 }` (baseline preserved)
- Higher Sentiment/Recency/Relevance/Topic weight → larger `scale` on the matching dots; lower → smaller + dimmer
- Reuses `parseSeendate` (timeline.ts) for recency and `dominantTopic` (clustering.ts) for topic
- Pure, deterministic, never throws; empty input → empty map

---

## useEmphasis (optional thin hook) OR inline useMemo

**File**: `src/components/output/ArticleScatter.tsx` (inline) — read `filterWeights`, `activeKeywords`, `keywords` from store; `useMemo(() => computeEmphasisMap(points, activeKeywords, filterWeights, keywords), [points, filterWeights, activeKeywords, keywords])`.

**Contract**: recomputes when any weight changes → dots resize/dim live as a slider drags.

---

## ArticleScatter (modified)

**File**: `src/components/output/ArticleScatter.tsx`

- Subscribe to the full `filterWeights` (currently only `sentiment` weight is read), plus `keywords`
- Compute `emphasisMap`
- In the dot `motion.div` `animate`: `scale: (isHovered ? 1.6 : 1) * (emphasisMap.get(point.id)?.scale ?? 1)` and `opacity: (isLoading ? 0.35 : 1) * (emphasisMap.get(point.id)?.opacity ?? 1)`
- No change to position, color, hover, click, or the timeline/cluster branch

**Contract**: every weight slider visibly changes dot sizes/brightness within ~1s (SC-001); default weights = unchanged view.

---

## NeuralPanel (restructured — hybrid)

**File**: `src/components/neural/NeuralPanel.tsx`

**Top region — Neural Flow (compact)**:
- Keep keyword pills + filter nodes + SVG edges, scaled into the top ~58% of the panel height
- Filter nodes become **label-only chips** (remove the embedded `<input type="range">` and value from `FilterCard`)
- Edges render behind (z-0); nodes above — no slider overlap

**Bottom region — Filters strip**:
- A new section listing one `FilterSliderRow` per filter: Layer-2 (`sentiment`, `recency`, `relevance`) then active Layer-1 topic categories (from `dynamicFilterNodes` where `layer === 1`)
- Each row (contract):
  - label (filter name) + value `{Math.round(weight*100)}%`
  - a large horizontal `<input type="range" min=0 max=1 step=0.01>` with a comfortable hit height (≥ 28px touch area)
  - a neutral 50% baseline marker on the track
  - color cue: weight > 0.55 → neon (boosted), 0.45–0.55 → muted (neutral), < 0.45 → dim (reduced)
  - `onChange` → `setFilterWeight(id, value)`; `onPointerDown` stopPropagation
- Scrolls if rows exceed the strip height

**Contract**: no interactive elements overlap (FR-008/009); each slider is comfortably draggable (FR-010); the panel stays information-rich (FR-011).

**Feedback (P2)**: while a `FilterSliderRow` is focused/active, the matching top-flow filter node pulses/glows (CSS/animation) so the control↔metaphor link is visible (FR-012).

---

## FilterCard (modified) / FilterSliderRow (new)

- `FilterCard` (top flow) loses its slider — becomes a compact labeled chip
- `FilterSliderRow` (bottom strip) is the new slider component described above

---

## page.tsx / responsive (minor)

**File**: `src/app/page.tsx`

- On mobile the neural panel must be tall enough for both regions: change the mobile height from `h-[300px]` to `h-auto min-h-[380px]` (or similar) so the flow + Filters strip both fit; desktop `lg:` sizing unchanged

---

## emphasis.test.ts (new)

**File**: `tests/utils/emphasis.test.ts`

- all weights 0.5 → every dot `{ scale: 1, opacity: 1 }`
- raising `recency` weight → the newest article's `scale` > the oldest article's `scale`
- raising `relevance` weight → a high-relevance article's `scale` > a low-relevance article's `scale`
- lowering a weight below 0.5 → `scale < 1` and `opacity < 1` for affected dots
- empty input → empty map; never throws
- output scale within [0.55, 1.45], opacity within [0.45, 1]
