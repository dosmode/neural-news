# Implementation Plan: Working Filter Sliders & Neural Panel Redesign

**Branch**: `012-filter-sliders-panel-redesign` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-filter-sliders-panel-redesign/spec.md`

---

## Summary

Make the filter weight sliders actually drive the output by introducing a pure **dot-emphasis engine**: each weight (Sentiment / Recency / Relevance / topic) is centered on its 0.5 default and modulates the size + brightness of the dots it applies to (default 0.5 = no change, so the baseline is preserved). Then redesign the cramped neural panel into a **hybrid**: a compact neural-flow visualization on top (keywords → filter chips → edges, no embedded sliders) and a dedicated **Filters strip** of large, comfortable sliders below (with a neutral baseline and boosted/reduced cues). A light cause→effect cue pulses the matching flow node while a slider is active.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Zustand 5, Framer Motion 12, D3 7. No new dependency.

**Storage**: Zustand in-memory; **no schema change** (`filterWeights` already exists)

**Testing**: Vitest 4 — new `emphasis.test.ts`; existing 43 tests stay green

**Target Platform**: Web, desktop-first; touch-operable sliders on mobile (per 011)

**Performance Goals**: Slider drag → dots resize within ~1s, smooth (SC-001); ≤100 dots

**Constraints**: Default weights must reproduce today's view (no regression); reuse `parseSeendate`/`dominantTopic`; preserve cluster/topic/timeline views and responsive layout

**Scale/Scope**: Emphasis util + ArticleScatter wiring + NeuralPanel hybrid restructure

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ✅ Pass | Sliders touch-operable; panel mobile height adjusted |
| II. High Performance | ✅ Pass | Pure emphasis map, memoized; ≤100 dots |
| III. Data Privacy & Security | ✅ Pass | No data change |
| IV. Component-Based Architecture | ✅ Pass | Pure util + presentational rows; store unchanged |
| V. Continuous Automated Testing | ✅ Pass | `emphasis.test.ts`; existing suite green |
| Technology Stack | ✅ Pass | No new dependency |

---

## Project Structure

```text
specs/012-filter-sliders-panel-redesign/
├── plan.md  research.md  data-model.md
├── contracts/ui-components.md
└── tasks.md  (/speckit-tasks)
```

### Source Code Changes

```text
CREATE:
  src/utils/emphasis.ts                 ← computeEmphasisMap (pure)
  tests/utils/emphasis.test.ts          ← emphasis unit tests

UPDATE:
  src/components/output/ArticleScatter.tsx  ← read filterWeights+keywords; apply emphasis to dot scale/opacity
  src/components/neural/NeuralPanel.tsx     ← hybrid: compact flow (chips, no sliders) + Filters slider strip
  src/app/page.tsx                          ← mobile neural-panel height for the two regions

UNCHANGED:
  store/useStore.ts, types (filterWeights already present), clustering.ts, timeline.ts,
  ClassificationField.tsx (still uses sentiment weight via fieldIntensity), ArticleStrip, fetch
```

---

## Implementation Phases

### Phase A: Emphasis engine + tests (P1 — make sliders work)

**File**: `src/utils/emphasis.ts`
```typescript
import { Article } from '@/types';
import { parseSeendate } from '@/utils/timeline';
import { dominantTopic } from '@/utils/clustering';

