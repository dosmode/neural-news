# Feature Specification: Category Cluster Layout (Proportion-at-a-Glance)

**Feature Branch**: `007-category-cluster-layout`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "분류가 깔끔하지 않아 아직까지 구별이 확 나오지 않고 약간 카테고리별로 닷이 보였으면 좋겠어 그래야 바로 퍼센트가 확 느껴지니까" — The current scatter mixes blue (positive) and red (negative) dots into one central blob, so the proportion is not perceptible. The user wants dots spatially separated/clustered by category so the percentage of each category is felt instantly.

## Overview

Today every article dot is pulled toward the same center, so positive and negative dots intermix into one undifferentiated cloud. A viewer cannot tell "is this mostly good news or bad news?" at a glance, and the gradient field reads as one ambiguous white glow.

This feature reorganizes the output scatter so dots **group into distinct spatial clusters by category** (sentiment: positive / negative / neutral). Each category occupies its own region of the panel. Because each cluster's physical size and dot count scale with how many articles belong to it, the **relative proportion of each category becomes immediately obvious** — a big blue cluster vs. a small red cluster instantly communicates "mostly positive." This also makes the gradient classification field (feature 006) render as clean, separated colored regions instead of a muddy blend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dots Grouped into Distinct Category Clusters (Priority: P1)

A news reader looks at the output panel and sees article dots organized into clearly separated clusters — positive (blue) articles gathered in one zone, negative (red) in another, neutral in a third. The clusters do not overlap into a single blob; each occupies a recognizable region.

**Why this priority**: This is the core request. Without spatial separation by category, neither the proportion nor the classification is legible. Every other improvement depends on this separation existing.

**Independent Test**: Load the app with a mix of positive and negative articles. Confirm the positive dots are visibly gathered in one area and the negative dots in a clearly different area, with a recognizable gap or boundary between them — not intermixed in the center.

**Acceptance Scenarios**:

1. **Given** articles of multiple sentiments are loaded, **When** the scatter renders, **Then** dots are grouped into separate clusters by sentiment, each in its own region of the panel
2. **Given** the clusters are rendered, **When** the user views them, **Then** positive, negative, and neutral clusters occupy distinct, non-overlapping zones
3. **Given** a cluster of dots, **When** the user looks at it, **Then** all dots in that cluster share the same sentiment color (no red dot sitting inside the blue cluster)
4. **Given** dots are clustered, **When** the user hovers or clicks a dot, **Then** the existing hover preview and detail panel still work unchanged

---

### User Story 2 - Proportion Felt at a Glance (Priority: P1)

A news reader instantly perceives the relative proportion of each category: a large blue cluster and a small red cluster immediately communicate "mostly positive news," without reading any numbers.

**Why this priority**: The stated goal is "바로 퍼센트가 확 느껴지니까" — the proportion must be felt instantly. Clustering without proportion encoding would miss the point.

**Independent Test**: Load a set where ~70% of articles are positive and ~30% negative. Without reading any text, a viewer should be able to say "it's mostly positive" — the blue cluster visibly dominates the space and dot count.

**Acceptance Scenarios**:

1. **Given** one sentiment dominates the article set, **When** the scatter renders, **Then** that sentiment's cluster is visibly larger (more area and/or more dots) than the others
2. **Given** the clusters are shown, **When** the user looks at them, **Then** the relative sizes correspond to the relative counts of each sentiment (bigger cluster = more articles)
3. **Given** a per-category proportion is meaningful, **When** the scatter renders, **Then** each cluster shows its share (e.g., a percentage or count label) so the felt impression is confirmable
4. **Given** two categories have roughly equal counts, **When** the scatter renders, **Then** their clusters appear roughly equal in size

---

### User Story 3 - Clusters React to Filter Changes (Priority: P2)

When the reader toggles a keyword (changing the article set) or the sentiment heuristic shifts the mix, the clusters smoothly re-form and re-proportion to reflect the new distribution.

**Why this priority**: The clusters must stay truthful to the live data. Static clusters would mislead after a filter change. Lower than P1 because the initial correct layout already delivers the core value.

**Independent Test**: Note the cluster sizes. Toggle a keyword that changes the article mix. Confirm the clusters re-form with sizes matching the new sentiment distribution within a short delay.

**Acceptance Scenarios**:

