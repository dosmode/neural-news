# Data Model: Gradient Classification Field

**Feature**: 006-gradient-classification-field | **Date**: 2026-05-31

---

## Store Changes (AppState)

### Fields to ADD

| Field | Type | Default | Description |
|---|---|---|---|
| `showClassificationField` | `boolean` | `true` | Whether the gradient field is rendered behind dots (session-scoped) |

### Actions to ADD

| Action | Signature | Description |
|---|---|---|
| `toggleClassificationField` | `() => void` | Flips `showClassificationField` |

### Fields UNCHANGED (read by this feature)

| Field | Type | Use |
|---|---|---|
| `articles` | `Article[]` | Source of dot positions + sentiments (via `useClustering`) |
| `filterWeights` | `Record<string, number>` | `filterWeights['sentiment']` drives field intensity |
| `isLoading` | `boolean` | Field dims during re-fetch |

---

## Existing Entities (read-only here)

### MappedPoint (from useClustering)

| Field | Type | Use in this feature |
|---|---|---|
| `x` | `number` | Center X of the influence radial gradient |
| `y` | `number` | Center Y of the influence radial gradient |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | Selects the influence color |

---

## New Component-Level Concepts (not in Zustand)

### ClassificationField (rendering concern, inside ArticleScatter)

A `<canvas>` element sized to the panel. Not a stored entity — derived each render from `points`.

| Aspect | Value |
|---|---|
| Layer | `z-0`, `pointer-events: none`, behind dots |
| Per-dot influence radius `R` | `min(width, height) * 0.35` |
| Per-dot center alpha | `0.45 * intensityMultiplier` |
| `intensityMultiplier` | `0.4 + filterWeights['sentiment'] * 0.6` |
| Composite mode | `'lighter'` (additive) |
| CSS smoothing | `filter: blur(24px)` |
| Opacity (toggle/loading) | `showField ? (isLoading ? 0.5 : 1) : 0`, CSS-transitioned 300ms |

### Sentiment → Color Map

| Sentiment | Center color |
|---|---|
| positive | `rgba(0, 243, 255, α)` |
| negative | `rgba(255, 49, 49, α)` |
| neutral | `rgba(120, 120, 140, α)` |

All gradients fade the outer stop to the same color at `α = 0`.

---

## Validation / Invariants

- Field is only drawn when `points.length > 0` and `showClassificationField === true`
- Canvas backing-store size tracks `dimensions` (device-pixel-ratio aware for crisp rendering)
- Field never captures pointer events — dots remain fully interactive
- Color set is exactly the three sentiment families — no other colors introduced
