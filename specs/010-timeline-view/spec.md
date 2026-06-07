# Feature Specification: Timeline View (News Flow Over Time)

**Feature Branch**: `010-timeline-view`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "시간대별 뉴스 흐름을 보여주는 타임라인. 기사들을 발행 시각 순으로 시간축에 배치해서 언제 뉴스가 몰렸는지, 시간에 따라 어떻게 흐르는지 한눈에 보이게. 출력 영역에서 기존 클러스터 뷰와 타임라인 뷰를 전환할 수 있게."

## Overview

The current output is a spatial scatter (clustered by sentiment or topic) that answers "what is the mood / which topic dominates?" — but it discards **when** each article was published. A reader cannot see whether the news is fresh, when coverage spiked, or how a story developed over the day.

This feature adds a **Timeline view** to the output area: articles are placed along a horizontal **time axis** by their publication time, so the reader sees at a glance when news clustered, where the bursts were, and how coverage flows from older to newer. The reader switches between the existing **Cluster** view and the new **Timeline** view with a view toggle. Dot color still encodes sentiment, so the timeline shows both *when* and *what kind* of news at once.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch to a Timeline of News (Priority: P1)

A reader wants to see when the current news was published rather than how it clusters. They switch the output to "Timeline," and the articles rearrange along a horizontal time axis — oldest on one side, newest on the other — with readable time markers. Switching back returns to the cluster scatter.

**Why this priority**: The timeline arrangement and the view switch are the core request. Without them the feature does not exist.

**Independent Test**: With articles loaded, switch the output to Timeline → articles arrange left-to-right (or along an axis) by publication time, with visible time-axis labels; switch back to Cluster → the scatter returns.

**Acceptance Scenarios**:

1. **Given** articles are loaded, **When** the reader switches to Timeline view, **Then** each article is positioned on a time axis according to its publication time
2. **Given** the timeline is shown, **When** the reader views it, **Then** time-axis markers/labels make the time range readable (e.g., older → newer with date/time ticks)
3. **Given** Timeline view is active, **When** the reader switches back to Cluster view, **Then** the previous cluster scatter is restored
4. **Given** a view is selected, **When** the reader returns later in the same session, **Then** the last selected view is still active

---

### User Story 2 - See When News Clustered (Bursts) (Priority: P1)

In Timeline view, the reader instantly sees the busy periods: times when many articles were published appear visibly dense (stacked/grouped), while quiet periods appear sparse. This reveals when a story broke or coverage spiked.

**Why this priority**: "언제 뉴스가 몰렸는지 한눈에" — seeing the bursts is the point of the timeline. A flat line of dots without density encoding would miss the goal.

**Independent Test**: Load articles whose publication times include a clear burst (many within a short window). In Timeline view, that window is visibly denser than the rest.

**Acceptance Scenarios**:

1. **Given** several articles share a narrow time window, **When** Timeline view renders, **Then** that window appears visibly denser (more dots near that time)
2. **Given** a sparse period with few articles, **When** Timeline view renders, **Then** that period appears visibly emptier
3. **Given** dots overlap at a busy time, **When** they are placed, **Then** they are arranged so individual dots remain distinguishable (no single unreadable pile)
4. **Given** the timeline is shown, **When** the reader scans left to right, **Then** the flow from older to newer news is unmistakable

---

### User Story 3 - Read Article Details and Sentiment in Timeline (Priority: P2)

In Timeline view, dots keep their sentiment color, and the reader can hover a dot for a preview and click it to open the article detail — exactly as in the cluster views.

**Why this priority**: Preserving the existing interactions and the sentiment color makes the timeline a first-class view rather than a read-only chart. Lower than P1 because the arrangement itself is the headline value.

**Independent Test**: In Timeline view, hover a dot → preview card appears; click a dot → article detail opens; dot colors reflect sentiment as in cluster views.

**Acceptance Scenarios**:

1. **Given** Timeline view is active, **When** the reader hovers a dot, **Then** the article preview card appears (as in cluster views)
2. **Given** Timeline view is active, **When** the reader clicks a dot, **Then** the article detail opens
3. **Given** Timeline view is active, **When** the reader views a dot, **Then** its color encodes sentiment exactly as in cluster views

