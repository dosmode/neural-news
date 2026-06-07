# Research: Mobile-Responsive Layout

**Feature**: 011-mobile-responsive-layout | **Date**: 2026-05-31

---

## Decision 1: Vertical stack below desktop, single `lg` breakpoint

**Decision**: Below the desktop breakpoint, the three zones **stack vertically** (NeuralPanel → ArticleScatter → ArticleStrip) inside a vertically-scrolling page. At and above the breakpoint, the existing desktop 3-column layout is unchanged. Use Tailwind's `lg` (1024px) as the single breakpoint: `< lg` = stacked, `≥ lg` = desktop.

**Rationale**:
- User chose vertical stack: simplest, everything reachable by scroll, no new navigation state.
- One breakpoint keeps the logic trivial and avoids broken in-between states (FR-010/SC-006). `lg` (1024px) keeps laptops/landscape-tablets on the rich desktop layout while phones/portrait-tablets stack. SC-005 ("≥1280px unchanged") holds since ≥1024 ⊇ ≥1280.

**Alternatives considered**: tabbed switcher (more complex, adds view state), output-centric with drawers (hides the neural metaphor) — both rejected per the user's vertical-stack choice.

---

## Decision 2: Pure-CSS responsive (Tailwind), no JS breakpoint detection

**Decision**: Implement entirely with Tailwind responsive utilities (`lg:` prefixes) and CSS. No `useIsMobile`/JS matchMedia state. Replace the inline `style={{ width }}`/`{{ height }}` px props in `page.tsx` with responsive classNames so they can differ per breakpoint.

**Rationale**:
- CSS breakpoints have no hydration flash, no JS, and reflow instantly on resize/rotate (FR-008). Inline `style` can't be made responsive, so those px values move to responsive classes.
- The visualization components already self-measure via `ResizeObserver` — they adapt to whatever box size CSS gives them, so only their **containers** need responsive sizing.

**Consequence**: No new unit-testable logic; verification is visual/manual + existing tests stay green (this is a presentation change).

---

## Decision 3: Sized containers for the absolute-positioned visualizations

**Decision**: On mobile, give each self-measuring visualization a definite height so its `ResizeObserver`/`absolute inset-0` has a box to fill:
- NeuralPanel container: `w-full h-[300px]` on mobile → `lg:w-[360px] lg:h-auto` on desktop
- ArticleScatter wrapper: `h-[55vh] min-h-[360px]` on mobile → `lg:flex-1 lg:h-auto` on desktop
- ArticleStrip: keep `h-[180px]`

**Rationale**: `ArticleScatter` and `NeuralPanel` position children absolutely and measure the parent; a collapsed (0-height) parent would hide them. Explicit mobile heights guarantee a visible box; the components' existing measurement handles the rest (dots/nodes reposition for the new size).

---

## Decision 4: Page scroll on mobile, fixed on desktop

**Decision**: `<main>` switches from `h-screen overflow-hidden` to allowing vertical scroll below `lg`: `min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden`. The content container switches `flex-row` → `flex-col lg:flex-row` and drops the desktop `flex-1 min-h-0` constraints on mobile (children have explicit heights and the page scrolls).

**Rationale**: Stacked zones exceed viewport height → the page must scroll on mobile; desktop stays a fixed non-scrolling app shell (unchanged).

---

## Decision 5: Touch = tap-to-detail replaces hover preview

**Decision**: The dot **hover preview** (HoverCard, `onMouseEnter`) is a desktop enhancement; on touch there is no hover, and the existing **`onClick` → open article detail** is the tap path that surfaces the same info and more (FR-005). No hover-only information remains. Optionally suppress the lingering hover card on coarse pointers via `@media (hover: none)`.

**Rationale**: The click handler already exists and opens the full detail; the hover card duplicates a subset. So the tap path is already complete — we just ensure nothing is hover-exclusive.

**Touch targets**: bump small controls' padding and enlarge the dot tap area on coarse pointers (`@media (pointer: coarse)`) so dots/toggles meet a comfortable tap size (FR-004).

---

## Decision 6: Article detail = full-width sheet on mobile

**Decision**: `ArticleDetailPanel` becomes full-width on mobile and the fixed 400px side panel on desktop: width `w-full lg:w-[400px]`; animate with `x: '100%' → 0` (percentage) instead of a fixed 400px so it works at any width (FR-006). Backdrop tap still dismisses.

**Rationale**: A 400px panel on a 375px phone would overflow; full-width sheet is the standard mobile detail pattern. Percentage slide keeps the animation correct regardless of width.

---

## Decision 7: Header + controls compaction on small screens

**Decision**:
- Header: hide the non-critical right-side items (`SOURCE: …`, version) below `sm`; keep the status indicator and title. Reduce horizontal padding on mobile (`px-4 lg:px-6`).
- ArticleScatter top controls row: allow wrap and tighten gaps on mobile so the View/Cluster/Field toggles + count never overflow (`flex-wrap`, smaller gap, `max-w` guard).

**Rationale**: At 320–375px the header and control rows would overflow; compacting non-essential text and allowing wrap prevents horizontal overflow (FR-001/SC-001).

---

## Decision 8: Viewport meta

**Decision**: Ensure a proper viewport is declared via Next.js `export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }` in `layout.tsx` (allow user zoom up to 5x but design so it's not required — FR-012).

**Rationale**: Guarantees device-width scaling so the responsive CSS takes effect and text is readable without forced pinch-zoom.
