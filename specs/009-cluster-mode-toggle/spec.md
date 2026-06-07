# Feature Specification: Cluster Mode Toggle (Sentiment ↔ Topic)

**Feature Branch**: `009-cluster-mode-toggle`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "클러스터를 감성(긍정/부정/중립)이 아니라 키워드 토픽별로 나누는 옵션. 출력 스캐터에서 닷을 묶는 기준을 '감성'과 '토픽(키워드 카테고리)' 사이에서 토글할 수 있게. 토픽 모드에서는 각 키워드/카테고리가 자기 클러스터를 가지고, 어떤 토픽에 기사가 많은지 한눈에 보이게."

## Overview

Today the output scatter always clusters dots by **sentiment** (feature 007): positive, negative, and neutral zones. That answers "is the news good or bad?" but not "which of my topics has the most coverage?"

This feature adds a **clustering mode toggle** in the output area so the reader can switch the grouping criterion between **Sentiment** and **Topic**. In Topic mode, each active keyword (or its category) gets its own cluster, and the cluster sizes reveal at a glance which topics dominate the current news. Dot color still encodes sentiment, so Topic mode shows both dimensions at once (where each dot sits = its topic; its color = its sentiment). The reader flips between the two views to answer different questions from the same data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Clustering Between Sentiment and Topic (Priority: P1)

A reader viewing the sentiment-clustered scatter wants to instead see the news grouped by topic. They flip a mode toggle to "Topic," and the dots smoothly re-form into one cluster per topic. Flipping back to "Sentiment" returns to the good/bad/neutral grouping.

**Why this priority**: The toggle and the topic grouping are the entire request. Without the ability to switch, the feature does not exist.

**Independent Test**: With several keywords active and articles loaded, flip the mode toggle to "Topic" → dots re-form into per-topic clusters; flip back to "Sentiment" → dots re-form into sentiment clusters. Both transitions are smooth and correct.

**Acceptance Scenarios**:

1. **Given** the scatter is in Sentiment mode, **When** the reader switches the toggle to Topic, **Then** the dots re-form into one cluster per active topic
2. **Given** the scatter is in Topic mode, **When** the reader switches back to Sentiment, **Then** the dots re-form into positive/negative/neutral clusters
3. **Given** a mode is selected, **When** the dots re-form, **Then** they animate smoothly to their new positions rather than jumping
4. **Given** a mode is selected, **When** the reader returns later in the same session, **Then** the last selected mode is still active

---

### User Story 2 - Topic Clusters Reveal Coverage at a Glance (Priority: P1)

In Topic mode, the reader instantly sees which topic has the most articles: the topic with the largest cluster dominates the view, and each topic cluster is labeled with its name and article share.

**Why this priority**: The stated goal is "어떤 토픽에 기사가 많은지 한눈에 보이게" — seeing which topic dominates is the point of Topic mode.

**Independent Test**: Activate keywords where one topic clearly has more articles. In Topic mode, that topic's cluster is visibly the largest and its label shows the highest count/share.

**Acceptance Scenarios**:

1. **Given** Topic mode is active, **When** the scatter renders, **Then** each topic cluster is labeled with the topic name and its article count/share
2. **Given** one topic has more articles than others, **When** Topic mode renders, **Then** that topic's cluster is visibly the largest
3. **Given** Topic mode is active, **When** the reader looks at a dot, **Then** the dot's color still indicates its sentiment (color meaning is unchanged across modes)
4. **Given** topic clusters are shown, **When** the reader views them, **Then** they are spatially separated (recognizable gap), not merged into one blob

---

### User Story 3 - Dot Color Still Encodes Sentiment in Topic Mode (Priority: P2)

In Topic mode, even though dots are grouped by topic, their colors still reflect sentiment — so within a topic cluster the reader can see the mix of positive/negative coverage for that topic.

**Why this priority**: Preserving the sentiment color in Topic mode lets the reader read both dimensions at once (topic position + sentiment color). It is a refinement that makes Topic mode richer, but the basic grouping (US1/US2) delivers the core value first.

**Independent Test**: In Topic mode, inspect a topic cluster containing mixed coverage — confirm it shows a mix of blue (positive) and red (negative) dots, so the reader can judge that topic's sentiment balance.

**Acceptance Scenarios**:

