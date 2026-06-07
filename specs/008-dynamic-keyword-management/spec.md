# Feature Specification: User-Managed Keywords with Dynamic Trending Defaults

**Feature Branch**: `008-dynamic-keyword-management`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "키워드를 사용자가 직접 추가/삭제할 수 있게 — 기본은 가장 핫한 토픽 5개정도 다이나믹하게 올려보여주고" (Let users add and remove keywords directly; by default show ~5 hottest topics, populated dynamically.)

## Overview

Today the input layer shows a fixed set of five hardcoded keywords (NVDA, TSMC, AI Trend, Fed Rate, US-China). The reader cannot follow topics they care about, and the starting set never changes.

This feature makes keywords **user-managed**: the reader can add their own topics and remove any keyword, and the visualization updates to reflect their personal interest set. On a first visit, instead of the hardcoded list, the app seeds the input layer with **about five of the currently hottest news topics**, chosen dynamically, so the starting view feels alive and relevant. The reader's customized keyword set is remembered between visits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a Custom Keyword (Priority: P1)

A reader wants to track a topic that isn't shown. They type the topic into an "add keyword" control in the input layer; it immediately appears as a new active keyword node, and the news visualization updates to include articles for that topic.

**Why this priority**: Adding personal topics is the core of "user-managed keywords." Without it the reader is stuck with whatever the app chose.

**Independent Test**: Type a new topic (e.g., "Bitcoin") into the add-keyword control and confirm: a new keyword node appears in the input layer marked active, and within a few seconds articles related to that topic appear in the output.

**Acceptance Scenarios**:

1. **Given** the input layer is shown, **When** the reader enters a new topic and confirms, **Then** a new keyword node appears as active and the article set updates to include that topic
2. **Given** the reader is typing a keyword, **When** they submit an empty or whitespace-only value, **Then** no keyword is added and they get a gentle indication that input is required
3. **Given** a keyword already exists, **When** the reader tries to add the same keyword again, **Then** it is not duplicated and the existing one is highlighted
4. **Given** the maximum number of keywords is reached, **When** the reader tries to add another, **Then** they are told the limit is reached and must remove one first

---

### User Story 2 - Remove a Keyword (Priority: P1)

A reader no longer cares about a topic. They remove its keyword node, and it disappears from the input layer; the visualization and any derived layers update so that topic no longer influences the news shown.

**Why this priority**: Removal is the other half of management. Without it the keyword set only grows and becomes cluttered.

**Independent Test**: Remove an existing keyword and confirm: its node disappears from the input layer, and the output no longer reflects that topic; the hidden layers and clusters re-derive from the remaining keywords.

**Acceptance Scenarios**:

1. **Given** a keyword node exists, **When** the reader removes it, **Then** the node disappears and the article set updates to exclude that topic
2. **Given** the reader removes a keyword, **When** the visualization updates, **Then** the hidden layer categories and output re-derive from the remaining keywords
3. **Given** only one keyword remains, **When** the reader removes it, **Then** the system shows a clear empty state prompting them to add a keyword (no broken or blank visualization)

---

### User Story 3 - Dynamic Trending Defaults on First Visit (Priority: P2)

A first-time reader (or one who has reset their keywords) opens the app and sees the input layer pre-populated with about five of the currently hottest news topics, rather than a stale hardcoded list. This gives an immediately relevant starting point.

**Why this priority**: It makes the default experience feel current and removes the arbitrary hardcoded set. Lower than add/remove because the management actions deliver value even with a fixed default, but the dynamic default is what the user specifically asked for.

**Independent Test**: Open the app with no saved keywords. Confirm about five keyword nodes appear automatically, and they reflect currently prominent news topics (not the old fixed NVDA/TSMC list); articles load for them without any user action.

**Acceptance Scenarios**:

1. **Given** a reader with no saved keyword set, **When** the app loads, **Then** approximately five trending topics are shown as active keywords and their articles load automatically
2. **Given** the trending topics are shown, **When** the reader views them, **Then** they are recognizable current topics, not placeholder or obviously stale terms
3. **Given** a returning reader who customized their keywords, **When** they reopen the app, **Then** their own saved keyword set is restored (the trending defaults do not overwrite it)
4. **Given** trending topics cannot be determined, **When** the app loads, **Then** a sensible curated fallback set of about five topics is shown instead of an empty input layer

