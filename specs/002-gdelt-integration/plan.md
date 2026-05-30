# Implementation Plan: GDELT Live Data Integration (MVP 2)

**Branch**: `002-gdelt-integration` | **Date**: 2026-05-30 | **Spec**: [specs/002-gdelt-integration/spec.md](spec.md)

**Input**: Feature specification from `/specs/002-gdelt-integration/spec.md`

## Summary

Replace the static mock data with live news fetched from the GDELT DOC 2.0 API. This iteration focuses on querying the GDELT API using the currently active keywords from the React Flow graph, transforming the resulting JSON into the existing `Article` format, applying a simple sentiment heuristic to maintain visual consistency, and rendering the live data points on the D3 Curation Map.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+

**Primary Dependencies**: React (Next.js), React Flow, D3.js, Framer Motion, Tailwind CSS

**Storage**: None (Client-side fetching only for MVP 2)

**Testing**: Vitest (Unit), Playwright (E2E/Integration)

**Target Platform**: Web (Desktop/Tablet Optimized, Mobile Responsive)

**Project Type**: Web Application / Interactive Visualization Tool

**Performance Goals**: Fetch and render live data within 2 seconds (API latency dependent)

**Constraints**: Handle potential GDELT API rate limits or missing data gracefully without crashing.

**Scale/Scope**: Up to 50 live articles fetched per query update.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Mobile-Responsive First**: Map and modals will continue to adapt to mobile.
- [x] **High Performance & Fast Loading**: Live fetching requires loading states, but the D3 rendering remains optimized.
- [x] **Data Privacy & Security**: No personal data is being collected or sent; only public GDELT data is queried.
- [x] **Component-Based Architecture**: Fetching logic will be isolated in a dedicated service/hook.
- [x] **Continuous Automated Testing**: Tests must be updated to mock the GDELT API response instead of local JSON.

## Project Structure

### Documentation (this feature)

```text
specs/002-gdelt-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Decision log for API integration and sentiment heuristics
├── data-model.md        # Updated Article entity definition
├── quickstart.md        # Interaction guide with live data
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/
    └── gdelt-api.md     # GDELT DOC 2.0 API schema mapping
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── graph/           # React Flow nodes (Unchanged mostly)
│   ├── map/             # CurationMap (Unchanged mostly)
│   └── shared/          # ArticleModal (Update domain/url display)
├── hooks/
│   └── useGdeltFetch.ts # NEW: Custom hook for API fetching
├── services/
│   └── gdeltService.ts  # NEW: API client and transformation logic
├── store/
│   └── useStore.ts      # Update to handle async loading states
└── types/
    └── index.ts         # Update Article interface
```

**Structure Decision**: Retaining the existing single project structure. Adding a `services` directory to encapsulate the external API communication logic, keeping the React components pure.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