export interface DotEmphasis { scale: number; opacity: number; }
const c = (w: number) => (w - 0.5) * 2;                 // centered weight ∈ [-1,1]
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computeEmphasisMap(articles, activeKeywords, filterWeights, keywords) {
  const map = new Map<string, DotEmphasis>();
  if (articles.length === 0) return map;
  const activeIds = Array.from(activeKeywords);
  const order = keywords.map(k => k.id);

  // recency normalization across dated articles
  const times = articles.map(a => parseSeendate(a.seendate)).filter((t): t is number => t !== null);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 1;
  const span = max - min || 1;

  const cS = c(filterWeights['sentiment'] ?? 0.5);
  const cR = c(filterWeights['recency'] ?? 0.5);
  const cRel = c(filterWeights['relevance'] ?? 0.5);

  for (const a of articles) {
    const t = parseSeendate(a.seendate);
    const recency = t === null ? 0 : (t - min) / span;
    const relevance = activeIds.reduce((m, id) => Math.max(m, a.relevanceMap[id] ?? 0), 0);
    const strength = a.sentiment === 'neutral' ? 0.2 : 1;
    const topicId = dominantTopic(a, activeIds, order);
    const cTopic = c(filterWeights[topicId] ?? 0.5);

    const e = cS * strength + cR * recency + cRel * relevance + cTopic;
    const emphasis = clamp(e / 4, -1, 1);
    map.set(a.id, {
      scale: 1 + emphasis * 0.45,
      opacity: 1 + Math.min(0, emphasis) * 0.55,
    });
  }
  return map;
}
```

**File**: `tests/utils/emphasis.test.ts` — default→{1,1}; recency↑ grows newest; relevance↑ grows relevant; weight<0.5 shrinks+dims; bounds; empty→empty.

---

### Phase B: Apply emphasis in ArticleScatter (P1)

**File**: `src/components/output/ArticleScatter.tsx`
- Add store reads: `filterWeights` (full), `keywords`, `activeKeywords`
- `const emphasis = useMemo(() => computeEmphasisMap(points, activeKeywords, filterWeights, keywords), [points, activeKeywords, filterWeights, keywords])`
- In the dot `animate`:
  - `scale: (isHovered ? 1.6 : 1) * (emphasis.get(point.id)?.scale ?? 1)`
  - `opacity: (isLoading ? 0.35 : 1) * (emphasis.get(point.id)?.opacity ?? 1)`
- Nothing else changes (position/color/hover/click/timeline all intact)

---

### Phase C: NeuralPanel hybrid — compact flow + Filters strip (P1)

**File**: `src/components/neural/NeuralPanel.tsx`
1. Wrap the panel in two stacked regions: top `flex-[0.58]` (flow), bottom `flex-[0.42]` (Filters strip), with a divider.
2. **Top flow**: keep the SVG `layout()` but compute against the top region's height; `FilterCard` becomes a **label-only chip** (delete the `<input type="range">` + value block). Edges stay behind (z-0).
3. **Bottom Filters strip**: render rows from the store:
   - Layer-2: `sentiment`, `recency`, `relevance`
   - Layer-1: each `dynamicFilterNodes` where `layer === 1` (topic categories)
   - Each row = `FilterSliderRow` (new small component): label + `{percent}%` + full-width `<input type=range>` (hit height ≥28px) + neutral 50% baseline tick + boosted(neon)/neutral(muted)/reduced(dim) color; `onChange → setFilterWeight(id, v)`, `onPointerDown` stopPropagation. Strip scrolls if needed.

---

### Phase D: Cause→effect feedback (P2)

**File**: `src/components/neural/NeuralPanel.tsx`
- Track `activeSliderId` (local state) set on a row's focus/drag; when set, the matching top-flow filter chip gets a pulse/glow class. Clear on blur/end. CSS/animation only.

---

### Phase E: Responsive + verify

- `src/app/page.tsx`: mobile neural-panel height `h-auto min-h-[380px]` (or similar) so both regions fit on phones; desktop `lg:` unchanged.
- `npx tsc --noEmit` clean; `npm test` (43 + new emphasis tests) pass.
- Manual: drag each slider → matching dots grow/shrink + (sentiment) field strengthens; default centered = unchanged; no overlap; sliders comfortably draggable; mobile OK; views (cluster/topic/timeline) all honor emphasis.

---

## Post-Design Constitution Re-check

All pass. The fix is a pure, tested emphasis function consumed by the dot renderer; the panel restructure is presentational; store/data unchanged; default-preserving so no regression; sliders become operable and their effect visible — closing the feedback loop the spec requires.
