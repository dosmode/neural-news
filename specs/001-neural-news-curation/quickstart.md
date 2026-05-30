# Quickstart: Neural Network News Curation MVP

## Development Environment Setup

1. **Prerequisites**
   - Node.js 20 or higher
   - npm or pnpm

2. **Installation**
   ```bash
   npm install
   ```

3. **Running the Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## UI Interaction Guide

### 1. Input Layer (Keywords)
- Click on a keyword node to toggle its active state.
- Active nodes will emit a "pulse" animation.

### 2. Hidden Layer (Filters)
- Hover over a filter node to see its description.
- Use the slider or drag the connection edge to adjust the weight (0-100%).
- Observe the line thickness changing in real-time.

### 3. Output Layer (Curation Map)
- The background gradient represents the "emotional/analytical temperature" of the current selection.
- Blue = Positive/Steady, Red = Fear/High Volatility, Green = Greed/Aggressive Growth.
- Click on a data point (dot) to open the article modal.

## Project Structure for Contributors

- `src/components/graph`: Custom logic for React Flow nodes and edges.
- `src/components/map`: D3.js force simulation and canvas/SVG rendering for the points.
- `src/data`: Edit `mock-articles.json` to add or modify the news feed content.
- `src/utils/clustering.ts`: Core math for mapping relevance to X/Y coordinates.
