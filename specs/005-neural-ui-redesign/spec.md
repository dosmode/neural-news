# Feature Specification: Neural News UI/UX Complete Redesign

**Feature Branch**: `005-neural-ui-redesign`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "전면 재배치 전면재구성 깔끔하고 UIUX를 고려한 개발 최대한 화려하고 깔끔한 디자인으로 직관적으로 신경망 필터와 거기에 맞는 기사필터 반영이 잘 되었으면 좋겠어"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Glance Understanding of Filter State (Priority: P1)

A news reader opens the app and immediately understands: which keywords are active, how the neural network is processing them, and how many articles are displayed. Everything is legible at a single glance without hunting.

**Why this priority**: The current layout confuses cause (keyword selection) and effect (article output). Users can't tell whether the neural network is "doing anything." Without this clarity every other feature is frustrating.

**Independent Test**: A first-time user identifies (unaided) which keywords are active, how many articles are showing, and what to click to add a keyword — all in under 10 seconds.

**Acceptance Scenarios**:

1. **Given** the app loads, **When** the user views the screen, **Then** active keyword nodes are visually distinct through at least two properties (color, glow, size) — not a subtle tint only
2. **Given** a keyword is active, **When** the user looks at the neural layer, **Then** connections from that keyword to hidden layer nodes are clearly animated or highlighted to show data flowing
3. **Given** articles are loaded, **When** the user views the output area, **Then** the article count is prominently visible without finding a small corner badge
4. **Given** a desktop screen (1280px+), **When** the page loads, **Then** keyword input, neural layer, and article output are all visible simultaneously without any scrolling

---

### User Story 2 - Instant, Visible Filter-to-Article Feedback (Priority: P1)

When the user toggles a keyword, they see an immediate visual response in the neural network AND the articles update to match. The connection between toggling a filter and seeing the result is unmistakable.

**Why this priority**: Currently the filter action and the result feel disconnected. Users don't feel in control. Making the system feel alive and responsive is essential for the "neural news curator" metaphor to work.

**Independent Test**: Toggle a keyword off. Within 3 seconds, at least two visible changes must occur: (a) neural connections change, (b) article dot positions or count changes, (c) a filter state indicator updates.

**Acceptance Scenarios**:

1. **Given** a keyword is toggled OFF, **When** the neural layer updates, **Then** connections from that keyword visibly dim or disappear rather than staying the same opacity
2. **Given** articles reposition after a keyword change, **When** the user watches the output, **Then** dots animate smoothly to new positions — they do not disappear and reappear
3. **Given** a new fetch is loading, **When** the output area waits for data, **Then** previously shown articles remain visible (dimmed) — the screen is never blank
4. **Given** a filter changes, **When** hidden layer node labels update, **Then** the update is animated smoothly, not an abrupt swap

---

### User Story 3 - Glamorous, Polished Visual Design (Priority: P2)

The app looks visually striking: dark high-contrast interface with glowing elements, smooth animations, and clear visual hierarchy. It feels like a premium real-time data product, not a prototype.

**Why this priority**: The data pipeline works. The design should match the product's ambition. Polish increases trust and encourages exploration.

**Independent Test**: Show to 3 unfamiliar users. Ask "What is this? Does it look finished?" Majority should say "news/data viz tool" and describe it as "polished" or "impressive" — not "basic" or "prototype."

**Acceptance Scenarios**:

1. **Given** any screen state, **When** the user views the app, **Then** no element looks like a placeholder or unstyled default — every component has intentional styling
2. **Given** a dot is hovered, **When** the preview card appears, **Then** the card uses a frosted/glassmorphism style consistent with the overall dark aesthetic
3. **Given** articles load, **When** dots enter the screen, **Then** they fade/scale in with a subtle staggered animation — not appearing all at once
4. **Given** the neural network is shown, **When** edge animations play, **Then** they run smoothly without stuttering at the same visual quality as the dot animations

---

### User Story 4 - Complete Layout Reorganization (Priority: P2)

The three zones — keyword input, neural processing, article output — are spatially arranged so the data flow left-to-right (or top-to-bottom) is immediately obvious. The article list complements the scatter rather than competing with it for space.

**Why this priority**: The current equal-column layout treats all panels as equally important. The output visualization needs more space, and the article list should serve as a drill-down detail panel rather than a side-by-side feed.

**Independent Test**: Describe the layout to someone without showing the screen. They can sketch a wireframe that matches the actual page. If the description requires saying "I'm not sure what each column is for," the layout has failed.

