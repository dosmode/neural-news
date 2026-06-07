# Feature Specification: Mobile-Responsive Layout

**Feature Branch**: `011-mobile-responsive-layout`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "모바일 반응형 레이아웃 지원" — make the Neural News app usable on mobile and tablet, not just desktop.

## Overview

The app today is desktop-only: a fixed three-zone horizontal layout (neural filter panel on the left, output visualization in the center, article feed at the bottom) that assumes a wide landscape screen. On a phone this overflows, clips content, and depends on hover — so the app is effectively unusable on the devices most readers actually carry.

This feature makes the layout **responsive**: on phones and tablets the three zones reflow into a touch-friendly arrangement where every zone and control is reachable, nothing overflows horizontally, and every hover-only affordance has a tap equivalent. This finally honors the product's "mobile-responsive first" principle. The desktop experience is unchanged at large widths.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use the App on a Phone (Priority: P1)

A reader opens the app on their phone (portrait). Instead of a cramped, overflowing desktop layout, they get a layout that fits the narrow screen: the keyword/neural area, the output visualization, and the article feed are all reachable, with no content cut off or requiring horizontal scrolling.

**Why this priority**: Without a usable mobile layout the app is broken on the majority of devices. Every other mobile concern depends on the layout fitting first.

**Independent Test**: Open the app on a 375px-wide viewport. Confirm: no horizontal scrollbar, no clipped controls, and all three zones (neural filter, output visualization, article feed) are reachable.

**Acceptance Scenarios**:

1. **Given** a phone-width viewport, **When** the app loads, **Then** there is no horizontal overflow and no content is clipped off-screen
2. **Given** a phone-width viewport, **When** the reader navigates the app, **Then** the neural filter area, the output visualization, and the article feed are all reachable
3. **Given** the desktop-width viewport, **When** the app loads, **Then** the existing three-column desktop layout is unchanged
4. **Given** the device is rotated between portrait and landscape, **When** the layout reflows, **Then** it remains usable with no overflow in either orientation

---

### User Story 2 - Touch Interactions Work (Priority: P1)

On a touch device, the reader can tap keyword nodes, tap dots to see an article, tap the view/mode controls, and add or remove keywords — all without a mouse. Affordances that rely on hover on desktop (the dot preview card) have a tap-based equivalent.

**Why this priority**: A layout that fits but can't be operated by touch is still unusable. Touch is the primary input on the target devices.

**Independent Test**: On a touch device (or touch emulation), tap a keyword node (toggles), tap a dot (opens the article detail), tap the view toggle (switches view), and add a keyword — each works by tap with no hover required.

**Acceptance Scenarios**:

1. **Given** a touch device, **When** the reader taps a keyword node, **Then** it toggles active/inactive
2. **Given** a touch device, **When** the reader taps an article dot, **Then** the article detail opens (no hover required)
3. **Given** the desktop hover preview is unavailable on touch, **When** the reader taps a dot, **Then** they still reach the article information (the tap opens detail in place of hover preview)
4. **Given** a touch device, **When** the reader taps the view/cluster/field controls, **Then** each control responds with an adequately sized tap target
5. **Given** a touch device, **When** the reader adds a keyword, **Then** the input is usable with the on-screen keyboard and the control is not hidden behind it

---

### User Story 3 - Tablet and Mid-Size Layout (Priority: P2)

A reader on a tablet (or a resized window) gets an intermediate layout that uses the extra space better than the phone layout but adapts from the full desktop arrangement — no broken in-between states at medium widths.

**Why this priority**: Tablets and resized browser windows are common; the layout must degrade gracefully across the whole width range, not just at two fixed sizes. Lower than P1 because phones are the critical target.

**Independent Test**: Resize the viewport smoothly from 320px to 1920px. Confirm there is no width at which the layout breaks (overlap, overflow, invisible content); transitions between layouts are clean.

**Acceptance Scenarios**:

1. **Given** a tablet-width viewport, **When** the app loads, **Then** the layout is usable and uses the available space without overflow
2. **Given** the viewport is resized across the full range, **When** it crosses layout breakpoints, **Then** there is no width with overlapping or clipped content
3. **Given** any supported width, **When** the layout settles, **Then** all zones and controls remain reachable

