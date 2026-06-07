# Implementation Plan: Gradient Classification Field (Decision Boundary Heatmap)

**Branch**: `006-gradient-classification-field` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-gradient-classification-field/spec.md`

---

## Summary

Add a TensorFlow-Playground-style decision-boundary heatmap behind the article dots in the output panel. A canvas layer draws one additive radial gradient per article (colored by sentiment), producing a smooth blended field that shows which regions of the map lean positive (blue) vs. negative (red). The field reacts to keyword toggles and the Sentiment filter weight, and can be toggled on/off. No new data or fetching — it is a pure visualization of the existing dot positions and sentiments.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Zustand 5, Framer Motion 12, D3 7 (already used for clustering), HTML Canvas 2D (no new dependency)

**Storage**: Client-side Zustand (in-memory); one new boolean field

**Testing**: Vitest 4 (existing `clustering.test.ts` unaffected)

**Target Platform**: Web browser, desktop 1280px+ primary

**Performance Goals**: Field renders + animates at 60fps with up to 100 dots (SC-004)

**Constraints**: Reuse existing sentiment palette; field must never block dot interactivity; no new network calls

**Scale/Scope**: ≤100 dots; one canvas redraw per data/weight/resize change

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ⚠️ Justified Exception | Desktop-first, consistent with prior features; field scales with panel |
| II. High Performance | ✅ Pass | Canvas additive blend is GPU-friendly; single redraw per change |
| III. Data Privacy & Security | ✅ Pass | No data collection; visualizes existing public-RSS-derived sentiment |
| IV. Component-Based Architecture | ✅ Pass | New `ClassificationField` component; ArticleScatter composes it |
| V. Continuous Automated Testing | ✅ Pass | Pure color-mapping helper is unit-testable; existing tests unaffected |
| Technology Stack | ✅ Pass | No new dependency; Canvas is a browser primitive |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-gradient-classification-field/
├── plan.md              ← This file
├── research.md          ← 7 technical decisions
├── data-model.md        ← Store + field entity
├── contracts/
│   └── ui-components.md ← Component contracts
└── tasks.md             ← /speckit-tasks output
```

### Source Code Changes

```text
CREATE:
  src/components/output/ClassificationField.tsx   ← canvas heatmap layer
  src/utils/sentimentField.ts                     ← pure helpers (color map + intensity)
  tests/utils/sentimentField.test.ts              ← unit tests for helpers

UPDATE:
  src/components/output/ArticleScatter.tsx         ← render field + toggle button
  src/store/useStore.ts                            ← showClassificationField + toggle action
  src/types/index.ts                               ← AppState additions

UNCHANGED:
  src/hooks/useClustering.ts, src/utils/clustering.ts (field reuses points)
  src/components/neural/*, src/app/page.tsx, src/app/api/*
```

---

## Implementation Phases

### Phase A: Store + Types (Foundational)

**A1 — `src/types/index.ts`**: Add to `AppState`:
```typescript
showClassificationField: boolean;
toggleClassificationField: () => void;
```

**A2 — `src/store/useStore.ts`**: Initialize `showClassificationField: true`; add action:
```typescript
toggleClassificationField: () => set((s) => ({ showClassificationField: !s.showClassificationField })),
```

---

### Phase B: Pure Helpers + Tests

**B1 — `src/utils/sentimentField.ts`**:
```typescript
import { Article } from '@/types';

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function sentimentFieldColor(sentiment: Article['sentiment'], alpha: number): string {
  switch (sentiment) {
    case 'positive': return `rgba(0,243,255,${alpha})`;
    case 'negative': return `rgba(255,49,49,${alpha})`;
    default:         return `rgba(120,120,140,${alpha})`;
  }
}

export function fieldIntensity(sentimentWeight: number): number {
  return 0.4 + clamp01(sentimentWeight) * 0.6; // 0.4 .. 1.0
}
```

**B2 — `tests/utils/sentimentField.test.ts`**: cover (1) each sentiment → correct rgba prefix, (2) alpha is interpolated into the string, (3) `fieldIntensity` returns 0.4 at weight 0 and 1.0 at weight 1, (4) clamps out-of-range weights.

---

### Phase C: ClassificationField Component (P1 core)

**File**: `src/components/output/ClassificationField.tsx`

```tsx
'use client';
import { useRef, useEffect } from 'react';
import { MappedPoint } from '@/types';
import { sentimentFieldColor } from '@/utils/sentimentField';

interface Props {
  points: MappedPoint[];
  width: number; height: number;
  intensity: number;   // 0..1
  visible: boolean;
  dimmed: boolean;
}

export default function ClassificationField({ points, width, height, intensity, visible, dimmed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    if (points.length === 0) return;

    const R = Math.min(width, height) * 0.35;
    const centerAlpha = 0.45 * intensity;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of points) {
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      grd.addColorStop(0, sentimentFieldColor(p.sentiment, centerAlpha));
      grd.addColorStop(1, sentimentFieldColor(p.sentiment, 0));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [points, width, height, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
      style={{
        width, height,
        filter: 'blur(24px)',
        opacity: visible ? (dimmed ? 0.5 : 1) : 0,
      }}
    />
  );
}
```

---

### Phase D: Integrate into ArticleScatter (P1 + P3 toggle)

**File**: `src/components/output/ArticleScatter.tsx`

1. Read from store: `showClassificationField`, `toggleClassificationField`, `filterWeights`
2. Compute `intensity = fieldIntensity(filterWeights['sentiment'] ?? 0.5)`
3. Render `<ClassificationField>` as the first child inside the container (before the dots `z-10` layer), passing `points`, `dimensions`, `intensity`, `visible={showClassificationField}`, `dimmed={isLoading}`
4. Add a toggle button near the article count (top-right area):
```tsx
<button
  onClick={toggleClassificationField}
  className={`absolute top-4 right-32 z-20 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors
    ${showClassificationField
      ? 'border-neon-blue/50 text-neon-blue'
      : 'border-white/15 text-white/30 hover:text-white/50'}`}
>
  Field {showClassificationField ? 'ON' : 'OFF'}
</button>
```

---

### Phase E: Verify

- `npx tsc --noEmit` clean
- `npm test` — existing 5 + new sentimentField tests pass
- Manual: gradient appears behind dots; toggling keyword re-colors; Sentiment slider changes intensity; Field ON/OFF button hides/shows; dots still clickable

---

## Post-Design Constitution Re-check

All principles pass post-design. No new dependencies, no data collection, new logic isolated in a pure helper (tested) + one presentational canvas component. Dot interactivity preserved via `pointer-events: none` on the field.
