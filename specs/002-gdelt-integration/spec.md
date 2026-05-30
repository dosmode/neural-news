# Feature Specification: GDELT Live Data Integration (MVP 2)

**Feature Branch**: `002-gdelt-integration`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "현재 하드코딩된 Mock 데이터를 제거하고 GDELT DOC 2.0 API를 연동하여 실시간 뉴스를 가져오는 기능. 주요 요구사항: 1. 사용자가 선택한 키워드를 GDELT API의 쿼리로 변환하여 실시간 기사 목록(JSON) 패치 2. 응답받은 기사의 URL, 제목, 날짜 데이터를 기존 CurationMap(D3.js)에 맞게 변환하여 렌더링 3. 감성 분석(Sentiment)은 임시로 무작위 배정하거나 GDELT Tone 속성 활용"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Data Fetching by Keyword (Priority: P1)

As a user, I want the system to fetch live news articles from the GDELT API based on the currently active keyword nodes so that I can explore real-time information rather than static mock data.

**Why this priority**: Replacing the mock data with live data is the core objective of this iteration, vastly increasing the product's impact.

**Independent Test**: Can be tested by activating a keyword (e.g., "NVDA"), verifying the network request to `api.gdeltproject.org`, and ensuring the resulting JSON payload is logged or loaded into the state.

**Acceptance Scenarios**:

1. **Given** the application is loaded, **When** I click a keyword node to make it active, **Then** an HTTP GET request is made to the GDELT DOC API with the node's label as the query.
2. **Given** multiple active keywords, **When** the keyword selection changes, **Then** the application fetches new data matching the new combination of keywords (e.g., combined query or separate queries merged).

---

### User Story 2 - Data Transformation and Map Rendering (Priority: P1)

As a user, I want the live GDELT data to be transformed into the format expected by the Curation Map so that the articles are clustered and visualized exactly like the previous mock data.

**Why this priority**: The fetched data is useless if the D3 graph cannot render it.

**Independent Test**: Can be tested by verifying that GDELT `url`, `title`, and `seendate` are correctly mapped to the `Article` interface, and that the D3 simulation successfully clusters them without crashing.

**Acceptance Scenarios**:

1. **Given** a successful JSON response from GDELT, **When** the payload is processed, **Then** it must be mapped to the `Article` type, mapping `url` to `id`/link, `title` to `title`, and generating a `relevanceMap`.
2. **Given** the transformed articles, **When** they are passed to the `useClustering` hook, **Then** they should appear as interactive dots on the Curation Map.

---

### User Story 3 - Sentiment Assignment (Priority: P2)

As a user, I want each live article to have a sentiment score (Positive/Negative/Neutral) so that the map's heatmap gradient and point colors work correctly.

**Why this priority**: The map's background gradient and node colors rely on sentiment data. Since GDELT DOC API (artlist mode) might not provide direct Tone data reliably in standard JSON mode, a fallback or heuristic is needed.

**Independent Test**: Can be tested by inspecting the mapped `Article` objects and verifying that the `sentiment` field is populated with a valid enum value.

**Acceptance Scenarios**:

1. **Given** an article fetched from GDELT, **When** the data is transformed, **Then** a sentiment ('positive', 'negative', or 'neutral') is assigned. (If GDELT Tone is unavailable, use a randomized or rule-based fallback for this MVP).

### Edge Cases

- **Rate Limiting**: Handling HTTP 429 Too Many Requests from GDELT. (Should fail gracefully and keep existing points).
- **Empty Results**: If GDELT returns 0 articles for a keyword combination, the map should clear or show an empty state.
- **CORS Issues**: While GDELT DOC API is generally open, fetch logic must handle potential network errors gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove the existing `mock-articles.json` loading logic.
- **FR-002**: System MUST fetch data from `https://api.gdeltproject.org/api/v2/doc/doc?query=[KEYWORDS]&mode=artlist&maxrecords=50&format=json` whenever the `activeKeywords` state changes.
- **FR-003**: System MUST transform the GDELT JSON response into the internal `Article` interface.
- **FR-004**: System MUST assign a mock or derived `sentiment` value to each article to preserve existing UI coloring.
- **FR-005**: System MUST assign pseudo-relevance scores (`relevanceMap`) based on the keywords used in the query so the D3 force simulation functions correctly.
- **FR-006**: System MUST update the `ArticleModal` to display the actual article title, source domain, and a link to open the full article.

### Key Entities (Updates)

- **Article Data Point (Updated)**:
  - `id`: Mapped to GDELT `url`
  - `title`: Mapped to GDELT `title`
  - `summary`: Fallback to empty string or domain name (as GDELT artlist does not provide full summary).
  - `sourceUrl`: Mapped to GDELT `url`
  - `domain`: Mapped to GDELT `domain`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking a keyword updates the map with live internet news within 2 seconds (dependent on GDELT API latency).
- **SC-002**: The application does not crash if the GDELT API is unreachable.
- **SC-003**: Existing visualizations (Force graph clustering, heatmap gradient) continue to function perfectly using the live data.

## Assumptions

- **GDELT Open Access**: The GDELT DOC 2.0 API remains free and accessible from the browser (no CORS blocks) for standard queries.
- **Client-Side Fetching**: All data fetching will occur directly from the browser without requiring a backend proxy for this iteration.
- **Sentiment Approximation**: It is acceptable to use a randomized or simple heuristic for sentiment if GDELT Tone data is not easily extractable from the `artlist` endpoint.