---

### Edge Cases

- What happens at very small widths (~320px)? → Content still fits with no horizontal scroll; controls wrap or stack rather than overflow
- What happens with the on-screen keyboard open while adding a keyword? → The input stays visible and is not covered by the keyboard
- What happens to the article detail panel on mobile? → It adapts to the small screen (e.g., full-width or bottom sheet) instead of a fixed desktop side panel, and can be dismissed
- What happens to dense dot visualizations on a small screen? → Dots and labels remain legible and tappable; the visualization scales to the available area
- What happens on landscape phone? → Layout adapts to the short height without clipping critical controls
- What happens to hover-only tooltips on touch? → Replaced or supplemented by tap behavior; no information is reachable only via hover

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The layout MUST reflow below the desktop width so there is no horizontal overflow on phone and tablet viewports (down to ~320px)
- **FR-002**: All three zones (neural/keyword filter, output visualization, article feed) MUST remain reachable on mobile and tablet
- **FR-003**: The desktop layout MUST remain unchanged at large widths
- **FR-004**: All interactive controls (keyword nodes, dots, view/mode/field toggles, add/remove keyword, sliders) MUST be operable by touch with adequately sized tap targets
- **FR-005**: Every affordance that relies on hover on desktop (e.g., the dot preview card) MUST have a tap-based equivalent on touch devices so no information is hover-only
- **FR-006**: The article detail view MUST adapt to small screens (full-width or bottom sheet) and be dismissable, rather than a fixed desktop side panel
- **FR-007**: The add-keyword input MUST remain visible and usable with an on-screen keyboard (not hidden behind it)
- **FR-008**: The layout MUST remain usable across orientation changes (portrait/landscape) without overflow
- **FR-009**: Dot visualizations and their labels MUST remain legible and tappable when scaled to a small screen
- **FR-010**: There MUST be no viewport width in the supported range (≈320px–1920px) at which content overlaps, clips, or becomes unreachable
- **FR-011**: No existing feature (keyword management, cluster/topic modes, classification field, timeline) may become unreachable on mobile; each remains accessible (possibly via an adapted control)
- **FR-012**: Text MUST remain readable on mobile without the user needing to pinch-zoom

### Key Entities

- **Layout Breakpoint**: A viewport-width threshold at which the arrangement changes (e.g., mobile / tablet / desktop). Determines how the three zones are arranged.
- **Zone**: One of the three functional areas (neural filter, output visualization, article feed) that must be reachable at every breakpoint.
- **Touch Target**: An interactive element sized adequately for finger tapping on touch devices.
- **Adaptive Detail View**: The article detail presentation that switches between a desktop side panel and a mobile-friendly full-width/sheet form.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At every viewport width from 320px to 1920px there is zero horizontal page overflow
- **SC-002**: 100% of interactive controls are reachable and operable by touch on a phone viewport (no mouse/hover required)
- **SC-003**: A reader on a phone can complete each core task — add a keyword, open an article, switch the output view — without pinch-zooming, in under 30 seconds each, verified by observation
- **SC-004**: No information presented on desktop is reachable only via hover on touch devices (100% has a tap path)
- **SC-005**: The desktop layout at ≥1280px is visually unchanged from before this feature (verified by comparison)
- **SC-006**: Resizing across the full width range produces zero broken states (no overlap/clip/unreachable content) at any width

## Assumptions

- Supported range is roughly 320px (small phone) to 1920px+ (desktop); the existing desktop layout is preserved at large widths.
- The three zones are rearranged for small screens rather than removed; the exact arrangement (stacked, tabbed, or collapsible) is a design decision to settle in planning, provided all zones stay reachable.
- The neural-network and scatter visualizations are scaled to fit the available area on small screens rather than redesigned; their meaning is preserved.
- Touch and pointer inputs are both supported; the app does not detect a single "mobile device," it responds to viewport size and input capability.
- The article detail becomes full-width or a bottom sheet on small screens; on desktop it remains the existing side panel.
- No new data, navigation routes, or pages are added; this is a presentation/layout change over the existing features (001–010).
- Performance and animation budgets from prior features still apply; the mobile layout must not introduce jank.
- Visual style (dark neon aesthetic, glassmorphism) is preserved across breakpoints.