---

### Edge Cases

- What happens when all articles share (almost) the same publication time? → They stack at one point on the axis but are spread vertically so they stay individually visible; the axis still shows that time
- What happens when an article has a missing or unparseable publication time? → It is excluded from the time positioning or placed in a clearly marked "undated" area, never breaking the axis
- What happens with a very wide time range (articles spanning many days)? → The axis scales to fit the full range with appropriately spaced markers
- What happens with very few articles (1–2)? → They are placed correctly on the axis; the axis still renders with sensible bounds
- What happens when the output panel is resized? → The timeline re-fits the new width, keeping markers readable
- What happens during a re-fetch? → Consistent with the cluster views — the prior timeline stays visible (dimmed) until new data arrives

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The output area MUST provide a control to switch the view between "Cluster" (the existing scatter) and "Timeline"
- **FR-002**: In Timeline view, each article MUST be positioned along a time axis according to its publication time, ordered from older to newer
- **FR-003**: The Timeline view MUST show readable time-axis markers/labels indicating the time range and progression
- **FR-004**: Periods with many articles MUST appear visibly denser than sparse periods (bursts are perceptible)
- **FR-005**: When dots overlap at a busy time, they MUST be arranged so individual dots remain distinguishable (no single unreadable pile)
- **FR-006**: Dot color MUST continue to encode sentiment in Timeline view, identical to the cluster views
- **FR-007**: Existing dot interactions (hover preview, click-to-open detail) MUST work in Timeline view
- **FR-008**: Articles with a missing or unparseable publication time MUST NOT break the timeline; they are excluded from time positioning or shown in a clearly marked area
- **FR-009**: The time axis MUST scale to fit the full range of the current articles, whether minutes or many days
- **FR-010**: The Timeline view MUST re-fit correctly when the output panel is resized
- **FR-011**: The selected view (Cluster or Timeline) MUST persist for the browser session
- **FR-012**: During a re-fetch, the Timeline MUST keep the prior view visible (dimmed) until new data arrives, consistent with the cluster views

### Key Entities

- **View Mode**: The current output arrangement — `Cluster` or `Timeline`. Session-persisted; sits alongside the existing cluster-mode (Sentiment/Topic) selection. The defining new entity.
- **Timeline Axis**: The horizontal time scale spanning the oldest to newest article publication time, with readable markers.
- **Article Dot**: Existing entity. In Timeline view its horizontal position is its publication time; its vertical position spreads it from neighbors to avoid overlap; its color is sentiment.
- **Time Burst**: A visually dense region of the timeline where many articles cluster in time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can switch to Timeline view and see articles arranged on a time axis within 2 seconds, with smooth motion
- **SC-002**: A reader can identify the busiest publication period within 3 seconds of viewing the timeline, without reading numbers (densest region), verified by observation
- **SC-003**: 100% of articles with a valid publication time are positioned in correct chronological order on the axis
- **SC-004**: Dot colors are identical between Cluster and Timeline views 100% of the time (only positions change)
- **SC-005**: Individual dots remain distinguishable (not a single merged pile) even in the densest time window, up to 100 articles
- **SC-006**: The selected view persists across interactions within a session 100% of the time

## Assumptions

- Publication time comes from each article's existing publication timestamp; no new data source is required.
- The time axis is horizontal (older → newer, left → right), consistent with conventional timelines and the app's left-to-right flow.
- Vertical position in Timeline view is used only to de-overlap dots at the same time (not a second data dimension).
- The view toggle (Cluster/Timeline) is independent of and sits alongside the existing cluster-mode toggle (Sentiment/Topic); cluster-mode only applies in Cluster view.
- Time-axis granularity (hour/day labels) adapts to the span of the current articles; exact label formatting is a presentation detail.
- View selection persists for the session (in-memory), consistent with the existing field/cluster-mode toggles; cross-device persistence is out of scope.
- The classification field (gradient heatmap) is a Cluster-view concept and may be hidden or simplified in Timeline view; the dots and time axis are the focus.
- Desktop-first (1280px+), consistent with the rest of the app.
- The dot color → sentiment mapping (blue/red/neutral) is preserved in all views.
