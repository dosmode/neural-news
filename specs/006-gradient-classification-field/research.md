# Research: Gradient Classification Field

**Feature**: 006-gradient-classification-field | **Date**: 2026-05-31

---

## Decision 1: Canvas-based Additive Influence Heatmap

**Decision**: Render the classification field as an HTML `<canvas>` layer behind the article dots. For each article dot, draw a radial gradient (sentiment color at center → transparent at edge) using `globalCompositeOperation = 'lighter'` (additive blending). Overlapping influence zones blend and intensify, producing a smooth decision-boundary-style heatmap.

**Rationale**:
- Additive radial gradients are exactly how heatmaps (and the TensorFlow Playground decision field) achieve smooth color blends
- Canvas with `'lighter'` compositing is GPU-friendly and handles 100 overlapping gradients at 60fps — far faster than 100 blurred SVG filter elements
- A single canvas redraw on data change is cheap (one pass over ≤100 dots)
- Per-dot radius (~35% of the smaller panel dimension) gives generous overlap → smooth blend, not isolated blobs
- Reuses existing dot positions from `useClustering` — no new data or fetch

**Algorithm** (per redraw):
```
clear canvas
ctx.globalCompositeOperation = 'lighter'
for each point:
  color = sentiment → rgba(neon-blue) | rgba(neon-red) | rgba(neutral-grey)
  grd = ctx.createRadialGradient(x, y, 0, x, y, R)
  grd.addColorStop(0, color @ alpha≈0.5)
  grd.addColorStop(1, color @ alpha 0)
  ctx.fillStyle = grd; ctx.fillRect(0,0,w,h)   // or fill a circle path
reset compositing
```
A subtle `filter: blur(24px)` on the canvas element (CSS) further smooths boundaries.

**Alternatives considered**:
- **SVG radial gradients + `<feGaussianBlur>`**: rejected — 100 filtered elements stutter; harder to additively blend colors
- **Per-pixel IDW interpolation (heatmap.js style)**: rejected — accurate but O(width×height×dots) per frame; overkill for a visualization, risks <60fps
- **CSS `radial-gradient()` stacked backgrounds**: rejected — CSS doesn't additively blend multiple radial-gradients; would need `mix-blend-mode` per layer = many DOM nodes

---

## Decision 2: Color Mapping (reuse sentiment palette)

**Decision**: Map sentiment → field color using the existing neon palette:
- positive → `rgba(0, 243, 255, a)` (neon-blue)
- negative → `rgba(255, 49, 49, a)` (neon-red)
- neutral → `rgba(120, 120, 140, a)` (dim grey-blue, low alpha so it reads as "uncertain/dark")

Center alpha ≈ 0.45, scaled by the Sentiment filter weight (FR-006) so the slider visibly intensifies/softens the field.

**Rationale**: Consistency with dots (FR-011); neutral stays dark so colored regions pop.

---

## Decision 3: Sentiment Weight Drives Intensity

**Decision**: The field's overall alpha multiplier = `0.4 + filterWeights['sentiment'] * 0.6`. Higher Sentiment weight → more saturated field; lower → fainter. This makes the existing Layer-2 "Sentiment" slider in `NeuralPanel` directly affect the field (satisfies FR-006).

**Rationale**: Ties the neural-panel controls to the output, reinforcing the metaphor without inventing new controls.

---

## Decision 4: Redraw Triggers & Smoothness

**Decision**: Redraw the canvas in a `useEffect` keyed on `[points, dimensions, sentimentWeight, showField]`. On/off toggle uses a CSS `opacity` transition (300ms) on the canvas element for a smooth fade (FR-007/FR-008). Data-change smoothness is carried by the dots' existing framer-motion spring repositioning — the field updates underneath as positions settle.

**Rationale**: A canvas content swap can't CSS-transition its pixels, but (a) the toggle fade and (b) the animated dots together deliver the "smooth, not snapping" requirement honestly. Avoids the complexity of double-buffered crossfade canvases.

**Loading behavior**: During re-fetch, keep the last field visible at reduced opacity (mirrors how dots dim to 0.35), so the panel never flips blank (edge case).

---

## Decision 5: Toggle State in Zustand (session-scoped)

**Decision**: Add `showClassificationField: boolean` (default `true`) and `toggleClassificationField()` to the Zustand store. A small button in the output panel header toggles it.

**Rationale**: Zustand is already the app's state layer; in-memory = session-scoped (matches the assumption that it need not persist across restarts). No localStorage needed.

---

## Decision 6: Layering & Interactivity

**Decision**: Canvas at `z-0` with `pointer-events: none`; dots stay at `z-10`; hover cards `z-50`. The field never intercepts clicks (FR-004, SC-005).

**Rationale**: Guarantees dots remain fully clickable and visible on top of the field.

---

## Decision 7: Zero / One Article Handling

**Decision**: If `points.length === 0`, skip drawing entirely (canvas cleared) — no misleading color (FR-009). With one article, a single soft radial glow appears around it; no full-panel artifact (acceptable per edge case).

**Rationale**: Directly satisfies the zero/one edge cases without special-casing beyond an early return.
