# Quickstart: GDELT Live Data Integration

## Live Data Interaction Guide

With MVP 2, the application now fetches real-time data from the GDELT project.

### 1. Activating Live Feeds
- Click on any keyword node in the Input Layer (Left side).
- You will see a "LOADING LIVE DATA..." indicator in the status bar or map area.
- The Curation Map (Right side) will automatically populate with live articles fetched from global news sources within 1-2 seconds.

### 2. Multi-Keyword Queries
- Selecting multiple keywords (e.g., "NVDA" and "TSMC") will construct a combined query sent to GDELT.
- The map will cluster the resulting articles based on which keywords appear in the article titles.

### 3. Rate Limits
- The GDELT API is free but has undisclosed rate limits.
- If you click keywords too rapidly, you may see an "API Rate Limit Exceeded" or "Fetch Error" message. Wait a few seconds before trying again.

## Behind the Scenes (For Developers)

- **`src/services/gdeltService.ts`**: Contains the core fetch logic and the heuristics that map GDELT's raw JSON into our `Article` format (assigning colors/sentiment based on simple title hashing).
- **`src/hooks/useGdeltFetch.ts`**: The React hook that watches the `activeKeywords` state in Zustand and triggers the service automatically.
