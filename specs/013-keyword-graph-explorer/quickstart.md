# Quickstart: Floating Keyword Graph Explorer

**For developers implementing feature 013-keyword-graph-explorer**

## What We're Building

Replacing the existing 3-layer neural network visualization (`NeuralPanel.tsx`) with a floating keyword graph where:
1. User keywords float freely in the panel with Framer Motion drift animations
2. Each keyword spawns 3–5 related suggestion nodes around it
3. Clicking a suggestion promotes it to a keyword (Obsidian-style cascading derivation)
4. SVG edges connect keywords to their suggestions

## Files to Change

### New Files
```
src/
├── components/neural/
│   ├── KeywordGraphPanel.tsx     — main panel component (replaces NeuralPanel)
│   ├── FloatingKeywordNode.tsx   — individual keyword node with drift animation
│   ├── SuggestionNode.tsx        — dimmed suggestion node
│   └── GraphEdges.tsx            — SVG overlay for connection lines
├── hooks/
│   └── useKeywordSuggestions.ts  — hook: generate suggestions when keyword added
└── services/
    └── keywordSuggestions.ts     — static suggestion adjacency map
```

### Modified Files
```
src/types/index.ts        — add SuggestionDef, extend KeywordDef with parentId
src/store/useStore.ts     — add suggestion state + actions
src/app/page.tsx          — swap NeuralPanel → KeywordGraphPanel import
```

### Files to Delete
```
src/components/neural/NeuralPanel.tsx   — replaced entirely
```

## Implementation Order

1. `src/types/index.ts` — add types first (everything depends on this)
2. `src/services/keywordSuggestions.ts` — pure data, no dependencies
3. `src/store/useStore.ts` — extend store with suggestion state
4. `src/hooks/useKeywordSuggestions.ts` — hook wiring suggestions to store
5. `src/components/neural/FloatingKeywordNode.tsx` — leaf component
6. `src/components/neural/SuggestionNode.tsx` — leaf component
7. `src/components/neural/GraphEdges.tsx` — SVG layer
8. `src/components/neural/KeywordGraphPanel.tsx` — assembles everything
9. `src/app/page.tsx` — swap import

## Key Technical Notes

### Floating Animation Pattern (Framer Motion)
```tsx
// Each node gets a unique random drift loop
const driftX = [-8, 5, -3, 8, -5];  // randomized per node
const driftY = [4, -7, 9, -4, 6];   // randomized per node
<motion.div
  animate={{ x: driftX, y: driftY }}
  transition={{ duration: 8 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
/>
```

### Position Assignment
- Panel divided into a soft grid for initial placement
- New nodes placed in least-populated grid cell
- Positions stored in component-local `Map<string, {x,y}>` (not persisted to store)

### Suggestion Trigger Flow
```
addKeyword(label)
  → store.addKeyword() → keyword added to store
  → useKeywordSuggestions detects new keyword via useEffect
  → getSuggestionsFor(keyword.id) → string[]
  → store.addSuggestions(keyword.id, labels[])
  → KeywordGraphPanel re-renders with new SuggestionNodes
```

### Cascade Removal
When `removeKeyword(id)` is called:
1. Remove keyword from `keywords[]`
2. Remove all `suggestions` where `sourceKeywordId === id`
3. Find any keyword with `parentId === id` → recursively remove those too

## Running the Dev Server
```bash
npm run dev
```
Panel is visible on the left side at `http://localhost:3000`.

## Tests
```bash
npm test
```
Unit tests for suggestion map and store actions live in `tests/`.
