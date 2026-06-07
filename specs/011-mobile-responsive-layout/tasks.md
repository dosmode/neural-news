---
description: "Tasks for Mobile-Responsive Layout"
---

# Tasks: Mobile-Responsive Layout

**Input**: Design documents from `specs/011-mobile-responsive-layout/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: No new unit tests — this is a pure CSS/layout change with no new logic. Existing 43 tests must stay green; correctness is verified by a manual viewport matrix.

**Organization**: Tasks grouped by user story. US1 (phone layout fits) + US2 (touch works) are the P1 MVP; US3 (tablet/mid-size) is mostly free once breakpoints exist.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** Tailwind v4 already configured; no new dependency.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The viewport meta so device-width scaling applies (all responsive CSS depends on it).

⚠️ **CRITICAL**: Without correct viewport scaling, mobile breakpoints won't behave.

- [x] T001 Add a viewport export to `src/app/layout.tsx`: `export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };` (keep existing `metadata`)

**Checkpoint**: Page scales to device width on a phone; `npx tsc --noEmit` clean.

---

## Phase 3: US1 — Use the App on a Phone (Priority: P1) 🎯 MVP

**Goal**: Below `lg` (1024px) the three zones stack vertically with no horizontal overflow and the page scrolls; at `≥ lg` the desktop layout is unchanged.

**Independent Test**: At 375px width: no horizontal scrollbar, nothing clipped, all three zones (neural / output / feed) reachable by vertical scroll; at ≥1024px the 3-column desktop layout is unchanged.

### Implementation for US1

- [x] T002 [US1] Rewrite the shell in `src/app/page.tsx` to be responsive: `<main>` → `flex flex-col bg-[#050508] text-white min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden`; the content container → `flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 lg:overflow-hidden z-10`; `<NeuralPanel>` → `className="w-full h-[300px] shrink-0 border-b border-white/[0.05] lg:w-[360px] lg:h-auto lg:border-b-0 lg:border-r"` and REMOVE its inline `style={{ width: NEURAL_PANEL_WIDTH }}`; output column → `<div className="flex flex-col w-full lg:flex-1 lg:min-h-0 lg:min-w-0">`; scatter wrapper → `<div className="relative w-full h-[55vh] min-h-[360px] lg:flex-1 lg:h-auto lg:min-h-0"><ArticleScatter /></div>`; `<ArticleStrip className="shrink-0 h-[180px]" />` and REMOVE its inline `style={{ height: ARTICLE_STRIP_HEIGHT }}`; remove now-unused `NEURAL_PANEL_WIDTH`/`ARTICLE_STRIP_HEIGHT` imports if no longer referenced
- [x] T003 [US1] Compact the header in `src/app/page.tsx` for small screens: header `px-4 lg:px-6`; wrap the right-side `SOURCE: GOOGLE NEWS RSS` and `MVP v1.0.0` spans in `hidden sm:inline` (keep `<StatusIndicator />` always visible); right group gap `gap-3 lg:gap-5` so nothing overflows at ~320–375px

**Checkpoint**: At 375px the zones stack and the page scrolls with no horizontal overflow; at ≥1024px the desktop layout is byte-for-byte unchanged.

---

## Phase 4: US2 — Touch Interactions Work (Priority: P1)

**Goal**: All controls operable by tap; the article detail is a full-width dismissable sheet on mobile; hover-only info has a tap path.

**Independent Test**: On a touch viewport, tap a keyword (toggles), tap a dot (opens detail), tap view/cluster/field toggles, add a keyword — all by tap; the detail covers the screen as a sheet and dismisses.

### Implementation for US2

- [x] T004 [P] [US2] Make the article detail adaptive in `src/components/shared/ArticleDetailPanel.tsx`: panel width responsive `w-full lg:w-[400px]` (remove the fixed `width: 400` from its inline `style`, keep `top`/`bottom`); change the Framer animation to percentage so it works at any width: `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}`; keep the backdrop tap-to-dismiss and close button
- [x] T005 [US2] Prevent control overflow + improve touch in `src/components/output/ArticleScatter.tsx`: change the top controls container to wrap and tighten on mobile — `absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-[72%] lg:top-4 lg:right-5 lg:gap-3 lg:max-w-none`; confirm tapping a dot opens detail (existing `onClick` — no change) so no hover is required; (optional) add `className` hooks so dots get a larger tap area on coarse pointers
- [x] T006 [P] [US2] (Optional, only if needed for comfortable tap size) add a coarse-pointer rule to `src/app/globals.css`: under `@media (pointer: coarse)` enlarge the dot tap area (e.g. a `.dot-hit::after { content:''; position:absolute; inset:-8px; }` applied to the dot wrapper) and/or guard the hover preview with `@media (hover: hover)` so it doesn't linger on touch — without changing desktop visuals

**Checkpoint**: Every control works by tap; the detail is a full-width sheet < lg and the 400px side panel ≥ lg; no information is hover-only.

---

## Phase 5: US3 — Tablet and Mid-Size Layout (Priority: P2)

**Goal**: No broken state at any width across the full range; tablets/resized windows degrade gracefully.

**Independent Test**: Resize 320→1920px smoothly — no width with overlap, overflow, or unreachable content; clean transition at the `lg` breakpoint.

### Implementation for US3

- [x] T007 [US3] Verify and patch mid-range widths in `src/app/page.tsx` + `src/components/output/ArticleScatter.tsx`: confirm the single `lg` breakpoint produces no broken layout at 640/768/1024/1280px (the stacked layout covers <1024, desktop covers ≥1024); if any control row or panel overflows at an in-between width, add the minimal responsive class to fix it (e.g. `sm:` adjustments). No new breakpoint system — just ensure the existing `lg` split is clean across the range

**Checkpoint**: Smooth resize across 320–1920px with zero broken states.

---

## Phase 6: Polish & Verification

- [x] T008 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (43/43 existing tests still pass — no logic changed)
- [x] T009 Manual viewport matrix verification at 320 / 375 / 768 / 1024 / 1280 / 1920px: (a) no horizontal overflow at any width; (b) all three zones reachable on mobile; (c) keyword add/remove, dot tap→detail, and view/cluster/field toggles all work by tap; (d) detail is full-width sheet < lg and 400px panel ≥ lg; (e) desktop ≥1024 visually unchanged; (f) portrait↔landscape rotation OK; (g) on-screen keyboard does not hide the add-keyword input

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (T001)**: viewport meta — do first (cheap, enables correct scaling).
- **US1 (Phase 3)**: T002 (shell) → T003 (header). The core layout.
- **US2 (Phase 4)**: T004 (detail) ∥ T005 (scatter controls) ∥ T006 (optional css) — different files; after T002 lands (so the layout exists to tap-test).
- **US3 (Phase 5)**: T007 after US1 (verifies the breakpoint across widths).
- **Polish (Phase 6)**: after all.

### User Story Dependencies

- **US1 (P1)**: Foundational. → the layout
- **US2 (P1)**: After US1 shell (touch within the new layout). Files independent → parallelizable.
- **US3 (P2)**: After US1. Mostly verification + minor patches.

### Critical Path

```
T001 → T002 → T003 → (T004 ∥ T005 ∥ T006) → T007 → T008 → T009
```

---

## Parallel Execution Examples

```
After T002 (shell) lands:
  Task A (T004): ArticleDetailPanel responsive sheet
  Task B (T005): ArticleScatter controls wrap + touch
  Task C (T006): globals.css coarse-pointer (optional)
→ then T007 (mid-range verify) → T008 (tsc+test) → T009 (manual matrix)
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. T001 (viewport)
2. US1: T002 (shell) → T003 (header) → phone layout fits
3. US2: T004 (detail sheet) + T005 (controls/touch) → fully operable by touch
4. **STOP and VALIDATE**: phone usable end-to-end
5. Ship

### Then US3 + Polish

6. T007 (mid-range) → T008 (tsc+test) → T009 (manual matrix)

---

## Notes

- Pure CSS/Tailwind — no store, no logic, no new dependency, no new tests
- The self-measuring components (NeuralPanel, ArticleScatter) adapt automatically once their containers are responsively sized — do NOT add JS breakpoint detection
- Single `lg` (1024px) breakpoint keeps it simple; SC-005 (≥1280 unchanged) holds because ≥1024 ⊇ ≥1280
- Removing inline `style` width/height from `page.tsx` is essential — inline styles can't be made responsive
- T006 is optional: only add the coarse-pointer enlargement if 24px dots feel too small to tap in T009
