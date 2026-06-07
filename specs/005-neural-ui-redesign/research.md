# Research: Neural News UI/UX Complete Redesign

**Feature**: 005-neural-ui-redesign | **Date**: 2026-05-30

---

## Decision 1: Replace ReactFlow with Custom SVG Neural Network

**Decision**: Remove ReactFlow entirely. Replace with a custom SVG + HTML hybrid visualization.

**Rationale**:
- ReactFlow click events required `stopPropagation` hacks; custom HTML has no such interference
- ReactFlow's CSS overrides conflict with the dark neon aesthetic (requires fighting the library's default styles)
- The neural network is small and fixed (max 12 nodes): not complex enough to need a full graph library
- Custom SVG gives pixel-perfect control over connection animations, gradients, and glow effects
- Removes ~500KB bundle weight (reactflow package)
- SVG paths with `stroke-dashoffset` animation create the "data flowing" effect natively

**Implementation pattern**: HTML `<div>` for nodes (positioned absolutely within a relative container), SVG `<path>` for edges (rendered in an absolutely-positioned SVG layer behind the nodes). Positions calculated from layout constants.

**Alternatives considered**:
- Keep ReactFlow with heavy CSS override: rejected — too many edge cases, click fixes already fragile
- Use D3 for the network: rejected — D3 is already used for article clustering; mixing D3 DOM manipulation with React causes complexity; the fixed-size network doesn't benefit from D3

---

## Decision 2: Layout — Left Neural Panel + Right Output Area

**Decision**: 2-panel layout with `NeuralPanel` at fixed `w-[360px]` on the left, and the output area (`flex-1`) on the right. The output area is itself split vertically: `ArticleScatter` on top (`flex-1`) and `ArticleStrip` at the bottom (`h-[180px]`).

```
┌──────────────────────────────────────────────────────────────────┐
│ Header                                                           │
├──────────────────┬───────────────────────────────────────────────┤
│  NeuralPanel     │  ArticleScatter (flex-1)                      │
│  360px           │  (dots, hover cards, article count)           │
│  (keyword nodes  │                                               │
│   + SVG edges    │                                               │
│   + filter nodes)│                                               │
│                  ├───────────────────────────────────────────────┤
│                  │  ArticleStrip (180px)                         │
│                  │  (horizontal scrollable article cards)        │
└──────────────────┴───────────────────────────────────────────────┘
```

**Rationale**:
- `ArticleScatter` gets ~65–80% of the screen width instead of ~33% — much more room for dots
- `NeuralPanel` has a fixed width so it doesn't shrink awkwardly as window narrows
- `ArticleStrip` below the scatter creates a natural "detail view" relationship: the list shows what's in the scatter
- Left→right data flow is spatially obvious: keywords (left) → neural processing (left panel) → articles (right)
- Eliminates the awkward right sidebar that competed with the scatter for vertical space

**Alternatives considered**:
- Keep 3-column layout: rejected — article scatter never got enough space
- Full-screen scatter + floating neural panel: rejected — the panel would obscure articles
- Tabs (neural / scatter / list): rejected — breaks "simultaneous visibility" requirement (FR-001)

---

## Decision 3: Article Detail — Slide-In Right Panel (Not Modal)

**Decision**: Replace `ArticleModal` with `ArticleDetailPanel` — a `position: fixed` panel that slides in from the right edge, covering only the `ArticleStrip` area and partially overlapping `ArticleScatter`. Width: 400px. The `NeuralPanel` and most of `ArticleScatter` remain visible.

**Rationale**:
- Full-screen modal violates FR-007 ("does not fully obscure the neural network visualization")
- 400px side panel leaves the neural network fully visible
- Slide-in animation feels native to the dark dashboard aesthetic
- Article detail opens in context — the corresponding dot in the scatter can be highlighted

**Implementation**: `position: fixed; right: 0; top: header_height; bottom: 0; width: 400px` with Framer Motion `x: 400 → x: 0` entrance animation. Backdrop click closes it.

---

## Decision 4: SVG Connection Animation — Stroke-Dashoffset

**Decision**: Use CSS `stroke-dashoffset` animation on SVG paths for the "data flowing through the network" visual effect on active connections.

**Pattern**:
```css
@keyframes neuralFlow {
  from { stroke-dashoffset: 60; }
  to { stroke-dashoffset: 0; }
}
```
Active edges: `stroke-dasharray: 6 10; animation: neuralFlow 1.5s linear infinite`
Inactive edges: `stroke-dasharray: none; opacity: 0.05; no animation`

**Rationale**: Pure CSS animation = no JavaScript cost; runs on GPU; creates an unmistakable "data is flowing" visual that directly addresses the filter→article feedback requirement (FR-003).

---

## Decision 5: ArticleStrip — Horizontal Scroll with Mouse Wheel Passthrough

**Decision**: `ArticleStrip` is a horizontally scrollable `overflow-x: auto` container. Each card is `w-[200px] shrink-0`. Scrolling with the mouse wheel is intercepted (using `onWheel` with `scrollLeft` delta) so vertical scroll doesn't accidentally navigate away.

**Card design**: Glassmorphic (`bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm`), left border colored by sentiment, article title (2 lines), domain, date. Clicking a card opens `ArticleDetailPanel` for that article.

---

## Decision 6: Remove `currentGradient` from AppState

**Decision**: The `currentGradient` field in `AppState` is used only for the background gradient in `page.tsx`. With the new design, the background will use a static dark gradient + a fixed animated radial glow. Remove `currentGradient` from the store and from `useClustering`'s return value.

**Rationale**: Reduces unnecessary Zustand state and re-renders. The `calculateGradient` function in `clustering.ts` can be deleted or kept for future use.

---

## Decision 7: NeuralPanel Node Layout — Fixed Grid Positions

**Decision**: Keyword nodes and filter nodes are positioned using a fixed grid formula based on the panel's dimensions. Input layer at `x=0.18` (18% of panel width), hidden layer 1 at `x=0.55`, hidden layer 2 at `x=0.85`. Vertical spacing calculated from node count.

This is simpler and more predictable than a physics simulation or the ReactFlow auto-layout.

**Node positions computed as:**
```typescript
const inputX = panelWidth * 0.15;
const hidden1X = panelWidth * 0.52;
const hidden2X = panelWidth * 0.82;
const nodeSpacing = (panelHeight - 80) / (nodeCount + 1);
```

---

## Decision 8: Dependency Removal

**Decision**: Remove `reactflow` from `package.json` dependencies after the new `NeuralPanel` component is implemented. This reduces bundle size.

The `reactflow/dist/style.css` import in `NetworkGraph.tsx` will also be removed.
