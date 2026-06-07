# Implementation Plan: Neural News UI/UX Complete Redesign

**Branch**: `005-neural-ui-redesign` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-neural-ui-redesign/spec.md`

---

## Summary

Complete visual and structural redesign of the Neural News app. Replace ReactFlow with a custom SVG neural network panel. Restructure the layout from 3-equal-columns to a left neural panel (360px) + right output area (scatter on top, article strip on bottom). Replace the center-screen modal with a slide-in side panel. Add data-flow animations on neural connections. The data pipeline (fetch, clustering, store) is unchanged — only the presentation layer changes.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Zustand 5, Framer Motion 12, D3 7

**Removing**: `reactflow` package (replaced by custom SVG)

**Storage**: Client-side in-memory (Zustand); no changes

**Testing**: Vitest 4 (existing); existing `clustering.test.ts` remains valid

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: 60fps animations with up to 100 dots; panel transitions ≤16ms first-frame

**Constraints**: Dark neon aesthetic preserved; existing data pipeline (fetch, clustering, store) unchanged

**Scale/Scope**: Single-user browser app; ~50–100 articles per view

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first per spec assumptions; 1280px+ primary target |
| II. High Performance | ✅ Pass | 60fps animation target; SVG > ReactFlow for bundle size |
| III. Data Privacy & Security | ✅ Pass | No new data collection; public RSS only |
| IV. Component-Based Architecture | ✅ Pass | Each component has a single clear responsibility |
| V. Continuous Automated Testing | ✅ Pass | Existing `clustering.test.ts` unchanged; visual smoke test added |
| Technology Stack | ✅ Pass | React/TypeScript + Next.js throughout |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-neural-ui-redesign/
├── plan.md              ← This file
├── research.md          ← Technical decisions
├── data-model.md        ← Entity + store schema
├── contracts/
│   └── ui-components.md ← Component interface contracts
└── tasks.md             ← /speckit-tasks output
```

### Source Code Changes

```text
DELETE (replaced):
  src/components/graph/           ← entire directory (4 files)
  src/components/map/CurationMap.tsx
  src/components/shared/ArticleList.tsx
  src/components/shared/ArticleModal.tsx

CREATE (new):
  src/components/neural/
  └── NeuralPanel.tsx             ← SVG neural network (replaces NetworkGraph)
  src/components/output/
  ├── ArticleScatter.tsx          ← enhanced dots (replaces CurationMap)
  └── ArticleStrip.tsx            ← horizontal list (replaces ArticleList)
  src/components/shared/
  └── ArticleDetailPanel.tsx      ← slide-in panel (replaces ArticleModal)
  src/utils/
  └── layout.ts                   ← shared layout constants

UPDATE (modified):
  src/app/page.tsx                ← new 2-panel layout
  src/app/globals.css             ← add neuralFlow + dotPulse animations
  src/store/useStore.ts           ← remove currentGradient field
  src/types/index.ts              ← remove currentGradient from AppState
  package.json                    ← remove reactflow dependency

UNCHANGED (no modifications):
  src/app/api/gdelt/route.ts
  src/app/layout.tsx
  src/hooks/useClustering.ts
  src/hooks/useGdeltFetch.ts
  src/services/gdeltService.ts
  src/utils/clustering.ts
  tests/utils/clustering.test.ts
  vitest.config.ts
```

---

## Implementation Phases

### Phase A: Foundation (CSS animations + constants + store cleanup)

**A1 — Add animations to `src/app/globals.css`**:
```css
@keyframes neuralFlow {
  from { stroke-dashoffset: 60; }
  to   { stroke-dashoffset: 0; }
}
.animate-neural-flow {
  animation: neuralFlow 1.8s linear infinite;
}
```

**A2 — Create `src/utils/layout.ts`** with shared constants:
```typescript
export const NEURAL_PANEL_WIDTH = 360;
export const ARTICLE_STRIP_HEIGHT = 180;
export const ARTICLE_DETAIL_WIDTH = 400;
export const HEADER_HEIGHT = 72;
export const DOT_SIZE = 24;
export const CARD_WIDTH = 200;
```

**A3 — Clean up `src/store/useStore.ts`**: Remove `currentGradient` field and `currentGradient` from AppState.

**A4 — Update `src/types/index.ts`**: Remove `currentGradient` from `AppState` interface.

---

### Phase B: NeuralPanel — Custom SVG Neural Network

**File**: `src/components/neural/NeuralPanel.tsx`

**Architecture**:
```
<div> [relative, w-full, h-full]
  <svg> [absolute inset-0, pointer-events-none, z-0]
    — one <path> per edge, with stroke-dashoffset animation when isActive
  </svg>
  <div> [absolute inset-0, z-10]
    — one positioned div per node (keyword pill or filter card)
```

**Node position formula** (computed from `panelWidth × panelHeight`):
```typescript
const LAYERS = { input: 0.12, hidden1: 0.48, hidden2: 0.82 };
const inputNodes = KEYWORD_DEFINITIONS.map((kw, i) => ({
  x: panelWidth * LAYERS.input,
  y: topPad + i * inputSpacing,
}));
const hidden1Nodes = layer1DynamicNodes.map((n, i) => ({
  x: panelWidth * LAYERS.hidden1,
  y: topPad + i * hiddenSpacing,
}));
const hidden2Nodes = LAYER_2_NODES.map((n, i) => ({
  x: panelWidth * LAYERS.hidden2,
  y: topPad + i * hiddenSpacing,
}));
```

**Edge paths**: Cubic bezier between `(source.x, source.y)` and `(target.x, target.y)`:
```typescript
const d = `M ${sx} ${sy} C ${sx + cpOffset} ${sy} ${tx - cpOffset} ${ty} ${tx} ${ty}`;
```

