# Data Model: Mobile-Responsive Layout

**Feature**: 011-mobile-responsive-layout | **Date**: 2026-05-31

This feature is presentation/layout only — **no store state, no new data entities, no new types**. The "entities" are layout concepts expressed purely in CSS/Tailwind responsive classes.

---

## Layout Concept: Breakpoint

| Name | Width | Arrangement |
|---|---|---|
| Mobile/Tablet (`< lg`) | < 1024px | Vertical stack: NeuralPanel → ArticleScatter → ArticleStrip; page scrolls |
| Desktop (`≥ lg`) | ≥ 1024px | Existing 3-column app shell; fixed, non-scrolling |

Single breakpoint = Tailwind `lg` (1024px). SC-005 ("≥1280px unchanged") satisfied since ≥1024 ⊇ ≥1280.

---

## Zone Sizing (per breakpoint)

| Zone | Mobile (`< lg`) | Desktop (`≥ lg`) |
|---|---|---|
| Header | `h-[72px]`, compact (hide source/version `< sm`) | unchanged |
| NeuralPanel | `w-full h-[300px]`, border-bottom | `w-[360px] h-auto`, border-right (unchanged) |
| ArticleScatter wrapper | `h-[55vh] min-h-[360px] w-full` | `flex-1` (unchanged) |
| ArticleStrip | `h-[180px] w-full` | `h-[180px]` (unchanged) |
| ArticleDetailPanel | `w-full`, slide from `x:100%` | `w-[400px]` side panel (unchanged) |
| `<main>` | `min-h-screen overflow-y-auto`, `flex-col` | `h-screen overflow-hidden`, `flex-row` (unchanged) |

---

## Touch Adaptations (CSS only)

| Concern | Adaptation |
|---|---|
| Dot tap target | enlarge hit area on `@media (pointer: coarse)` |
| Small toggles | larger padding on mobile; remain tappable |
| Hover preview | desktop-only; tap → detail is the touch path (FR-005) |
| On-screen keyboard | page scrolls input into view; input not fixed-overlapped |

---

## Invariants

- No store/type changes; `viewMode`, `clusterMode`, keywords, etc. all unchanged
- Every existing feature reachable at every width (FR-011)
- Desktop (≥1024px) layout byte-for-byte unchanged (SC-005)
- No horizontal overflow at any width 320–1920px (SC-001)
