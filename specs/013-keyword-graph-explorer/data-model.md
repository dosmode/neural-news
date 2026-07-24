# Data Model: Floating Keyword Graph Explorer

**Feature**: 013-keyword-graph-explorer
**Date**: 2026-06-09

## Entities

### KeywordDef (extended)
*Already exists in `src/types/index.ts`. Add `parentId` field.*

| Field | Type | Description |
|-------|------|-------------|
| id | string | Slug-based unique identifier |
| label | string | Display text |
| parentId | string \| null | ID of the keyword this was derived from. null = root |

### SuggestionDef (new)
*To be added to `src/types/index.ts`*

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique id (slug of label + sourceKeywordId) |
| label | string | Display text of the suggested keyword |
| sourceKeywordId | string | The keyword that triggered this suggestion |
| isDismissed | boolean | Whether user dismissed this suggestion |

### FloatingPosition (local component state, not persisted)
*Internal to `KeywordGraphPanel` component*

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | References KeywordDef.id or SuggestionDef.id |
| x | number | Base X position (pixels, relative to panel) |
| y | number | Base Y position (pixels, relative to panel) |

## State Transitions

### Keyword Lifecycle
```
[User Input] → addKeyword() → KeywordDef (active) → {suggestions auto-generated}
KeywordDef (active) → toggleKeyword() → KeywordDef (inactive, still visible)
KeywordDef (active/inactive) → removeKeyword() → [removed from state, derived suggestions removed]
```

### Suggestion Lifecycle
```
[Keyword Added] → addSuggestions() → SuggestionDef (visible)
SuggestionDef (visible) → acceptSuggestion() → KeywordDef (active, parentId set) → {new suggestions auto-generated}
SuggestionDef (visible) → dismissSuggestion() → SuggestionDef (isDismissed=true, hidden)
[Parent keyword removed] → removeKeyword() → [all suggestions with sourceKeywordId removed]
```

## Zustand Store Extensions

### New State Fields
```typescript
suggestions: SuggestionDef[];
```

### New Actions
```typescript
addSuggestions: (sourceKeywordId: string, labels: string[]) => void;
acceptSuggestion: (suggestionId: string) => void;
dismissSuggestion: (suggestionId: string) => void;
```

### Modified Actions
- `removeKeyword(id)`: Also removes all `suggestions` where `sourceKeywordId === id` AND removes any keyword whose `parentId === id` (cascade removal, depth 1 only per spec FR-008/FR-001)

> **Note**: Deep cascade removal (keyword whose parent was itself a promoted suggestion) is handled by checking if the child keyword is in `keywords` with `parentId === id`. If yes, it also gets removed and its suggestions cleared. This provides the Obsidian "collapse branch" feel.

## Keyword Suggestion Map

Stored in `src/services/keywordSuggestions.ts`. Key = keyword slug, value = array of suggested labels.

```typescript
// Example entries:
'ai': ['Machine Learning', 'OpenAI', 'Deep Learning', 'Automation', 'Nvidia', 'Robotics'],
'bitcoin': ['Ethereum', 'Crypto', 'Blockchain', 'DeFi', 'Stablecoins', 'Halving'],
'nvidia': ['Semiconductors', 'AI', 'TSMC', 'GPU', 'Data Centers', 'Jensen Huang'],
// ... (full map in implementation)
```

For keywords not in the map, a fuzzy fallback pulls from `TRENDING_POOL` excluding already-active keywords.

## Validation Rules

- Max 8 active (fully adopted) keywords (existing `MAX_KEYWORDS` constraint preserved)
- Suggestion count per keyword: 3–6 (configurable constant `SUGGESTIONS_PER_KEYWORD = 5`)
- Suggestions already present as active keywords are excluded from the suggestion list
- Dismissed suggestions are not re-suggested for the same keyword in the current session