**KeywordPill visual** (active):
```
bg-neon-blue/15 border-2 border-neon-blue text-neon-blue
box-shadow: 0 0 20px rgba(0,243,255,0.35), inset 0 0 10px rgba(0,243,255,0.1)
animate-pulse
```

**KeywordPill visual** (inactive):
```
bg-black border border-white/15 text-white/30
hover: border-white/30
```

**FilterCard visual**:
```
bg-black/60 border border-neon-purple/40 text-neon-purple
min-w-[130px] rounded-lg p-2.5
```

---

### Phase C: ArticleScatter — Enhanced Output Visualization

**File**: `src/components/output/ArticleScatter.tsx`

Largely the same as the current `CurationMap.tsx` but:
1. Uses `DOT_SIZE = 24` from `layout.ts`
2. Uses `ResizeObserver` (already done)
3. Improved `HoverCard` glassmorphic styling
4. Article count badge is more prominent (`text-sm font-mono text-white/40`, centered-top)
5. Loading re-fetch shows dots at 35% opacity (already done)
6. The container uses `absolute inset-0` (already done)

**Key visual difference**: The dots now have a subtle outer ring visible at rest (not only on ping):
```jsx
className={`
  absolute top-0 left-0 rounded-full cursor-pointer
  w-6 h-6                  ← DOT_SIZE via CSS var or constant
  ring-1 ring-inset ring-white/10    ← subtle edge ring
  ${sentimentClass}
`}
```

**Article count placement**: Move from bottom-right corner badge to a prominent top-right label:
```jsx
<div className="absolute top-4 right-4 z-20 text-sm font-mono text-white/40">
  {points.length} <span className="text-white/20">articles</span>
</div>
```

---

### Phase D: ArticleStrip — Horizontal Article List

**File**: `src/components/output/ArticleStrip.tsx`

**Structure**:
```jsx
<div className="h-full flex flex-col border-t border-white/5 bg-black/40">
  {/* Label */}
  <div className="px-4 py-1.5 text-[9px] font-mono text-white/25 uppercase tracking-widest shrink-0 border-b border-white/5">
    LIVE FEED · {articles.length} ARTICLES
  </div>
  {/* Horizontal scroll area */}
  <div
    className="flex-1 flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide"
    ref={scrollRef}
    onWheel={(e) => { e.preventDefault(); scrollRef.current.scrollLeft += e.deltaY; }}
  >
    {sortedArticles.map(article => <ArticleCard key={article.id} article={article} />)}
  </div>
</div>
```

**ArticleCard** (internal):
```jsx
<div
  onClick={() => setSelectedArticle(article.id)}
  className={`
    w-[200px] shrink-0 h-full rounded-lg cursor-pointer
    bg-white/[0.025] hover:bg-white/[0.05]
    border border-white/[0.07] hover:border-white/[0.15]
    border-l-2 ${sentimentBorderColor}
    transition-all duration-200 p-3
    ${isSelected ? 'ring-1 ring-neon-blue/50' : ''}
  `}
>
  <p className="text-white text-[11px] leading-snug line-clamp-2 mb-2">{article.title}</p>
  <div className="flex justify-between text-[9px] font-mono text-white/30">
    <span className="truncate max-w-[100px]">{article.domain}</span>
    <span>{formattedDate}</span>
  </div>
</div>
```

---

### Phase E: ArticleDetailPanel — Slide-In Side Panel

**File**: `src/components/shared/ArticleDetailPanel.tsx`

**Framer Motion animation**:
```jsx
<AnimatePresence>
  {selectedArticle && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 pointer-events-auto"
        onClick={() => setSelectedArticle(null)}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: ARTICLE_DETAIL_WIDTH }}
        animate={{ x: 0 }}
        exit={{ x: ARTICLE_DETAIL_WIDTH }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-[72px] bottom-0 z-50 w-[400px]
                   bg-black/95 border-l border-white/10 backdrop-blur-xl
                   flex flex-col overflow-hidden"
      >
        ...article content...
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Panel content sections**:
1. Close button (top-right X)
2. Type + sentiment badges
3. Article title (large, 3–4 lines)
4. Summary text
5. Relevance keyword chips
6. Domain + date (footer)
7. "Read Full Source Article" CTA button (full width, neon-blue)

---

### Phase F: New `page.tsx` Layout

**Complete rewrite**:
```jsx
'use client';
export default function Home() {
  useGdeltFetch();
  
  return (
    <main className="flex h-screen flex-col bg-[#050508] text-white overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 bg-gradient-radial from-neon-blue/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="z-20 h-[72px] w-full px-6 flex justify-between items-center
                         border-b border-white/[0.06] bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            NEURAL <span className="text-neon-blue">NEWS</span>
          </h1>
        </div>
        <div className="flex gap-4 text-[11px] font-mono text-white/30">
          <StatusIndicator />
          <span>MVP v1.0.0</span>
        </div>
      </header>
      
      {/* Main content: left neural panel + right output */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        <NeuralPanel />
        
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <ArticleScatter />
          <ArticleStrip />
        </div>
      </div>
      
      <ArticleDetailPanel />
    </main>
  );
}
```

---

### Phase G: Remove ReactFlow + Cleanup

1. Delete `src/components/graph/` directory (all 4 files)
2. Delete `src/components/map/CurationMap.tsx`
3. Delete `src/components/shared/ArticleList.tsx`
4. Delete `src/components/shared/ArticleModal.tsx`
5. Run `npm uninstall reactflow`
6. Run `npx tsc --noEmit` to verify clean

---

## Post-Design Constitution Re-check

All principles pass post-design. No new violations introduced.

The justified mobile-first exception is unchanged from the previous feature.

ReactFlow removal reduces bundle size and eliminates the style conflict risks noted during the feature's development.
