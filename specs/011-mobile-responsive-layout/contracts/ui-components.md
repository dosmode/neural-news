# Contracts: Mobile-Responsive Layout

**Feature**: 011-mobile-responsive-layout | **Date**: 2026-05-31

All changes are responsive-class edits to existing components. No new files, no logic, no store changes.

---

## page.tsx (modified)

**File**: `src/app/page.tsx`

- `<main>`: `flex flex-col bg-[#050508] text-white min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden`
- Header: `h-[72px] px-4 lg:px-6 ...`; wrap the right-side `SOURCE`/version spans in `hidden sm:flex` (keep status indicator always)
- Content container: `flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden z-10`
- `<NeuralPanel>`: replace inline `style={{ width }}` with responsive className `w-full h-[300px] shrink-0 border-b border-white/[0.05] lg:w-[360px] lg:h-auto lg:border-b-0 lg:border-r` (remove the `style` prop)
- Output column: `flex flex-col w-full lg:flex-1 lg:min-h-0 lg:min-w-0`
  - Scatter wrapper: `relative w-full h-[55vh] min-h-[360px] lg:flex-1 lg:h-auto lg:min-h-0`
  - `<ArticleStrip>`: `shrink-0 h-[180px]` (replace inline `style={{ height }}` with className)

**Contract**: at `≥ lg` the rendered desktop layout is identical to before; at `< lg` the three zones stack and the page scrolls vertically with no horizontal overflow.

---

## NeuralPanel.tsx (modified)

**File**: `src/components/neural/NeuralPanel.tsx`

- Already self-measures via `ResizeObserver`; no logic change. Accept the responsive sizing from its container (the `style` width prop from `page.tsx` is dropped; it now sizes via className). The `style` prop stays supported (optional) but page no longer passes a fixed width.
- Optional: ensure the add-keyword control and pills remain within the panel at ~320–375px widths (they already use the measured width).

**Contract**: nodes/edges/add-control render within the panel box at any width ≥ ~300px without clipping.

---

## ArticleScatter.tsx (modified)

**File**: `src/components/output/ArticleScatter.tsx`

- Top controls row: make it wrap and tighten on mobile so it never overflows — e.g. `absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-[70%] lg:top-4 lg:right-5 lg:gap-3 lg:max-w-none`
- Dots: add a coarse-pointer-friendly tap area (e.g. a class that, under `@media (pointer: coarse)`, increases the dot hit size) without changing desktop visuals
- Hover preview: unaffected on desktop; on touch the existing `onClick` opens detail (no change needed). Optionally guard the hover card with `@media (hover: hover)`.

**Contract**: tap a dot → detail opens (touch); controls never overflow the panel width; dots remain tappable on small screens.

---

## ArticleDetailPanel.tsx (modified)

**File**: `src/components/shared/ArticleDetailPanel.tsx`

- Width responsive: `w-full lg:w-[400px]` (replace fixed `style={{ width: 400 }}`)
- Slide animation: `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}` (percentage, not fixed px) so it works full-width on mobile and 400px on desktop
- Keep backdrop tap-to-dismiss and the close button

**Contract**: on mobile the detail is a full-width dismissable sheet; on desktop it is the existing 400px side panel; the neural panel stays visible behind it on desktop (unchanged).

---

## ArticleStrip.tsx (modified, minimal)

**File**: `src/components/output/ArticleStrip.tsx`

- Already a horizontal scroll strip; ensure it is `w-full` and `h-[180px]` via the className it receives from `page.tsx`. No internal change expected beyond confirming it fits full width.

---

## layout.tsx (modified)

**File**: `src/app/layout.tsx`

- Add `export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }` so device-width scaling applies and text is readable without forced zoom (FR-012).

---

## globals.css (modified, optional)

**File**: `src/app/globals.css`

- Optional small utility for coarse-pointer tap enlargement, e.g.:
```css
@media (pointer: coarse) {
  .dot-hit { padding: 6px; margin: -6px; } /* grows tap area, not visual */
}
```
(Only if needed to meet comfortable tap sizing.)

---

## Verification (manual / no new unit tests)

- This is a CSS/layout change with no new pure logic → no new unit tests. Existing suites must still pass.
- Manual matrix: 320 / 375 / 768 / 1024 / 1280 / 1920 px — check no horizontal overflow, all zones reachable, controls tappable, detail sheet works, desktop unchanged at ≥1024.