1. **Given** Topic mode is active, **When** a topic has both positive and negative articles, **Then** its cluster shows a mix of the corresponding dot colors
2. **Given** the classification field is shown, **When** Topic mode is active, **Then** the field remains readable and does not contradict the dot grouping
3. **Given** the reader switches modes, **When** the dots re-form, **Then** dot colors never change (only positions change)

---

### Edge Cases

- What happens with only one active keyword in Topic mode? → A single centered topic cluster reading ~100%; no empty competing clusters
- What happens when many keywords are active (e.g., 8) in Topic mode? → Each topic gets a cluster; the layout fits them without overlap, staying readable
- What happens to a dot relevant to multiple topics? → It is assigned to its single most-relevant topic for clustering (one dot, one cluster)
- What happens when an article matches no active topic strongly? → It is placed in the topic it is most relevant to, or a small "Other" grouping, so no dot is lost
- What happens when keywords change while in Topic mode? → Topic clusters re-form for the new keyword set, preserving the selected mode
- What happens in Sentiment mode? → Behavior is exactly today's sentiment clustering (unchanged)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The output area MUST provide a visible control to toggle the clustering mode between "Sentiment" and "Topic"
- **FR-002**: In Sentiment mode, dots MUST cluster by sentiment exactly as they do today (positive/negative/neutral zones)
- **FR-003**: In Topic mode, dots MUST cluster by topic, with each active topic (keyword or its category) forming its own spatially separated cluster
- **FR-004**: In Topic mode, each topic cluster MUST be labeled with the topic name and its article count and/or share of the total
- **FR-005**: In Topic mode, the relative size of each topic cluster MUST correspond to the number of articles in that topic (more articles → larger cluster)
- **FR-006**: Dot color MUST always encode sentiment in both modes; switching modes MUST change only dot positions, never colors
- **FR-007**: Switching modes MUST animate the dots smoothly to their new positions
- **FR-008**: Each dot MUST belong to exactly one cluster in either mode (a multi-topic article is assigned to its single most-relevant topic)
- **FR-009**: Topic clusters MUST be spatially separated (recognizable gap), not merged into one blob
- **FR-010**: The selected clustering mode MUST persist for the browser session
- **FR-011**: When keywords change while in Topic mode, the topic clusters MUST re-form for the new keyword set without losing the selected mode
- **FR-012**: Existing dot interactions (hover preview, click-to-open detail) and the proportion labels MUST work in both modes

### Key Entities

- **Cluster Mode**: The current grouping criterion — `Sentiment` or `Topic`. Session-persisted; controls how dots are positioned. The defining new entity.
- **Topic Cluster**: In Topic mode, a spatial grouping of all dots whose most-relevant topic is a given keyword/category. Has a name, count, share, and centroid.
- **Article Dot**: Existing entity. Now assigned to a cluster by either its sentiment (Sentiment mode) or its dominant topic (Topic mode); color always = sentiment.
- **Cluster Label**: Existing proportion label; in Topic mode it shows the topic name + share; in Sentiment mode it shows the sentiment + share (as today).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader can switch between Sentiment and Topic clustering and see the dots re-form correctly within 2 seconds, with smooth motion
- **SC-002**: In Topic mode, a reader can identify the topic with the most coverage within 3 seconds without reading numbers (largest cluster), verified by observation
- **SC-003**: 100% of dots are placed in the correct cluster for the active mode (sentiment-correct in Sentiment mode; dominant-topic-correct in Topic mode)
- **SC-004**: Dot colors are identical before and after a mode switch 100% of the time (only positions change)
- **SC-005**: Each topic cluster's displayed share matches its actual article proportion within ±1 percentage point
- **SC-006**: The selected mode persists across interactions within a session 100% of the time

## Assumptions

- "Topic" for clustering means the keyword/category each article is most relevant to, using the existing relevance scoring; a dot is assigned to its single highest-relevance active topic.
- Topic granularity is per **active keyword** (each keyword its own cluster). If two keywords share a category, they still form separate topic clusters in Topic mode (keyword-level, not merged by category) — keeping it intuitive that "each keyword has its own cluster."
- The clustering layout mechanism (separated blobs sized by count, with proportion labels) is the same as feature 007; only the grouping key changes between sentiment and topic.
- The mode toggle lives in the output area near the existing field/count controls; no new panel.
- Mode selection persists for the session (consistent with the field toggle); cross-device persistence is out of scope.
- Sentiment mode behavior is unchanged from today (feature 007).
- Desktop-first (1280px+), consistent with the rest of the app.
- The dot color → sentiment mapping (blue/red/neutral) is preserved in both modes.
