# Research: Neural Network News Curation MVP

## Decision Log

### 1. Graph Visualization: React Flow
- **Decision**: Use React Flow for the "Input" and "Hidden" layer nodes.
- **Rationale**: Provides out-of-the-box support for draggable nodes, custom edges (for line thickness adjustment), and a highly performant SVG-based canvas.
- **Alternatives Considered**: 
  - **D3.js Force Graph**: More flexible for complex physics, but harder to implement standard UI controls and custom node components.
  - **Canvas API**: Maximum performance but extremely high development cost for interactions.

### 2. Output Map: D3.js + Framer Motion
- **Decision**: Use D3.js for clustering logic (force simulation) and Framer Motion for UI-driven animations (gradients, modals).
- **Rationale**: D3 is the industry standard for mapping data points to 2D space based on relevance. Framer Motion handles the "visual pleasure" aspects (neons, smooth transitions) better than raw D3.
- **Alternatives Considered**:
  - **Three.js**: Overkill for 2D clustering, adds unnecessary bundle size.
  - **Pure CSS/SVG**: Difficult to manage complex clustering of >100 points.

### 3. State Management: Zustand
- **Decision**: Use Zustand for global state.
- **Rationale**: Lightweight, easy to integrate with non-React libraries like D3, and provides high performance for frequently updated state (e.g., dragging edges).
- **Alternatives Considered**:
  - **React Context**: Can lead to performance issues with high-frequency updates if not optimized.
  - **Redux**: Too much boilerplate for an MVP.

### 4. Clustering Algorithm: Force-Directed Placement
- **Decision**: Use D3's `d3-force` to position article dots.
- **Rationale**: Naturally clusters related items together based on their connection to keyword/filter nodes.
- **Alternatives Considered**:
  - **K-Means**: Requires pre-calculating clusters; less dynamic for interactive weight changes.
