# Feature Specification: Working Filter Sliders & Neural Panel Redesign

**Feature Branch**: `012-filter-sliders-panel-redesign`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: The left Neural Filter panel's weight sliders don't appear to work — dragging them produces no visible change in the output (dot positions / clusters / field), so they feel like dead controls. The panel is also far too tight at 360px: keyword pills, connection edges, and sliders all overlap, making the sliders hard to even operate. Goal: (1) make the sliders genuinely, immediately, and intuitively affect the output, and (2) redesign the neural panel so information is rich yet uncramped, and the sliders and their effects are understandable at a glance with a clear feedback loop.

## Overview

The neural panel presents the product's core metaphor: input keywords flow through hidden "filter" layers (Sentiment, Recency, Relevance, and topic categories) into the output visualization. Each filter has a **weight slider**. Today those sliders are effectively inert — moving them changes almost nothing the reader can see, so the central interaction of the app feels broken. Worse, the panel crams keyword nodes, animated edges, and the sliders into a narrow column where they overlap, so the sliders are hard to read and hard to drag.

This feature does two things: it makes **every weight slider produce an immediate, visible, and understandable change in the output**, closing the feedback loop the neural metaphor promises; and it **redesigns the panel layout** so the inputs, filters, sliders, and their effects are legible and comfortable to operate, with clear visual connection between a slider and what it changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sliders Visibly Change the Output (Priority: P1)

A reader drags a filter weight slider (e.g., Sentiment, Recency, or Relevance) and immediately sees the output respond — the dots and/or the field change in a way that matches what that filter means. The sliders feel alive and in control, not decorative.

**Why this priority**: The reported defect is that the sliders do nothing. Making them actually drive the output is the core of the request; without it the neural metaphor is hollow.

**Independent Test**: Drag each filter slider from low to high and confirm a clear, immediate visible change in the output that corresponds to that filter's meaning; set it back and the change reverts.

**Acceptance Scenarios**:

1. **Given** articles are displayed, **When** the reader drags any filter weight slider, **Then** the output (dots and/or field) visibly changes within a moment of dragging
2. **Given** the Sentiment weight is increased, **When** the output updates, **Then** sentiment is more strongly expressed (e.g., stronger color/field emphasis on positive/negative articles); decreasing it mutes that emphasis
3. **Given** the Recency weight is increased, **When** the output updates, **Then** more recently published articles are more prominent (e.g., larger/brighter); decreasing it makes recency matter less
4. **Given** the Relevance weight is increased, **When** the output updates, **Then** articles more relevant to the active keywords are more prominent; decreasing it flattens that emphasis
5. **Given** a slider is moved, **When** the reader releases it, **Then** the resulting state persists until changed again (it does not snap back on its own)

---

### User Story 2 - Uncramped, Legible Panel (Priority: P1)

A reader looks at the neural panel and can clearly read each keyword, each filter, and each slider without elements overlapping. There is enough room to comfortably drag a slider, and the panel no longer feels like a tangle of crossing lines and stacked controls.

**Why this priority**: Even working sliders are unusable if they overlap edges and other controls. Decompressing the layout is required for the sliders to be operable and for the panel to be understood.

**Independent Test**: Open the panel and confirm no two interactive elements (keyword pills, filter cards, sliders) overlap; each slider has a clear, draggable track; labels are fully readable.

**Acceptance Scenarios**:

1. **Given** the neural panel is shown, **When** the reader views it, **Then** keyword nodes, filter cards, and sliders are spaced so none overlap and all labels are readable
2. **Given** the connection edges between layers, **When** they are drawn, **Then** they do not obscure or sit on top of the slider tracks or labels
3. **Given** a filter slider, **When** the reader drags it, **Then** the draggable area is large enough to operate comfortably without accidentally hitting another control
4. **Given** the panel must show inputs + filters + sliders, **When** it is laid out, **Then** it remains information-rich (nothing important removed) while feeling uncramped

---

### User Story 3 - Understand the Feedback Loop (Priority: P2)

A reader can tell, at a glance, what each slider controls and that moving it is what changed the output — the cause (slider) and effect (output change) are visually connected, so the interaction is self-explanatory.

**Why this priority**: Working, uncramped sliders still need to be *understood*. Making the cause→effect relationship obvious turns the panel from a control surface into an explanatory one. Lower than P1 because functional + legible already delivers the core fix.

**Independent Test**: Without instructions, a first-time user can state what a given slider does and confirm that moving it caused the output change they observed.

**Acceptance Scenarios**:

1. **Given** a filter slider, **When** the reader views it, **Then** its label clearly states what it controls (e.g., "Sentiment", "Recency", "Relevance") and its current value is shown
2. **Given** the reader moves a slider, **When** the output changes, **Then** there is a visible connection (e.g., the relevant filter and the affected output are highlighted/animated together) making the cause→effect obvious
3. **Given** a slider at a neutral/default position, **When** the reader views the panel, **Then** it is clear which sliders are boosted, which are reduced, and which are neutral

