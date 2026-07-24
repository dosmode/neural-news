# UI Contract: KeywordGraphPanel

**Feature**: 013-keyword-graph-explorer
**Replaces**: `src/components/neural/NeuralPanel.tsx`

## Component Interface

### `KeywordGraphPanel`

```typescript
interface KeywordGraphPanelProps {
  className?: string;
  style?: React.CSSProperties;
}
```

Drop-in replacement for `NeuralPanel` in `src/app/page.tsx`. Same prop signature preserved.

### `FloatingKeywordNode`

```typescript
interface FloatingKeywordNodeProps {
  id: string;
  label: string;
  isActive: boolean;
  position: { x: number; y: number };
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}
```

### `SuggestionNode`

```typescript
interface SuggestionNodeProps {
  id: string;
  label: string;
  position: { x: number; y: number };
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}
```

### `GraphEdges`

```typescript
interface GraphEdgesProps {
  edges: Array<{
    id: string;
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    type: 'keyword-to-suggestion' | 'keyword-to-keyword';
  }>;
  width: number;
  height: number;
}
```

## Visual Contract

| Node Type | Visual Style |
|-----------|-------------|
| Active keyword | Neon blue pill, 100% opacity, glowing border |
| Inactive keyword | White/30 pill, 95% opacity, dim border |
| Suggestion | Neon purple pill, 50% opacity, dashed border |
| Accepted suggestion (active keyword) | Transitions from suggestion → active keyword style |

## Behavior Contract

| Action | Expected Response |
|--------|------------------|
| Add keyword | Node appears, floats to random position, suggestions appear within 500ms |
| Click suggestion | Node becomes active keyword, new suggestions spawn around it |
| Dismiss suggestion (×) | Node fades out, not re-shown in session |
| Toggle keyword | Opacity/style toggles between active/inactive |
| Remove keyword | Node + derived suggestions fade out and are removed |
| Empty state | "Add a keyword to explore" hint shown |

## State Dependencies

The component reads from and writes to Zustand store:

**Reads**: `keywords`, `activeKeywords`, `suggestions`, `isLoading`

**Writes**: `toggleKeyword`, `addKeyword`, `removeKeyword`, `addSuggestions`, `acceptSuggestion`, `dismissSuggestion`
