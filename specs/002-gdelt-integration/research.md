# Research: GDELT Live Data Integration

## Decision Log

### 1. Data Fetching Architecture
- **Decision**: Client-side fetching directly from `api.gdeltproject.org` using a custom React Hook (`useGdeltFetch`).
- **Rationale**: The GDELT DOC API supports CORS and does not require an API key for basic tier usage. This allows us to keep the application frontend-only for MVP 2, dramatically reducing deployment complexity and costs.
- **Alternatives Considered**: 
  - **Next.js API Route (Backend Proxy)**: Would hide the API request, but adds unnecessary serverless function execution time and potential Vercel timeout limits for free tiers.

### 2. Query Construction
- **Decision**: Combine active keywords using the `OR` operator (or just space-separated as GDELT default `AND`) based on UI behavior. For this MVP, we will join active keywords with spaces (which acts as a logical AND or proximity search depending on GDELT semantics) or use multiple queries if necessary. Actually, simpler: construct a query string like `(keyword1 OR keyword2)`.
- **Rationale**: If users select multiple trending topics, they likely want to see articles related to *any* of those topics on the map to see how they cluster.
- **Alternatives Considered**: 
  - **Logical AND**: `keyword1 AND keyword2`. Might return 0 results too often, leaving the map empty and the user confused.

### 3. Sentiment Heuristic (Fallback)
- **Decision**: Since GDELT `artlist` JSON does not expose the complex 100-dimension Tone array directly in a simple format, we will use a pseudo-randomized heuristic based on the article's `domain` or a hash of the `title` string to assign 'positive', 'negative', or 'neutral'.
- **Rationale**: The primary goal of MVP 2 is live data *rendering*, not NLP accuracy. A deterministic hash ensures the same article always gets the same color, preventing flickering while keeping the visual variety of the map intact.
- **Alternatives Considered**: 
  - **Client-side NLP Library**: (e.g., Sentiment.js). Adds massive bundle size for a feature that will be replaced by an LLM in MVP 3.

### 4. Relevance Mapping
- **Decision**: Assign a baseline relevance score of 1.0 to the active keywords that appear in the article's title. If no active keywords appear in the title, assign a uniform baseline score so the D3 simulation still groups them centrally.
- **Rationale**: GDELT does not return a detailed relevance vector per article in the `artlist` format. We must infer it client-side to keep the clustering feature working.