---

### Edge Cases

- What happens when a slider is set to its minimum (0)? → That filter contributes nothing to emphasis; the output reflects the absence of that dimension without breaking
- What happens when all sliders are at minimum? → The output still renders sensibly (e.g., neutral, evenly-weighted) rather than collapsing or going blank
- What happens when keywords change while sliders are set? → Slider values persist where still applicable; sliders for removed topics disappear, new topics start at the default
- What happens on a small/mobile screen? → The sliders remain operable by touch and do not overlap, consistent with the responsive layout
- What happens while a fetch is loading? → Slider changes still register and apply once data is present; the panel does not freeze
- What happens with very few articles? → Slider effects are still visible on whatever articles are present, without errors

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every filter weight slider MUST produce a visible change in the output (dots and/or field) when moved, within a short, perceptible delay
- **FR-002**: The Sentiment weight slider MUST control how strongly sentiment is expressed in the output (stronger at high, muted at low)
- **FR-003**: The Recency weight slider MUST control how strongly recently-published articles are emphasized
- **FR-004**: The Relevance weight slider MUST control how strongly articles' relevance to the active keywords is emphasized
- **FR-005**: Topic-category weight sliders MUST control the emphasis of the articles belonging to that topic
- **FR-006**: A slider's effect MUST be reversible — returning the slider to its prior position returns the output to its prior state
- **FR-007**: Each slider MUST display a clear label of what it controls and its current value
- **FR-008**: The neural panel MUST lay out keyword nodes, filter cards, and sliders so that no interactive elements overlap and all labels are readable
- **FR-009**: Connection edges between layers MUST NOT obscure or overlap the slider tracks or labels
- **FR-010**: Each slider MUST present a draggable area large enough to operate comfortably (including by touch) without accidentally triggering adjacent controls
- **FR-011**: The panel MUST remain information-rich (inputs, filters, sliders, and their state all present) while being visually uncramped
- **FR-012**: Moving a slider MUST give an immediate visual feedback that connects the control to the part of the output it affects (cause→effect is perceivable)
- **FR-013**: Slider values MUST persist for the session and not reset on their own after being set
- **FR-014**: When all sliders are at minimum, the output MUST still render sensibly (no blank or broken state)

### Key Entities

- **Filter Weight**: A 0–100% value for a given filter (Sentiment, Recency, Relevance, or a topic category) that determines how strongly that dimension influences the output's emphasis. The thing each slider controls.
- **Slider Control**: The interactive element that sets a Filter Weight; has a label, current value, and a comfortably draggable track.
- **Output Emphasis**: The visible properties of article dots (and the field) — such as size, brightness, position, and color strength — that the filter weights modulate.
- **Feedback Connection**: The visual link (highlight/animation) that ties a slider to the output it changes, making the cause→effect obvious.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Moving any filter slider produces a visible output change within 1 second, 100% of the time
- **SC-002**: A first-time user can correctly state what each of the Sentiment, Recency, and Relevance sliders does after observing its effect, in under 20 seconds each — verified by observation
- **SC-003**: In the redesigned panel, zero interactive elements overlap at the default desktop width, and every slider label is fully readable
- **SC-004**: A user can drag any slider to a target value on the first attempt without accidentally hitting an adjacent control, ≥95% of attempts
- **SC-005**: Returning a slider to its prior position restores the prior output state 100% of the time (effects are reversible)
- **SC-006**: At least 2 of 3 first-time users describe the panel as "clear" or "understandable" (not "cramped" or "confusing") when shown it cold

## Assumptions

- The four filter types and their meanings are: **Sentiment** (good/bad emphasis), **Recency** (newer-article emphasis), **Relevance** (keyword-match emphasis), and **Topic categories** (per-topic emphasis). These reuse the existing filter set shown in the panel.
- Filter weights modulate **emphasis** of article dots — primarily their size, brightness/opacity, and (for sentiment) color/field strength — and may subtly influence position; the precise visual mapping is a design detail to settle in planning, provided each slider has a clear, matching visible effect.
- The neural-network metaphor (input keywords → hidden filter layers → output) is preserved; this feature improves how that metaphor is laid out and made interactive, not replaced.
- The existing data (sentiment, publication time, keyword relevance per article) is sufficient to drive all slider effects; no new data source is required.
- Decompressing the panel may widen it, add spacing, or rearrange the filters/sliders, as long as all three zones of the overall app remain usable and the desktop/mobile layouts stay coherent (features 005, 011).
- Default slider position is the neutral midpoint; "boosted" and "reduced" are relative to that midpoint.
- Desktop-first, consistent with the app; sliders remain touch-operable on mobile per the responsive layout.
- Existing sentiment color coding (blue/red/neutral) and the cluster/topic and timeline views are preserved; slider effects apply within whichever view is active where meaningful.
