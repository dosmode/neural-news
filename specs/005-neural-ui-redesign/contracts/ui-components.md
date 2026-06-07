# UI Component Contracts: Neural News Redesign

**Feature**: 005-neural-ui-redesign | **Date**: 2026-05-30

These are the interface contracts for each new component — their props, responsibilities, and visual output guarantees.

---

## NeuralPanel

**File**: `src/components/neural/NeuralPanel.tsx`
**Replaces**: `src/components/graph/NetworkGraph.tsx` + KeywordNode + FilterNode + WeightEdge

**Responsibility**: Renders the complete neural network visualization (input keywords + SVG edges + hidden filter nodes) in a fixed-width left panel.

**Props**: None (reads from Zustand store directly)

**Store reads**:
- `activeKeywords` → keyword node active states
- `dynamicFilterNodes` → hidden layer nodes
- `filterWeights` → filter node slider values
- `toggleKeyword` → keyword click handler
- `setFilterWeight` → filter slider handler

**Output guarantee**:
- Keyword nodes are visually distinct (glow + size) when active vs inactive
- SVG edges from active keywords animate (`stroke-dashoffset` flow animation)
- SVG edges from inactive keywords are dim (opacity < 0.1)
- All nodes are clickable/interactive without event propagation issues
- Renders cleanly within `width: 360px` × any height

**Subcomponents**:
- `KeywordPill` — single keyword toggle button (inline or extracted)
- `FilterSlider` — single filter node card with weight slider (inline or extracted)

---

## ArticleScatter

**File**: `src/components/output/ArticleScatter.tsx`
**Replaces**: `src/components/map/CurationMap.tsx`

**Responsibility**: Renders article dots in a scatter visualization. Handles hover preview cards and dot click to open article detail.

**Props**: None (reads from Zustand store and `useClustering` hook)

**Store reads**:
- `isLoading`, `error`
- `setSelectedArticle`

**Hook**: `useClustering(width, height)` → `points: MappedPoint[]`

**Output guarantee**:
- One dot per article; no duplicates
- Dots have staggered entrance animation (4ms per dot delay)
- Hovering a dot shows a `HoverCard` with title, domain, date, sentiment
- Previously loaded dots remain visible (40% opacity) while new fetch loads
- Article count shown prominently (e.g., "89 articles")
- Uses `ResizeObserver` for reliable dimension tracking (absolute inset-0)

---

## HoverCard (internal to ArticleScatter)

**Responsibility**: Floating preview card shown when hovering an article dot.

**Props**:
```typescript
{
  point: MappedPoint;
  containerWidth: number;
  containerHeight: number;
}
```

**Output guarantee**:
- Glassmorphic style: `bg-black/95 border border-white/15 backdrop-blur-md rounded-xl`
- Positions to the right of the dot; flips left if near right edge
- Clipped to stay within container bounds
- Fades in/out with 120ms Framer Motion animation
- Pointer-events: none (does not capture mouse events itself)

---

## ArticleStrip

**File**: `src/components/output/ArticleStrip.tsx`
**Replaces**: `src/components/shared/ArticleList.tsx`

**Responsibility**: Horizontal scrollable strip of article cards at the bottom of the output area.

**Props**: None (reads from Zustand store)

**Store reads**: `articles`, `selectedArticleId`, `setSelectedArticle`, `isLoading`

**Output guarantee**:
- Articles sorted by most recently published first
- Each card: 200px wide, full height of strip; glassmorphic background
- Left border color reflects article sentiment (blue/red/white)
- Card shows: title (2 lines), domain, date
- Selected article (when detail panel open) is highlighted with stronger glow
- Mouse wheel scroll moves horizontally (not vertically)
- Fade gradient at left and right edges indicates scrollability
- Loading state: shows skeleton cards while `isLoading && articles.length === 0`

---

## ArticleDetailPanel

**File**: `src/components/shared/ArticleDetailPanel.tsx`
**Replaces**: `src/components/shared/ArticleModal.tsx`

**Responsibility**: Slide-in right panel showing full article details when a dot or card is clicked.

**Props**: None (reads from Zustand store)

**Store reads**: `selectedArticleId`, `articles`, `setSelectedArticle`

**Output guarantee**:
- Fixed position: right edge of viewport, full height below header
- Width: 400px (leaves neural panel and ~60% of scatter visible)
- Slides in from right (Framer Motion `x: 400 → x: 0`)
- Backdrop area (left of panel) is semi-transparent click-to-close zone
- Shows: article type badge, sentiment badge, title, summary, relevance keyword chips, domain, date, "Read Full Article" CTA button
- Does NOT cover the NeuralPanel (only overlaps ArticleScatter and ArticleStrip)

---

## Page Layout Contract (`src/app/page.tsx`)

**Layout structure**:
```
<main> [h-screen flex flex-col]
  ├── <Header> [h-[72px] shrink-0]
  ├── <div> [flex-1 flex flex-row min-h-0]
  │   ├── <NeuralPanel> [w-[360px] shrink-0 border-r]
  │   └── <div> [flex-1 flex flex-col min-h-0 min-w-0]
  │       ├── <ArticleScatter> [flex-1 min-h-0] (absolute inset-0 inside)
  │       └── <ArticleStrip> [h-[180px] shrink-0 border-t]
  └── <ArticleDetailPanel> [fixed, outside layout flow]
</main>
```

**Contract**:
- `NeuralPanel` and `ArticleScatter` are always simultaneously visible on 1280px+ screens
- `ArticleDetailPanel` uses `position: fixed` so it does not affect layout
- `min-h-0` on flex children prevents flex items from overflowing

---

## New CSS Animations (globals.css additions)

```css
@keyframes neuralFlow {
  from { stroke-dashoffset: 60; }
  to   { stroke-dashoffset: 0; }
}

.animate-neural-flow {
  animation: neuralFlow 1.8s linear infinite;
}

@keyframes dotPulse {
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50%       { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
}
```