---

### Edge Cases

- What happens when the reader adds a very long keyword? → Input is length-limited; overly long entries are truncated or rejected with a hint
- What happens with duplicate keywords differing only by case/spacing? → Treated as the same keyword; not duplicated
- What happens when the reader removes all keywords? → Empty state with a prompt to add one; no crash or blank screen
- What happens when a custom keyword returns zero articles? → The keyword node still shows as active; the output shows a clear "no articles for this topic" state
- What happens on a returning visit? → The reader's saved keyword set is restored exactly as they left it
- What happens if the reader adds keywords rapidly? → Each is handled without losing input or double-adding; article refresh is debounced

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The input layer MUST provide a control for the reader to add a new keyword by entering text and confirming
- **FR-002**: Adding a keyword MUST immediately show it as an active keyword node and trigger an update of the article set to include that topic
- **FR-003**: The system MUST reject empty or whitespace-only keyword entries with a gentle, non-blocking indication
- **FR-004**: The system MUST prevent duplicate keywords (case- and surrounding-whitespace-insensitive); attempting to re-add highlights the existing one
- **FR-005**: The system MUST enforce a maximum number of simultaneous keywords and inform the reader when the limit is reached
- **FR-006**: Each keyword node MUST provide a control to remove it; removal MUST update the input layer, hidden layers, and output accordingly
- **FR-007**: Removing the last keyword MUST present a clear empty state prompting the reader to add a keyword, never a blank or broken visualization
- **FR-008**: On a first visit (no saved keyword set), the system MUST seed the input layer with approximately five currently trending news topics, chosen dynamically, and load their articles automatically
- **FR-009**: If trending topics cannot be determined, the system MUST fall back to a curated default set of about five topics rather than showing an empty input layer
- **FR-010**: The reader's keyword set (including added and removed keywords) MUST persist between visits in the same browser, and be restored on return without being overwritten by the trending defaults
- **FR-011**: Keyword length MUST be limited to a reasonable maximum, with overly long entries rejected or truncated with a hint
- **FR-012**: All keyword changes (add/remove) MUST keep the hidden-layer categories and output clusters consistent with the current keyword set

### Key Entities

- **Keyword**: A reader-managed topic of interest. Has display text, an active state, and an origin (trending-default, curated-fallback, or user-added). Drives which articles are fetched and how the visualization is organized.
- **Keyword Set**: The reader's current collection of keywords, persisted per browser, with a maximum size. Restored on return visits.
- **Trending Topic Source**: The mechanism that supplies the ~5 hottest topics for first-visit seeding, with a curated fallback when unavailable.
- **Add-Keyword Control**: The input affordance in the input layer for entering and confirming a new keyword.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can add a new keyword and see related articles appear in under 5 seconds from confirming
- **SC-002**: A reader can remove any keyword and see the visualization update within 3 seconds, with no blank or broken state
- **SC-003**: On a first visit, approximately five trending keywords appear and their articles load automatically within 5 seconds, with zero hardcoded legacy terms
- **SC-004**: A returning reader sees their exact saved keyword set restored 100% of the time
- **SC-005**: Duplicate and empty keyword entries are prevented 100% of the time
- **SC-006**: The keyword count never exceeds the defined maximum, and the reader is always informed when blocked from adding more

## Assumptions

- "Category" / topic clustering of the output remains driven by the existing logic; this feature changes the *set* of keywords, not how dots cluster (that is feature 007).
- **Trending source**: the ~5 hottest topics are derived dynamically from currently prominent news (e.g., the most frequently occurring significant topics across a broad current-news sample). When that yields too few, a small curated seed list of current finance/tech topics is used as fallback. The exact derivation is an implementation detail to be settled in planning.
- Persistence is per-browser local storage (survives refresh and return visits); cross-device sync and user accounts are out of scope.
- Maximum keyword count is assumed to be about 8 to keep the neural graph readable; the exact number is a tunable detail.
- Keyword matching for duplicates is case-insensitive and trims surrounding whitespace.
- Each keyword maps to the existing hidden-layer category logic; a user-added keyword that has no predefined category falls into a generic/"General" category.
- Desktop-first (1280px+), consistent with the rest of the app.
- The add/remove controls live within the existing input-layer area of the neural panel; no new page or panel is introduced.