**Acceptance Scenarios**:

1. **Given** the desktop layout, **When** the user views the page, **Then** the spatial arrangement communicates the pipeline: filter controls → neural processing → article output
2. **Given** the article list and scatter visualization, **When** both are visible, **Then** the list is clearly a detail companion to the scatter — not a competing feed
3. **Given** a dot is clicked, **When** the article detail appears, **Then** it opens in-context (side panel or modal) without fully obscuring the neural network visualization
4. **Given** a viewport narrower than 1280px, **When** the user views the app, **Then** the primary visualization and a compact article list remain functional — not broken or invisible

---

### Edge Cases

- What if all keywords are deactivated? → Clear empty state with a prompt to select a keyword, not a blank or broken screen
- What if 0 articles load? → Visible empty state message; neural network visualization remains interactive
- What if 100+ articles load? → All dots render without UI freeze; dot density does not make the scatter unreadable
- What if the user rapidly toggles keywords? → UI debounces gracefully — no flashing, stuttering, or mixed states
- What if the screen is resized? → Layout reflows without breaking the visualization

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All three zones (keyword input, neural processing, article output) MUST be visible simultaneously on desktop (1280px+) without scrolling
- **FR-002**: Active keyword nodes MUST be visually distinct from inactive nodes through at least two visual properties (color, glow, size change)
- **FR-003**: Neural network connections MUST update visually within 500ms of a keyword being toggled
- **FR-004**: When a fetch is loading, previously shown article dots MUST remain visible (at reduced opacity) — screen MUST NOT go blank
- **FR-005**: The article count MUST be prominently displayed in the output zone whenever articles are loaded
- **FR-006**: Hovering an article dot MUST show a glassmorphic preview card with title (3 lines max), source domain, date, and sentiment indicator
- **FR-007**: Clicking an article dot MUST open a detail view without fully obscuring the neural network visualization
- **FR-008**: Dot entrance animations MUST be staggered to create a natural "populating" effect
- **FR-009**: The article list MUST always show the same set of articles as the scatter dots — they are two views of the same data
- **FR-010**: All interactive elements MUST give visual feedback within 100ms of user interaction
- **FR-011**: The design MUST use dark background, high-contrast neon/luminous accent colors, glassmorphism panels, and smooth transitions throughout
- **FR-012**: The spatial layout MUST communicate the data flow direction: keyword selection → neural processing → article output

### Key Entities

- **Keyword Node**: Toggleable input element representing a news topic. Active/inactive states are visually distinctive through multiple properties (color, glow, size).
- **Neural Connection**: Visual edge between layers showing data flow. Active = bright + animated; inactive = dim or absent.
- **Hidden Layer Node**: Classification node with weight slider. Label reflects dynamic keyword-to-category mapping.
- **Article Dot**: Colored circle representing one article. Color = sentiment; position = keyword relevance. Hover for preview, click for detail.
- **Preview Card**: Glassmorphic floating card on dot hover. Shows title, domain, date, sentiment.
- **Article Detail Panel**: Side panel or modal on dot click. Full article info + source link. Does not obscure full visualization.
- **Article List**: Companion panel showing same articles as dots. Serves as sorted/scrollable detail view.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time user identifies active keywords, article count, and how to toggle a keyword in under 10 seconds — verified by observation
- **SC-002**: Toggling a keyword produces visible change in both neural layer and article output within 3 seconds
- **SC-003**: Zero layout-breaking issues at 1280px, 1440px, and 1920px viewport widths
- **SC-004**: Dot entrance animation is smooth and staggered at 60fps with up to 100 dots on screen
- **SC-005**: At least 2 of 3 unfamiliar users describe the app as "polished" or "professional" when shown it cold

---

## Assumptions

- Desktop-first (1280px+); narrow viewport is graceful degradation, not primary target
- Dark neon aesthetic (dark background, glowing cyan/blue/red accents) is the correct direction — no light theme
- Article detail opens as a modal or side panel; the visualization stays visible behind it
- The neural network metaphor remains central — redesign enhances it, does not replace it
- Keyword categories in hidden Layer 1 remain dynamic (Semiconductors, AI & Technology, etc.)
- Article list and scatter always show the same articles — two views of one dataset
- Fetch debouncing and rate limiting are unchanged; perceived responsiveness improves through animation
- Existing sentiment color coding (blue = positive, red = negative, white/grey = neutral) is preserved
