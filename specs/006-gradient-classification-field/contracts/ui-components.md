# UI Component Contracts: Gradient Classification Field

**Feature**: 006-gradient-classification-field | **Date**: 2026-05-31

---

## ClassificationField

**File**: `src/components/output/ClassificationField.tsx` (new)

**Responsibility**: Render the canvas heatmap of sentiment influence zones behind the article dots.

**Props**:
```typescript
{
  points: MappedPoint[];      // dot positions + sentiments
  width: number;              // panel width (px)
  height: number;             // panel height (px)
  intensity: number;          // 0..1, from sentiment filter weight
  visible: boolean;           // showClassificationField
  dimmed: boolean;            // true while isLoading (reduce opacity)
}
```

**Output guarantee**:
- Renders a `<canvas>` absolutely positioned to fill its parent, `z-0`, `pointer-events: none`
- Draws one additive radial gradient per point (sentiment color → transparent), composite `'lighter'`
- Applies `filter: blur(24px)` for smooth boundaries
- Opacity = `visible ? (dimmed ? 0.5 : 1) : 0`, with `transition: opacity 300ms`
- Redraws when `points`, `width`, `height`, or `intensity` change
- Draws nothing (clears) when `points.length === 0`
- Canvas backing store uses `devicePixelRatio` for crisp rendering; CSS size = panel size

---

## ArticleScatter (modified)

**File**: `src/components/output/ArticleScatter.tsx`

**Changes**:
- Read `showClassificationField` and `filterWeights['sentiment']` from the store
- Render `<ClassificationField>` as the FIRST child (behind the dots `z-10` layer), passing `points`, `dimensions`, computed `intensity`, `visible`, `dimmed={isLoading}`
- Add a small toggle button in the panel header (near the article count) wired to `toggleClassificationField`
- No change to dot rendering, hover cards, loading/error/empty states

**Toggle button contract**:
- Position: top area of the output panel, near "N articles"
- Two states: ON (field icon highlighted, neon-blue) / OFF (dimmed white)
- Label/icon communicates "classification field"
- `onClick` → `toggleClassificationField()`
- Must not overlap or block the article-count text or section label

---

## Store (modified)

**File**: `src/store/useStore.ts` + `src/types/index.ts`

- Add `showClassificationField: boolean` (init `true`) to `AppState`
- Add `toggleClassificationField: () => void` action
- Action flips the boolean: `set((s) => ({ showClassificationField: !s.showClassificationField }))`

---

## Layering Contract (within ArticleScatter)

```
container (absolute inset-0)
├── ClassificationField   z-0   (canvas, pointer-events:none)   ← NEW
├── section label         z-20
├── article count + toggle z-20                                  ← toggle NEW
├── dots layer            z-10
├── hover card            z-50
└── loading/error/empty   z-20
```

Note: although the count/label are `z-20` and dots `z-10`, they don't overlap spatially (labels are in corners). The field is the only `z-0` layer, guaranteeing it sits behind everything and never blocks interaction.
