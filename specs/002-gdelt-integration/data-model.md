# Data Model: GDELT Integration

## Entities (Updates)

### 1. Article (Output Point)
*Modifications to accommodate GDELT fields.*

```typescript
export interface Article {
  id: string;          // GDELT 'url' acts as unique ID
  title: string;       // GDELT 'title'
  summary: string;     // Fallback to empty string, or "Source: [domain]"
  sentiment: 'positive' | 'negative' | 'neutral'; // Derived via client-side heuristic
  relevanceMap: Record<string, number>; // Derived via client-side keyword matching
  type: 'breaking' | 'deep-dive'; // Derived via heuristic
  
  // New Fields from GDELT
  url: string;         // GDELT 'url'
  domain: string;      // GDELT 'domain'
  seendate: string;    // GDELT 'seendate' (e.g., "20260406T074500Z")
  socialimage?: string; // GDELT 'socialimage' (optional)
}
```

## Global State (Zustand) Updates

- `isLoading`: `boolean` - Tracks if the GDELT API is currently fetching data.
- `error`: `string | null` - Stores API fetching errors to display to the user.
