# UI Contracts: Neural Network Interaction

## Node Interaction Protocol

### Keyword Toggle
- **Trigger**: Click/Tap on `KeywordNode`
- **Action**: Toggle `isActive` in global state.
- **Visual Feedback**: Neon glow on/off, line connection opacity update.

### Weight Adjustment
- **Trigger**: Drag on `ConnectionEdge` handle or Slider on `FilterNode`.
- **Value**: `weight` range `[0.0, 1.0]`.
- **Propagation**: 
  - Update `thickness` property of the edge.
  - Re-run D3 clustering simulation with updated weights.

## Map Visualization Protocol

### article Clustering
- **Input**: `activeKeywords`, `filterWeights`, `articles`.
- **Algorithm**: `d3-force` with:
  - `forceX/forceY`: Pull points towards the center of their highest relevance.
  - `forceCollide`: Prevent point overlap.
- **Output**: Set of `(x, y)` coordinates for article rendering.

### Gradient Calculation
- **Logic**: Weighted average of `sentiment` scores from all currently visible articles.
- **Mapping**:
  - Sentiment > 0.5 → Cyan/Blue range.
  - Sentiment < -0.5 → Crimson/Red range.
  - High Fear Weight → Increased saturation.
