# Implementation Plan: Timeline View (News Flow Over Time)

**Branch**: `010-timeline-view` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-timeline-view/spec.md`

---

## Summary

Add a Timeline view to the output area. A pure `calculateTimeline` maps each article's publication time (`seendate`) to a horizontal time axis, stacking dots vertically per time-column so busy periods read as tall bursts. A `viewMode` store field toggles between the existing Cluster scatter and the new Timeline; a segmented `[ CLUSTER | TIMELINE ]` control drives it. Dot color, hover, and click are shared across views (only x/y differ). The classification field and cluster labels are cluster-view concepts and hide in Timeline; a time axis with adaptive ticks shows instead.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Zustand 5, Framer Motion 12 (dot springs animate the re-arrange). No D3 needed for the timeline (pure scale + stacking)

**Storage**: Zustand in-memory (session-scoped view); no persistence

**Testing**: Vitest 4 — new `timeline.test.ts` (parse + layout)

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: View switch re-arranges within 2s smooth (SC-001); dots distinct up to 100 in densest column (SC-005)

**Constraints**: Reuse existing dots/interactions/sentiment color; `seendate` already on each article; no new dependency

**Scale/Scope**: ≤100 dots; ~5 axis ticks

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first, consistent with prior features |
| II. High Performance | ✅ Pass | Timeline is a pure scale+stack (no physics); cheap |
| III. Data Privacy & Security | ✅ Pass | Re-positions existing dots; no data collection |
| IV. Component-Based Architecture | ✅ Pass | Pure util + hook; component selects the active layout |
| V. Continuous Automated Testing | ✅ Pass | `parseSeendate` + `calculateTimeline` unit-tested |
| Technology Stack | ✅ Pass | No new dependency |

---

## Project Structure

```text
specs/010-timeline-view/
├── plan.md  research.md  data-model.md
├── contracts/ui-components.md
└── tasks.md  (/speckit-tasks)
```

### Source Code Changes

```text
CREATE:
  src/utils/timeline.ts            ← parseSeendate, calculateTimeline, TimeTick, constants
  src/hooks/useTimeline.ts         ← memoized timeline layout from store articles
  tests/utils/timeline.test.ts     ← parse + layout unit tests

UPDATE:
  src/types/index.ts               ← ViewMode; AppState.viewMode + setViewMode
  src/store/useStore.ts            ← viewMode state + setViewMode action
  src/components/output/ArticleScatter.tsx  ← view toggle; pick layout; time axis; conditional cluster UI

UNCHANGED:
  clustering.ts, useClustering.ts, ClassificationField.tsx (hidden in timeline via prop),
  NeuralPanel, ArticleStrip, gdeltService, useGdeltFetch, page.tsx
```

---

## Implementation Phases

### Phase A: Timeline engine + tests (P1 core)

**File**: `src/utils/timeline.ts`
```typescript
export interface TimeTick { x: number; label: string; }
const AXIS_PAD = 60, COL_W = 24, STACK_STEP = 22, TICK_COUNT = 5, DAY_MS = 86_400_000;

export function parseSeendate(s: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s ?? '');
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(t) ? null : t;
}

export function calculateTimeline(articles, width, height) {
  if (!articles.length || width === 0 || height === 0) return { points: [], ticks: [] };
  const dedup = Array.from(new Map(articles.map(a => [a.url, a])).values());
  const dated = dedup.map(a => ({ a, t: parseSeendate(a.seendate) }))
                     .filter((d): d is {a:Article;t:number} => d.t !== null)
                     .sort((p, q) => p.t - q.t);
  if (!dated.length) return { points: [], ticks: [] };
  let min = dated[0].t, max = dated[dated.length-1].t;
  if (min === max) { min -= 3_600_000; max += 3_600_000; }
  const x = (t:number) => AXIS_PAD + ((t-min)/(max-min)) * (width - 2*AXIS_PAD);
  const colCounts: Record<number, number> = {};
  const points = dated.map(({a,t}) => {
    const px = x(t);
    const col = Math.round(px / COL_W);
    const idx = (colCounts[col] = (colCounts[col] ?? 0) + 1) - 1;
    const dir = idx % 2 === 0 ? 1 : -1;
    const py = height/2 + dir * Math.ceil(idx/2) * STACK_STEP;
    return { ...a, x: px, y: Math.max(50, Math.min(height-50, py)) };
  });
  const span = max - min, useDate = span > DAY_MS;
  const ticks = Array.from({length:TICK_COUNT}, (_,i) => {
    const t = min + (span*i)/(TICK_COUNT-1);
    const d = new Date(t);
    const label = useDate ? `${d.getMonth()+1}/${d.getDate()}`
      : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return { x: x(t), label };
  });
  return { points, ticks };
}
```

**File**: `tests/utils/timeline.test.ts` — parse valid/invalid; empty→empty; chronological x order; undated excluded; same-time stacked + ticks length; bounds.

---

### Phase B: Store + types

**B1 — `src/types/index.ts`**: `export type ViewMode = 'cluster' | 'timeline'`; add `viewMode: ViewMode` + `setViewMode: (m: ViewMode) => void` to `AppState`.

**B2 — `src/store/useStore.ts`**: init `viewMode: 'cluster'`; `setViewMode: (viewMode) => set({ viewMode })`.

---

### Phase C: Hook

**File**: `src/hooks/useTimeline.ts`
```typescript
export function useTimeline(width, height) {
  const articles = useStore(s => s.articles);
  return useMemo(() => calculateTimeline(articles, width, height), [articles, width, height]);
}
```

---

### Phase D: ArticleScatter integration (P1 + P2 + P3)

**File**: `src/components/output/ArticleScatter.tsx`
1. Read `viewMode`, `setViewMode`; `const isTimeline = viewMode === 'timeline'`.
2. `const { points: clusterPoints, clusters } = useClustering(w,h)`; `const { points: timelinePoints, ticks } = useTimeline(w,h)`; `const points = isTimeline ? timelinePoints : clusterPoints`.
3. Controls row (right): add `[ CLUSTER | TIMELINE ]` segmented control; show `[ SENTIMENT | TOPIC ]` only when `!isTimeline`; keep Field toggle + count.
4. `ClassificationField visible={showClassificationField && !isTimeline}`.
5. Cluster proportion labels: wrap in `{!isTimeline && ...}`.
6. Time axis: when `isTimeline`, render a bottom axis line + `ticks` (faint vertical gridline + label), `z-20 pointer-events-none`.
7. Dots/hover/detail: unchanged over `points`.

---

### Phase E: Verify

- `npx tsc --noEmit` clean; `npm test` all pass (incl. new timeline tests)
- Manual: toggle Cluster↔Timeline → dots re-arrange smoothly; busy time = tall stack; ticks readable; hover/click + colors unchanged; cluster-mode toggle hidden in timeline; field hidden in timeline; view persists in session

---

## Post-Design Constitution Re-check

All pass. Timeline math is a pure, unit-tested function; the component selects between two position sources; sentiment color and interactions are shared; no new dependency; cluster artifacts (field, labels) correctly scoped to cluster view.
