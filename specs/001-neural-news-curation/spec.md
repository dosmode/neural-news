# Feature Specification: Neural Network News Curation MVP

**Feature Branch**: `001-neural-news-curation`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "시각적 신경망 뉴스 큐레이션 앱 MVP - 사용자가 스스로 정보의 가중치를 조절하며 데이터의 흐름을 시각적으로 탐색할 수 있는 인터랙티브 뉴스 큐레이션 플랫폼"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Keyword Filtering (Priority: P1)

As a user, I want to select multiple trending keywords and see how they connect to various analysis filters so that I can control the weight of information I consume.

**Why this priority**: This is the core "Input-Hidden" metaphor of the neural network concept and the primary way users interact with the data flow.

**Independent Test**: Can be tested by selecting "NVDA" and "AI Trend" nodes, connecting them to "Market Sentiment" filter, and verifying that the connection visualizes weights correctly using mock data.

**Acceptance Scenarios**:

1. **Given** the main dashboard is loaded, **When** I tap on the "NVDA" keyword node, **Then** the node should become active/highlighted.
2. **Given** active keyword nodes, **When** I drag or touch the connecting lines to a filter node, **Then** the thickness of the line should change to represent the weight adjustment.

---

### User Story 2 - Visual Curation Map & Heatmap (Priority: P2)

As a user, I want to see the curated news articles as data points on a dynamic heatmap so that I can intuitively understand the overall sentiment and clusters of information.

**Why this priority**: This fulfills the "Output" layer vision and provides the "visual pleasure" mentioned in the core strategy.

**Independent Test**: Can be tested by changing the filter weights and verifying that the background gradient color and article clusters update dynamically in response.

**Acceptance Scenarios**:

1. **Given** selected keywords and filters, **When** the weighting is adjusted towards "Positive Sentiment", **Then** the map background should shift towards a blue gradient.
2. **Given** the curation map, **When** articles are filtered, **Then** they should appear as clustered dots on the 2D plane based on their relevance.

---

### User Story 3 - Article Preview & Summary (Priority: P3)

As a user, I want to click on a news data point to see a summary and title of the article so that I can quickly consume the curated information.

**Why this priority**: While visual exploration is key, the final value is the actual news content.

**Independent Test**: Can be tested by clicking a data point on the map and verifying that a modal appears with the correct mock data title and summary.

**Acceptance Scenarios**:

1. **Given** article dots on the map, **When** I click/hover on a specific dot, **Then** a high-fidelity modal window should appear with the article title and summary.

### Edge Cases

- **No Keywords Selected**: The output map should show a neutral/empty state or a general "all-market" overview.
- **Extreme Weighting**: When a weight is set to zero, the connection line should disappear or become nearly invisible, and related articles should be filtered out.
- **Large Data Volume**: Even with mock data, if many points are rendered, the clusters must remain distinct and clickable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide interactive nodes for "Input" keywords (e.g., NVDA, TSMC, AI Trends).
- **FR-002**: System MUST allow users to adjust weights (line thickness) between Input and Hidden (Filter) nodes.
- **FR-003**: System MUST provide at least three filter types: Sentiment (Positive/Negative), Type (Breaking/Deep Dive), and Market Index (Greed/Fear).
- **FR-004**: System MUST render an "Output" map using a dynamic gradient background that responds to user input weights.
- **FR-005**: System MUST cluster news article data points on the map based on relevance to selected inputs.
- **FR-006**: System MUST display article details (title, summary) in a modal upon user interaction with a data point.
- **FR-007**: System MUST use a predefined JSON mock data set for all article and node content.

### Key Entities

- **Keyword Node**: Represents a market trend or entity. Attributes: Label, State (Active/Inactive).
- **Filter Node**: Represents an analysis perspective. Attributes: Type, Current Weight.
- **Article Data Point**: Represents a single news item. Attributes: Title, Summary, Sentiment Score, Relevance Vector (for clustering), Mock ID.
- **Connection**: Represents the relationship and weight between nodes. Attributes: Source, Target, Thickness/Weight.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select keywords and adjust weights to see a visual map update in under 500ms (latency-free feel).
- **SC-002**: The application supports smooth rendering of at least 100 article data points simultaneously with animations.
- **SC-003**: The visual theme (Neon Glow/Dark Mode) is consistently applied to all nodes, lines, and modals.
- **SC-004**: 100% of news content is derived from the internal mock JSON without requiring external API calls for MVP1.

## Assumptions

- **Mock Data Sufficiency**: Static JSON data is sufficient to demonstrate the value proposition for the initial user feedback.
- **Domain Focus**: MVP is restricted to Finance and Tech sectors to ensure high data density and relevance.
- **Desktop/Tablet Primary**: While mobile-responsive is a project principle, the complex node-graph interaction is optimized for touch/pointer devices with sufficient screen real estate.
- **No Backend**: MVP1 does not require a live database or NLP engine; all logic is handled in the frontend client.