1. **Given** clusters are displayed, **When** the user toggles a keyword and new articles load, **Then** the clusters re-form to match the new sentiment distribution
2. **Given** the clusters re-form, **When** the transition happens, **Then** dots animate smoothly to their new cluster positions rather than jumping abruptly
3. **Given** the distribution changes, **When** a category's share grows or shrinks, **Then** its cluster size and any proportion label update accordingly

---

### Edge Cases

- What happens when all articles share one sentiment? → A single cluster fills the central area; its proportion reads as ~100%; no empty competing clusters are drawn
- What happens with very few articles (1–3)? → Dots still go to their category's zone; tiny clusters are acceptable; no misleading large blobs
- What happens with a category that has zero articles? → No empty cluster region is shown for that category (or it shows as 0% with no dots)
- What happens when the panel is small/narrow? → Cluster zones reflow to fit without overlapping; separation is preserved
- What happens with a large article count (100+)? → Dots remain within their category cluster without spilling into neighboring clusters; density stays readable

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Article dots MUST be spatially grouped into clusters by sentiment category (positive, negative, neutral), with each category occupying its own region of the output panel
- **FR-002**: Category clusters MUST NOT visually overlap into a single undifferentiated blob — a recognizable separation/gap MUST exist between clusters
- **FR-003**: Every dot within a cluster MUST share that cluster's sentiment color (no cross-category dots inside a cluster)
- **FR-004**: The relative size of each cluster (area and/or dot grouping) MUST correspond to the relative count of articles in that category — a category with more articles produces a visibly larger cluster
- **FR-005**: Each cluster MUST display its share of the total (a percentage and/or count label) so the perceived proportion is confirmable
- **FR-006**: Clusters MUST re-form and re-proportion when the article set changes (keyword toggle or new fetch), with dots animating smoothly to new positions
- **FR-007**: Existing dot interactions (hover preview card, click-to-open detail panel) MUST continue to work for clustered dots
- **FR-008**: When only one sentiment is present, the system MUST show a single cluster reading ~100% without drawing empty competing clusters
- **FR-009**: Cluster zones MUST reflow to fit the panel dimensions without overlapping when the panel is resized or is narrow
- **FR-010**: The cluster colors MUST remain consistent with the existing sentiment palette (positive = blue, negative = red, neutral = neutral/grey)
- **FR-011**: The gradient classification field (existing) MUST align with the clusters so each cluster sits on its matching color region, producing clean separated color zones rather than a blended center

### Key Entities

- **Category Cluster**: A spatial grouping of all dots sharing one sentiment. Has a region/center, a member set of dots, a count, and a proportion (share of total). The defining new entity.
- **Article Dot**: Existing entity. Now assigned to exactly one category cluster based on its sentiment; its position is determined by its cluster rather than a single global center.
- **Cluster Label**: A small text element per cluster showing the category and its share (percentage/count).
- **Classification Field**: Existing gradient layer; now reads cleanly because dots of the same color are co-located.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time viewer can correctly state which sentiment is the majority within 3 seconds of looking at the scatter, without reading numeric labels — verified by observation
- **SC-002**: For a known distribution (e.g., 70/30 positive/negative), the dominant cluster occupies visibly more area than the minority cluster 100% of the time
- **SC-003**: 100% of dots are located inside the cluster matching their sentiment color (zero cross-category dots)
- **SC-004**: Category clusters have a visible separation between them in 100% of multi-sentiment renders (no single merged blob)
- **SC-005**: After a keyword toggle, clusters re-form with sizes matching the new distribution within 2 seconds, with smooth dot motion
- **SC-006**: Each cluster's displayed share matches the actual count proportion within ±1 percentage point

## Assumptions

- "Category" for clustering means article **sentiment** (positive / negative / neutral), consistent with the existing color coding and the user's blue/red reference. Keyword-topic clustering is out of scope for this iteration.
- The proportion is computed over the currently displayed articles (the same set shown as dots), not the full historical feed.
- Cluster positions are arranged within the existing output panel; no new panel or page is added.
- The existing gradient classification field, hover cards, and detail panel are reused — this feature changes dot positioning/grouping, not those components' core behavior.
- Smooth re-forming animation reuses the existing dot animation approach; no new motion system is introduced.
- Desktop-first (1280px+), consistent with the rest of the app; clusters scale down gracefully on smaller panels.
- Three sentiment categories is the expected maximum number of clusters; the layout is designed around up to three zones.
- Proportion labels show whole-number percentages (e.g., "68%") and/or counts; exact formatting is a presentation detail.
