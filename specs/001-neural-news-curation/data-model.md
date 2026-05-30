# Data Model: News Curation MVP

## Entities

### 1. Keyword Node (Input)
```typescript
interface KeywordNode {
  id: string;
  label: string;
  isActive: boolean;
  type: 'input';
}
```

### 2. Filter Node (Hidden Layer)
```typescript
interface FilterNode {
  id: string;
  label: string;
  type: 'hidden';
  weight: number; // 0.0 to 1.0
}
```

### 3. Connection (Edge)
```typescript
interface Connection {
  source: string; // KeywordNode.id
  target: string; // FilterNode.id
  weight: number; // thickness factor
}
```

### 4. Article (Output Point)
```typescript
interface Article {
  id: string;
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceMap: Record<string, number>; // keywordId -> relevance score
  type: 'breaking' | 'deep-dive';
}
```

## Mock Data Structure (`data/mock-articles.json`)
```json
{
  "articles": [
    {
      "id": "a1",
      "title": "Nvidia Announces Next-Gen Blackwell Architecture",
      "summary": "Nvidia CEO Jensen Huang unveiled the new AI-focused GPU architecture...",
      "sentiment": "positive",
      "relevanceMap": {
        "nvda": 0.9,
        "ai-trend": 0.8
      },
      "type": "breaking"
    }
  ]
}
```

## Global State (Zustand)
- `activeKeywords`: Set of keyword IDs.
- `filterWeights`: Map of filter IDs to weights.
- `currentGradient`: Calculated RGB/HSL value based on average sentiment and filter weights.
- `mappedPoints`: Array of articles with calculated `(x, y)` coordinates for D3.
