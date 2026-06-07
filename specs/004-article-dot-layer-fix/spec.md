# Feature Specification: Article Dot Visualization & Keyword Layer Fix

**Feature Branch**: `004-article-dot-layer-fix`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "현재 화면에 제대로 뉴스기사가 표시가 안되고있는데 제대로 표시되게 해주고 이런식의 각각의 레이어가 키워드에 맞게 재분류를 해주고 하나의 닷이 하나의 기사가 되도록 하고싶어"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Live News as Dots in Output Panel (Priority: P1)

A news reader opens the Neural News app and immediately sees fetched news articles displayed as individual colored dots in the output visualization panel. Each dot represents one and only one article. The dots appear within seconds of the page loading, and the sidebar article list shows the same set of articles.

**Why this priority**: The core display is broken — no dots are appearing even when articles are fetched. Without visible articles, the entire app provides no value and all other features are inaccessible.

**Independent Test**: Load the app with default keywords active. Verify that dots appear in the output visualization panel and matching article cards appear in the sidebar within 10 seconds of load. Count dots and sidebar cards — the numbers must match.

**Acceptance Scenarios**:

1. **Given** the app loads with at least one keyword active, **When** the article fetch completes, **Then** one dot per article is visible in the output panel
2. **Given** 15 articles are fetched, **When** the output panel renders, **Then** exactly 15 dots are visible — no duplicates, none hidden
3. **Given** articles are loading, **When** the user views the output panel, **Then** a loading indicator is shown and dots appear once loading finishes
4. **Given** a dot is visible, **When** the user hovers over it, **Then** the article title is shown as a tooltip

---

### User Story 2 - Keyword-Driven Layer Reclassification (Priority: P2)

A news reader sees the hidden layers in the neural network visualization dynamically labeled to reflect the actual keywords and topic categories present in the fetched articles. When the reader activates or deactivates a keyword in the input layer, the hidden layers update their node labels to match the new keyword context, and the dots in the output panel reposition accordingly.

**Why this priority**: The current hidden layers are hardcoded (Sentiment, Article Type, Market Context) regardless of which keywords are active. The app's core metaphor — the neural network organizes news by your chosen topics — only works if the layers actually reflect those topics.

**Independent Test**: Activate the "AI Trend" keyword only. Verify that at least one hidden layer node changes its label to something related to AI topics. Then activate "Fed Rate" alongside it. Verify hidden layers update again to reflect the combined keyword set.

**Acceptance Scenarios**:

1. **Given** keywords are active, **When** articles are fetched, **Then** hidden layer nodes are labeled with topic categories derived from those keywords — not hardcoded generic labels
2. **Given** a user toggles a keyword off, **When** the visualization updates, **Then** any hidden layer node whose label was solely driven by that keyword is relabeled or removed
3. **Given** new articles arrive for a keyword change, **When** the hidden layers re-render, **Then** the update completes within 3 seconds
4. **Given** multiple keywords are active, **When** hidden layers render, **Then** each hidden layer node represents a distinct, non-overlapping topic cluster drawn from the active keyword set

---

### User Story 3 - Click Dot to Read Article Detail (Priority: P3)

A news reader clicks any dot in the output panel to open an article detail view showing the article's title, source, publication date, and a link to read the full article on its original site.

**Why this priority**: Clicking a dot is the natural next step after discovering an interesting article in the visualization. Without this, the visualization is a dead end.

**Independent Test**: Click any visible dot. Verify an article detail panel opens showing the correct title, source domain, and date. Click the link — verify the original article opens in a new browser tab.

**Acceptance Scenarios**:

1. **Given** dots are visible in the output panel, **When** the user clicks a dot, **Then** an article detail panel opens immediately showing that article's title, source domain, and publication date
2. **Given** the article detail panel is open, **When** the user clicks the article link, **Then** the original article URL opens in a new browser tab
3. **Given** the article detail panel is open, **When** the user clicks outside the panel or presses close, **Then** the panel closes and the user returns to the visualization

---

### Edge Cases

