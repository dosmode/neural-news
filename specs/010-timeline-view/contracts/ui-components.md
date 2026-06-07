# Contracts: Timeline View

**Feature**: 010-timeline-view | **Date**: 2026-05-31

---

## timeline.ts (new, pure)

**File**: `src/utils/timeline.ts`

```typescript
export interface TimeTick { x: number; label: string; }

export function parseSeendate(s: string): number | null; // UTC ms or null

export function calculateTimeline(
  articles: Article[],
  width: number,
  height: number,
): { points: MappedPoint[]; ticks: TimeTick[] };
```

**Behavior**:
- Empty articles or zero dims → `{ points: [], ticks: [] }`
- Dedup by url; parse `seendate`; drop unparseable
- Linear time→x across `[AXIS_PAD, width-AXIS_PAD]`; same-time → ±1h pad
- Column-stack vertically (busy time = taller stack) so dots stay distinct
- ~5 adaptive ticks: `M/D` if span >1 day else `HH:MM`
- Never throws; deterministic for a given input

---

## useTimeline (new hook)

**File**: `src/hooks/useTimeline.ts`

```typescript
function useTimeline(width: number, height: number): { points: MappedPoint[]; ticks: TimeTick[] };
```
Reads `articles` from store; `useMemo(() => calculateTimeline(articles, width, height), [articles, width, height])`.

---

## Store (modified)

**File**: `src/store/useStore.ts` + `src/types/index.ts`

- Add `type ViewMode = 'cluster' | 'timeline'`
- `AppState`: `viewMode: ViewMode` (init `'cluster'`) + `setViewMode: (m: ViewMode) => void`
- Action: `setViewMode: (viewMode) => set({ viewMode })`

---

## ArticleScatter (modified)

**File**: `src/components/output/ArticleScatter.tsx`

1. Read `viewMode`, `setViewMode` (plus existing).
2. Compute both layouts:
   - `const { points: clusterPoints, clusters } = useClustering(w, h)`
   - `const { points: timelinePoints, ticks } = useTimeline(w, h)`
   - `const isTimeline = viewMode === 'timeline'`
   - `const points = isTimeline ? timelinePoints : clusterPoints`
3. **View toggle** in the controls row: segmented `[ CLUSTER | TIMELINE ]` → `setViewMode`.
4. **Cluster-mode toggle** (Sentiment/Topic) renders only when `!isTimeline`.
5. **Classification field**: `visible={showClassificationField && !isTimeline}`.
6. **Cluster proportion labels**: render only when `!isTimeline`.
7. **Time axis**: when `isTimeline`, render a horizontal axis line near the bottom with the `ticks` (vertical gridline + label per tick), `z-20`, `pointer-events-none`.
8. **Dots / hover / detail**: unchanged renderer over `points` (color from `point.sentiment`).
9. **Article count**: still shows `points.length`.

**Layout/contract notes**:
- Controls row order (right side): `[CLUSTER|TIMELINE]` · (`[SENTIMENT|TOPIC]` if cluster) · `Field ON/OFF` · count
- In timeline view the empty-state / loading / error blocks behave as today (gauged on `points`/`isLoading`/`error`)

---

## timeline.test.ts (new)

**File**: `tests/utils/timeline.test.ts`

- `parseSeendate('20260530T120000Z')` returns a finite ms; malformed/empty → `null`
- `calculateTimeline` empty input → `{ points: [], ticks: [] }`
- chronological order: given 3 articles with increasing `seendate`, returned points have strictly increasing `x` (after sort)
- undated excluded: an article with bad `seendate` is not in `points`
- same-time set: all-equal `seendate` → points share ~same `x` but distinct `y` (stacked), and ticks render (length === TICK_COUNT)
- all points within bounds `[0,width] × [0,height]`
