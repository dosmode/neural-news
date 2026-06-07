# Data Model: Timeline View

**Feature**: 010-timeline-view | **Date**: 2026-05-31

---

## New Type: ViewMode

```typescript
type ViewMode = 'cluster' | 'timeline';
```

---

## New Type: TimeTick

| Field | Type | Description |
|---|---|---|
| `x` | `number` | Pixel X of the tick on the time axis |
| `label` | `string` | Display label (`M/D` for >24h spans, else `HH:MM`) |

---

## Store Changes (AppState)

### Fields to ADD

| Field | Type | Default | Description |
|---|---|---|---|
| `viewMode` | `ViewMode` | `'cluster'` | Output arrangement (session-scoped) |

### Actions to ADD

| Action | Signature | Behavior |
|---|---|---|
| `setViewMode` | `(mode: ViewMode) => void` | Set the active output view |

Independent of `clusterMode` (Sentiment/Topic), which only applies in Cluster view.

---

## New Function: calculateTimeline (pure)

```
calculateTimeline(articles: Article[], width: number, height: number)
  → { points: MappedPoint[]; ticks: TimeTick[] }
```

**Steps**:
1. Empty/zero-dim → `{ points: [], ticks: [] }`
2. Dedup by `url`
3. Parse `seendate` → ms; drop unparseable (FR-008)
4. `min`/`max` time; if equal, pad ±1h
5. `x(t) = PAD + (t-min)/(max-min) * (width - 2*PAD)`
6. Sort by time; stack per x-column (`COL_W`) vertically (±step around center) for de-overlap
7. Clamp y to panel; build ~5 adaptive `ticks`

---

## Helper: parseSeendate (pure)

```
parseSeendate('YYYYMMDDTHHMMSSZ') → number (UTC ms) | null
```

---

## Constants (timeline.ts)

| Constant | Value | Meaning |
|---|---|---|
| `AXIS_PAD` | `60` | Horizontal padding so dots/labels don't clip |
| `COL_W` | `24` | Column width (px) for vertical stacking |
| `STACK_STEP` | `22` | Vertical spacing between stacked dots |
| `TICK_COUNT` | `5` | Number of time-axis ticks |
| `DAY_MS` | `86400000` | Span threshold for date vs time labels |

---

## Hook: useTimeline

```
useTimeline(width, height) → { points: MappedPoint[]; ticks: TimeTick[] }
```
Reads `articles` from the store; memoizes `calculateTimeline(articles, width, height)`.

---

## ArticleScatter selection

| `viewMode` | points source | extra render | hidden |
|---|---|---|---|
| `cluster` | `useClustering` → points | cluster labels, classification field | time axis |
| `timeline` | `useTimeline` → points | time axis + ticks | cluster labels, classification field |

Dot color = `point.sentiment` in both (unchanged). Hover/click shared.

---

## Invariants

- Dots with valid times appear in chronological x-order (FR-002, SC-003)
- Dot `sentiment` (color) identical across views; only x/y differ (SC-004)
- Undated articles excluded from timeline positioning, never break the axis (FR-008)
- Same-time set → padded axis, dots stacked vertically, still individually visible (edge case)
- Empty input → `{ points: [], ticks: [] }`
