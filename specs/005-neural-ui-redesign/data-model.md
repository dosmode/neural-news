# Data Model: Neural News UI/UX Complete Redesign

**Feature**: 005-neural-ui-redesign | **Date**: 2026-05-30

---

## Store Changes (AppState)

### Fields to REMOVE

| Field | Reason |
|---|---|
| `currentGradient` | No longer used — background gradient is static |

### Fields UNCHANGED

| Field | Type | Description |
|---|---|---|
| `activeKeywords` | `Set<string>` | Active keyword IDs |
| `filterWeights` | `Record<string, number>` | Weight per filter category ID (0–1) |
| `dynamicFilterNodes` | `DynamicFilterNode[]` | Layer 1+2 nodes from active keywords |
| `articles` | `Article[]` | Fetched articles |
| `selectedArticleId` | `string \| null` | ID of article currently shown in detail panel |
| `isLoading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Fetch error message |

### Actions UNCHANGED

| Action | Description |
|---|---|
| `toggleKeyword(id)` | Toggle keyword; recompute filter nodes + weights |
| `setFilterWeight(id, weight)` | Update a filter node's weight |
| `setSelectedArticle(id)` | Open/close article detail panel |
| `setArticles(articles)` | Replace article array |
| `setIsLoading(bool)` | Update loading state |
| `setError(msg)` | Update error state |

---

## Entities (unchanged from 004)

### Article

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Article URL (unique key) |
| `title` | `string` | Headline |
| `summary` | `string` | Short description or source domain |
| `sentiment` | `'positive' \| 'negative' \| 'neutral'` | Heuristic classification |
| `relevanceMap` | `Record<string, number>` | Score per active keyword (0–1) |
| `type` | `'breaking' \| 'deep-dive'` | Article type heuristic |
| `url` | `string` | Original article URL |
| `domain` | `string` | Source domain |
| `seendate` | `string` | `YYYYMMDDTHHMMSSz` format |
| `socialimage?` | `string` | Optional thumbnail |

### MappedPoint

Extends `Article` with screen coordinates from D3 force simulation.

| Field | Type | Notes |
|---|---|---|
| `x` | `number` | Absolute pixel X, clamped to `[10, width-10]` |
| `y` | `number` | Absolute pixel Y, clamped to `[10, height-10]` |

### DynamicFilterNode

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Category ID (e.g., `'Semiconductors'`) |
| `label` | `string` | Display label |
| `layer` | `1 \| 2` | 1 = topic category; 2 = structural filter |

---

## New UI Entities (component-level state, not in Zustand)

### NeuralNode (local to NeuralPanel)

Computed from `activeKeywords` and `dynamicFilterNodes` for rendering.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Node ID |
| `label` | `string` | Display label |
| `type` | `'keyword' \| 'filter'` | Node type |
| `layer` | `0 \| 1 \| 2` | 0 = input, 1 = hidden L1, 2 = hidden L2 |
| `x` | `number` | Pixel X within NeuralPanel |
| `y` | `number` | Pixel Y within NeuralPanel |
| `isActive` | `boolean` | For keyword nodes: is this keyword active? |
| `weight` | `number` | For filter nodes: current filterWeight value |

### NeuralEdge (local to NeuralPanel)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `e-{sourceId}-{targetId}` |
| `sourceId` | `string` | Source node ID |
| `targetId` | `string` | Target node ID |
| `sourceX, sourceY` | `number` | Source attachment point |
| `targetX, targetY` | `number` | Target attachment point |
| `isActive` | `boolean` | Source keyword is active |
| `weight` | `number` | Target filter node weight |
| `opacity` | `number` | Computed: `isActive ? 0.3 + weight*0.7 : 0.05` |
| `strokeWidth` | `number` | Computed: `isActive ? 1 + weight*2.5 : 0.5` |

---

## Layout Constants

Centralized in a `layout.ts` constants file for easy adjustment.

| Constant | Value | Description |
|---|---|---|
| `NEURAL_PANEL_WIDTH` | `360` | px width of left NeuralPanel |
| `ARTICLE_STRIP_HEIGHT` | `180` | px height of bottom ArticleStrip |
| `ARTICLE_DETAIL_WIDTH` | `400` | px width of slide-in detail panel |
| `HEADER_HEIGHT` | `72` | px height of header |
| `DOT_SIZE` | `24` | px diameter of article dots |
| `CARD_WIDTH` | `200` | px width of strip article cards |

---

## Keyword Definitions (unchanged)

```typescript
const KEYWORD_DEFINITIONS = [
  { id: 'nvda', label: 'NVDA' },
  { id: 'tsmc', label: 'TSMC' },
  { id: 'ai-trend', label: 'AI Trend' },
  { id: 'fed-rate', label: 'Fed Rate' },
  { id: 'us-china', label: 'US-China' },
];

const KEYWORD_CATEGORY_MAP = {
  'nvda': 'Semiconductors',
  'tsmc': 'Semiconductors',
  'ai-trend': 'AI & Technology',
  'fed-rate': 'Monetary Policy',
  'us-china': 'Geopolitics',
};
```
