# API Contract: Internal GDELT/News Proxy

**Route**: `GET /api/gdelt`
**Feature**: 004-article-dot-layer-fix | **Date**: 2026-05-30

This is an internal Next.js API route used by the client to fetch news articles while avoiding browser CORS restrictions. No changes to this contract are required for this feature.

---

## Request

```
GET /api/gdelt?query=<encoded_query_string>
```

| Parameter | Required | Description |
|---|---|---|
| `query` | Yes | URL-encoded keyword query string, e.g., `(nvda%20OR%20ai-trend)` |

---

## Response

### Success (200)

```json
{
  "articles": [
    {
      "url": "https://example.com/article-path",
      "domain": "example.com",
      "title": "Article headline text",
      "seendate": "20260530T120000Z"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `articles` | `Article[]` | Array of raw article objects |
| `articles[].url` | `string` | Original article URL (also used as unique ID by client) |
| `articles[].domain` | `string` | Source news domain, stripped of `www.` prefix |
| `articles[].title` | `string` | Article headline |
| `articles[].seendate` | `string` | Publication date in compact ISO format `YYYYMMDDTHHMMSSz` |

### Error (400)

```json
{ "error": "Query parameter is required" }
```

Returned when `query` parameter is missing.

### Rate-Limited / Fallback (200)

When the upstream news source is rate-limiting or unavailable, the route returns the last cached result (or a single-article mock fallback if no cache exists). This is always a 200 response.

---

## Caching Behavior

- Server-side in-memory cache: results valid for 60 seconds per query string
- Client-side cooldown: 6 seconds between fetch calls (enforced in `useGdeltFetch`)
- Server-side cooldown: 3 seconds between upstream fetches (enforced in `route.ts`)

---

## Notes

- The route name (`/api/gdelt`) is historical; the actual upstream source is Google News RSS (`news.google.com/rss/search`)
- Response format is consistent regardless of cache hit or miss — consumers should not rely on detecting cache state
