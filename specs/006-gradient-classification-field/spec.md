# Feature Specification: Gradient Classification Field (Decision Boundary Heatmap)

**Feature Branch**: `006-gradient-classification-field`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "그라디에이션으로 분류가 할수는 없나?" (Can classification be shown with a gradient?) — referencing the TensorFlow Playground output panel, where data points sit on top of a smooth blue↔orange gradient background that visualizes how the network classifies the 2D space.

## Overview

In the TensorFlow Playground reference, the output panel is not just scattered dots — the dots rest on a **gradient heatmap background** that colors each region of the space according to the model's classification. Blue regions mean "classified one way," orange regions mean "the other," and the smooth blend between them is the decision boundary.

This feature brings that same concept to the Neural News output (scatter) panel: behind the article dots, render a smooth color gradient field that visualizes how the active keyword filters and weights "classify" the space — so the user can see at a glance which regions of the map lean positive vs. negative (and how strongly), not just where individual articles land.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the Classification Field Behind Articles (Priority: P1)

A news reader looks at the output panel and sees, behind the article dots, a smooth color gradient: regions where positive-sentiment articles cluster glow in the positive color, regions where negative-sentiment articles cluster glow in the negative color, and the space between blends smoothly. This lets the reader perceive the overall "mood map" of the news at a glance — not just individual dots.

**Why this priority**: This is the core of the request. The gradient classification field is the defining visual of the TensorFlow Playground metaphor and turns the scatter from "just dots" into an interpretable map of how the news is classified.

**Independent Test**: Load the app with articles present. Confirm a smooth multi-color gradient fills the output panel background behind the dots. Confirm regions dense with positive (blue) dots are tinted blue, and regions dense with negative (red) dots are tinted red, with a smooth blend between them.

**Acceptance Scenarios**:

1. **Given** articles are displayed as dots, **When** the output panel renders, **Then** a smooth gradient heatmap appears behind the dots, colored by the sentiment of nearby articles
2. **Given** a region has mostly positive articles, **When** the user views that region, **Then** the background there is tinted the positive color
3. **Given** a region has mostly negative articles, **When** the user views that region, **Then** the background there is tinted the negative color
4. **Given** a region has mixed or no articles, **When** the user views that region, **Then** the background there is neutral/dark, blending smoothly into colored regions
5. **Given** the dots are drawn, **When** the gradient is behind them, **Then** the dots remain clearly visible and distinguishable on top of the gradient

---

### User Story 2 - Field Updates with Filter Changes (Priority: P2)

When the reader toggles a keyword or adjusts a filter weight (e.g., the Sentiment slider), the gradient classification field recomputes and re-colors to reflect the new filter state — visually reinforcing that the filters drive the classification.

**Why this priority**: A static gradient is informative, but the value of the neural-network metaphor is that the filters change the classification. Making the field respond to filter changes closes the loop between the neural panel controls and the output.

**Independent Test**: Note the gradient pattern. Toggle a keyword off (or move the Sentiment weight slider). Within a short delay, observe the gradient field re-color to a visibly different pattern.

**Acceptance Scenarios**:

1. **Given** the gradient field is rendered, **When** the user toggles a keyword, **Then** the field recomputes and re-colors within 1 second of the new articles loading
2. **Given** the gradient field is rendered, **When** the user adjusts a filter weight slider, **Then** the field re-colors within 1 second to reflect the new weighting
3. **Given** the field is recomputing, **When** the transition happens, **Then** the color change animates smoothly rather than snapping abruptly

---

### User Story 3 - Toggle the Field On/Off (Priority: P3)

A reader who prefers a cleaner view can toggle the gradient classification field off, leaving just the dots on a plain dark background, and toggle it back on.

**Why this priority**: Some users may find the heatmap visually busy. A toggle respects user preference without removing the feature. Lower priority because the default-on experience already delivers the core value.

**Independent Test**: Find the toggle control in the output panel. Click it — the gradient disappears, leaving dots on dark background. Click again — the gradient returns.

**Acceptance Scenarios**:

1. **Given** the gradient field is shown, **When** the user clicks the field toggle, **Then** the gradient hides and only dots remain on a dark background
2. **Given** the gradient field is hidden, **When** the user clicks the toggle again, **Then** the gradient reappears
3. **Given** the toggle state is set, **When** the user interacts with other controls, **Then** the toggle state persists for the session

---

### Edge Cases

- What happens with zero articles? → No gradient is rendered (or a flat neutral background); the panel does not show misleading color
- What happens with only one article? → A soft localized glow of that article's sentiment color around its position; no full-panel gradient artifacts
- What happens when all articles are the same sentiment? → The field is predominantly that one color, fading to neutral at the edges away from dots
- What happens when the panel is resized? → The gradient field re-fits to the new dimensions without stretching artifacts
- What happens during loading/re-fetch? → The previous gradient stays visible (dimmed) until the new field is computed, consistent with how dots behave

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The output panel MUST render a smooth color gradient field behind the article dots, where each region's color is determined by the sentiment of the articles near that region
- **FR-002**: Regions near positive-sentiment articles MUST be tinted the positive color; regions near negative-sentiment articles MUST be tinted the negative color; regions far from any article MUST be neutral/dark
- **FR-003**: The gradient between differently-classified regions MUST be smooth (continuous blend), not a hard edge
- **FR-004**: Article dots MUST remain clearly visible and distinguishable on top of the gradient field
- **FR-005**: The gradient field MUST recompute and re-color when the set of articles changes (keyword toggle or new fetch) within 1 second of the new data being available
- **FR-006**: The gradient field MUST respond to filter weight changes (e.g., Sentiment weight) by re-coloring within 1 second
- **FR-007**: Color transitions of the field MUST animate smoothly rather than snapping
- **FR-008**: Users MUST be able to toggle the gradient field on and off; the default state is ON
- **FR-009**: With zero articles, the system MUST NOT render a misleading colored field (flat neutral or no field)
- **FR-010**: The gradient field MUST re-fit correctly when the output panel is resized
- **FR-011**: The gradient field's color scheme MUST be consistent with the existing sentiment colors (positive = blue family, negative = red family, neutral = dark)

### Key Entities

- **Classification Field**: A 2D color map covering the output panel area. Each point's color is derived from the weighted influence of nearby article dots' sentiments. The defining new entity of this feature.
- **Article Dot**: Existing entity. Its position and sentiment now contribute as an "influence source" to the classification field, in addition to being a clickable point.
- **Field Toggle**: A UI control (on/off) that shows or hides the classification field. Session-scoped state.
- **Sentiment Weight**: Existing filter weight that influences how strongly sentiment drives the field coloring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When articles are present, 100% of the output panel background shows a gradient field (no blank/untinted output when data exists and the field is on)
- **SC-002**: A user can correctly identify the "most positive region" and "most negative region" of the map within 5 seconds of looking at it — verified by observation
- **SC-003**: After a keyword toggle or filter change, the gradient field visibly re-colors within 1 second of the data updating
- **SC-004**: The gradient field renders and animates smoothly at 60fps with up to 100 article dots present
- **SC-005**: Article dots remain individually clickable and visually distinct on top of the field 100% of the time
- **SC-006**: Toggling the field off and on returns the view to the expected state 100% of the time

## Assumptions

- The classification field is derived from the sentiment and position of the currently displayed article dots — it is a visualization of the existing data, not a new machine-learning model
- The positive/negative/neutral color mapping reuses the existing sentiment palette (blue = positive, red = negative, dark = neutral)
- "Classification" here means the visual decision-boundary metaphor from TensorFlow Playground, not a formal classifier with accuracy metrics
- The field is a background layer; it must never obscure or reduce the interactivity of the article dots
- Desktop-first (1280px+), consistent with the rest of the app; the field scales down gracefully on smaller screens
- The field updates are debounced to align with the existing fetch/clustering cadence; it does not introduce new data fetching
- The field toggle state is remembered for the browser session but does not need to persist across full app restarts
- Performance: the field is an approximate heatmap (smooth blend of influence zones), not a per-pixel exact computation, to keep rendering fast
