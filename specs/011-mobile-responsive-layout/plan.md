# Implementation Plan: Mobile-Responsive Layout

**Branch**: `011-mobile-responsive-layout` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-mobile-responsive-layout/spec.md`

---

## Summary

Make the app responsive with pure Tailwind breakpoints. Below `lg` (1024px) the three zones stack vertically (NeuralPanel → ArticleScatter → ArticleStrip) inside a scrolling page; at `≥ lg` the existing desktop 3-column shell is unchanged. Inline px sizes in `page.tsx` move to responsive classes so containers differ per breakpoint; the self-measuring visualizations adapt automatically. The article detail becomes a full-width dismissable sheet on mobile (400px side panel on desktop). Touch works via the existing tap→detail path; hover preview stays a desktop nicety. A viewport meta ensures device-width scaling. No store/logic/test changes — presentation only; existing tests stay green.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS v4, Framer Motion 12. No new dependency.

**Storage**: None (no state changes)

**Testing**: Vitest 4 — no new unit tests (CSS/layout has no pure logic); existing 43 tests must stay green. Verification is a manual viewport matrix.

**Target Platform**: Web — phones (~320px) → desktop (1920px+)

**Performance Goals**: No layout jank on resize/rotate; reflow is instant (CSS, no JS)

**Constraints**: Desktop (≥1024px) layout unchanged; no horizontal overflow 320–1920px; all features reachable; dark/glass style preserved

**Scale/Scope**: Layout-only edits across 5 existing files + viewport meta

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Mobile-Responsive First | ✅ **Now satisfied** | This feature delivers the responsive layout deferred in 001–010 |
| II. High Performance | ✅ Pass | Pure CSS breakpoints; no JS detection, no jank |
| III. Data Privacy & Security | ✅ Pass | No data changes |
| IV. Component-Based Architecture | ✅ Pass | Responsive classes within existing components; no new coupling |
| V. Continuous Automated Testing | ✅ Pass (justified) | No new pure logic to unit-test; existing suite stays green; manual viewport matrix documented |
| Technology Stack | ✅ Pass | Tailwind already present; no new dependency |

---

## Project Structure

```text
specs/011-mobile-responsive-layout/
├── plan.md  research.md  data-model.md
├── contracts/ui-components.md
└── tasks.md  (/speckit-tasks)
```

### Source Code Changes (all responsive-class edits)

```text
UPDATE:
  src/app/page.tsx                              ← stack vs row; scroll; responsive zone sizing; header compaction
  src/app/layout.tsx                            ← viewport meta (device-width)
  src/components/shared/ArticleDetailPanel.tsx  ← full-width sheet on mobile; percentage slide
  src/components/output/ArticleScatter.tsx      ← controls wrap/tighten; touch tap target
  src/app/globals.css                           ← (optional) coarse-pointer tap enlargement

UNCHANGED (self-adapt via ResizeObserver / received className):
  NeuralPanel.tsx (sizes from container), ArticleStrip.tsx (w-full h-[180px]),
  clustering/timeline/field/hooks/store — no logic touched
```

---

## Implementation Phases

### Phase A: Viewport + page shell (P1 — the layout)

**A1 — `src/app/layout.tsx`**: add
```typescript
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };
```

**A2 — `src/app/page.tsx`** responsive rewrite of the shell:
- `<main className="flex flex-col bg-[#050508] text-white min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden">`
- Header: `h-[72px] px-4 lg:px-6 ...`; wrap `SOURCE`/version in `<span className="hidden sm:inline ...">` (status always visible); right group `gap-3 lg:gap-5`
- Content container: `flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden z-10`
- `<NeuralPanel className="w-full h-[300px] shrink-0 border-b border-white/[0.05] lg:w-[360px] lg:h-auto lg:border-b-0 lg:border-r" />` (remove `style` width)
- Output column: `<div className="flex flex-col w-full lg:flex-1 lg:min-h-0 lg:min-w-0">`
  - Scatter wrapper: `<div className="relative w-full h-[55vh] min-h-[360px] lg:flex-1 lg:h-auto lg:min-h-0"><ArticleScatter /></div>`
  - `<ArticleStrip className="shrink-0 h-[180px]" />` (remove `style` height)
- Keep `NEURAL_PANEL_WIDTH`/`ARTICLE_STRIP_HEIGHT` imports only if still referenced; otherwise remove

---

### Phase B: Adaptive article detail (P1 touch)

**`src/components/shared/ArticleDetailPanel.tsx`**:
- Panel `className`: `... w-full lg:w-[400px]` (remove fixed `style={{ width: 400 }}`; keep `top`/`bottom`)
- Framer: `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}`
- Keep backdrop tap-to-dismiss + close button

---

### Phase C: Controls + touch in the scatter (P1 touch)

**`src/components/output/ArticleScatter.tsx`**:
- Top controls row: `absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-[72%] lg:top-4 lg:right-5 lg:gap-3 lg:max-w-none` so toggles never overflow on narrow screens
- Section label: hide on very small if it crowds (`hidden sm:block`) — optional
- Dots: keep `onClick` (tap → detail). Add a coarse-pointer hit enlargement (via a class + globals.css rule) so the 24px dot is comfortably tappable; do not change desktop visuals
- (Optional) guard the hover card render with a `hover: hover` check so it doesn't linger on touch

**`src/app/globals.css`** (optional):
```css
@media (pointer: coarse) {
  .dot-hit::after { content: ''; position: absolute; inset: -8px; }
}
```

---

### Phase D: Verify

- `npx tsc --noEmit` clean; `npm test` 43/43 still pass (no logic changed)
- Manual viewport matrix (320 / 375 / 768 / 1024 / 1280 / 1920): no horizontal overflow; all three zones reachable; keyword add/remove, dot tap→detail, view/cluster/field toggles all work by tap; detail is full-width sheet < lg and 400px panel ≥ lg; desktop ≥1024 visually unchanged; rotate portrait/landscape OK

---

## Complexity Tracking

| Item | Note |
|---|---|
| No new tests | Pure CSS/layout; no unit-testable logic. Existing suite is the regression guard; correctness verified by the manual viewport matrix (documented). |

---

## Post-Design Constitution Re-check

All pass — and Principle I (Mobile-Responsive First) flips from "justified exception" to **satisfied**. No new dependency, no store/logic changes, desktop preserved, every feature reachable on mobile.