- What happens when no articles are fetched for active keywords? → Output panel shows "No articles found" state; sidebar shows 0 articles; no dots are rendered
- What happens when all keywords are deactivated? → Output panel and sidebar show empty state with a prompt to activate a keyword
- What happens when the news source is temporarily unavailable? → Last cached articles are shown with a non-blocking status indicator; the screen is never blank
- What happens when an article has a missing title? → Dot is still rendered; detail view shows "Untitled Article" as fallback
- What happens when there are more than 50 articles? → All articles are represented as dots; layout adjusts so dots do not overlap into an unreadable mass

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The output visualization panel MUST display exactly one dot per fetched article — no duplicates, no articles without a corresponding dot
- **FR-002**: Dots MUST be color-coded by article sentiment: blue for positive, red for negative, grey/white for neutral
- **FR-003**: Each dot's position in the output panel MUST reflect the article's relevance to the currently active keywords — articles more relevant to a keyword cluster toward that keyword's zone
- **FR-004**: Input layer keyword nodes MUST be interactive: clicking an active keyword deactivates it; clicking an inactive keyword activates it; the visualization and sidebar update accordingly
- **FR-005**: Hidden layer nodes MUST derive their labels from the currently active keywords and the characteristics of the fetched article set — labels are never hardcoded generic names
- **FR-006**: When the set of active keywords changes, hidden layer nodes MUST reclassify within 3 seconds
- **FR-007**: Clicking any dot MUST open an article detail view showing: title, source domain, publication date, and a link to the full original article
- **FR-008**: The sidebar article list MUST always reflect the same set of articles shown as dots in the output panel, sorted by most recently published first
- **FR-009**: The system MUST display a loading indicator while articles are being fetched
- **FR-010**: When the news source is unavailable, the system MUST show either the last cached article set or a clear error message — a blank output panel is never acceptable

### Key Entities

- **Article**: A single news item with a unique identity, title, source domain, publication date, URL, sentiment classification (positive/negative/neutral), and a set of relevance scores relative to each active keyword. One article maps to exactly one dot.
- **Keyword Node**: An input layer node representing a search topic. Can be toggled active or inactive. Active keywords determine which articles are fetched and how dots are positioned.
- **Hidden Layer Node**: A middle-layer classification node whose label represents a topic category inferred from the active keywords and article content. Labels are dynamic, not hardcoded.
- **Dot**: The visual output representation of an Article. Color reflects sentiment; position reflects keyword relevance; click opens the article detail view.
- **Article Detail View**: A panel that opens when a dot is clicked, displaying the article's title, source, date, and link to the full article.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successfully fetched articles appear as visible, distinct dots in the output panel within 5 seconds of the fetch completing
- **SC-002**: The count of dots in the output panel equals the count of cards in the sidebar list at all times — zero discrepancy
- **SC-003**: After toggling any keyword, hidden layer nodes relabel and output dots reposition within 3 seconds — observable without any page reload
- **SC-004**: Clicking any dot opens the correct article detail view 100% of the time — zero mismatches between dot identity and displayed article
- **SC-005**: The output panel is never blank when articles have previously been fetched — users see last-known articles or a status message 100% of the time when the news source is down

## Assumptions

- The app already fetches articles from a live news RSS feed; this feature fixes the display and layer logic, not the data source itself
- Sentiment classification continues to use a heuristic derived from article titles; AI-based sentiment analysis is out of scope
- Hidden layer topic categories are inferred from active keywords (e.g., "NVDA" → "Semiconductor", "Fed Rate" → "Monetary Policy") using a deterministic keyword-to-category mapping — user-defined custom labels are out of scope
- The visualization maintains the current three-panel layout: input layer (left), hidden layers (center), output dots (right)
- The number of hidden layers remains at 2; the number of nodes per layer scales with the number of active keywords (min 2, max 5 nodes per layer)
- Mobile/tablet layout is out of scope; the visualization targets desktop landscape screens
- The article detail modal already exists in the codebase; this feature ensures it is correctly wired to dot click events
- Articles with duplicate URLs are deduplicated before rendering (only the first occurrence is shown as a dot)
