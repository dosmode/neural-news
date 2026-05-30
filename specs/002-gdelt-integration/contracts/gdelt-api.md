# Interface Contract: GDELT DOC 2.0 API

**Type**: REST JSON API
**Endpoint**: `https://api.gdeltproject.org/api/v2/doc/doc`
**Method**: `GET`
**Auth**: None required (Rate limits apply)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The search query (e.g., `"Nvidia" OR "TSMC"`) |
| `mode` | string | Yes | Must be `artlist` for JSON article list |
| `maxrecords`| integer | No | Max number of articles to return (e.g., `50`, max `250`) |
| `format` | string | Yes | Must be `json` |
| `sort` | string | No | Sorting method (e.g., `DateDesc`) |

*Example Query String*:
`?query=("Nvidia" OR "TSMC")&mode=artlist&maxrecords=50&format=json&sort=DateDesc`

## Response Format

```json
{
  "articles": [
    {
      "url": "https://www.example.com/news/123",
      "url_mobile": "http://m.example.com/news/123",
      "title": "Article Title Here",
      "seendate": "20260406T074500Z",
      "socialimage": "https://www.example.com/image.jpg",
      "domain": "example.com",
      "language": "English",
      "sourcecountry": "United States"
    }
  ]
}
```

## Error Handling

- If `query` returns no results, GDELT often returns an empty object `{}` or omits the `articles` array. The client must safely check for `response.articles`.
- If rate limited (HTTP 429), the fetch hook should catch the error and update the global `error` state.
