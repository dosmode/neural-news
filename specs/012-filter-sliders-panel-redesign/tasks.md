---
description: "Tasks for Working Filter Sliders & Neural Panel Redesign"
---

# Tasks: Working Filter Sliders & Neural Panel Redesign

**Input**: Design documents from `specs/012-filter-sliders-panel-redesign/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Unit tests for the pure `computeEmphasisMap` (constitution Principle V). Existing 43 tests must stay green.

**Organization**: Tasks grouped by user story. US1 (sliders drive output) + US2 (uncramped panel) are the P1 MVP; US3 (feedback loop) is P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** No new dependency; Vitest + Tailwind already configured. `filterWeights` already exists in the store.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The pure emphasis engine that turns weights into visible dot changes — the core of "make the sliders work."

⚠️ **CRITICAL**: US1 depends on this.

- [ ] T001 [P] Create `src/utils/emphasis.ts`: `export interface DotEmphasis { scale: number; opacity: number }`; helper `c(w) = (w-0.5)*2` (centered weight) and a clamp; `export function computeEmphasisMap(articles: Article[], activeKeywords: Set<string>, filterWeights: Record<string,number>, keywords: {id:string;label:string}[]): Map<string, DotEmphasis>` — returns empty map for empty articles; reuse `parseSeendate` (from `@/utils/timeline`) to normalize recency (newest=1/oldest=0 over dated articles; undated→0), `dominantTopic` (from `@/utils/clustering`) for the dot's topic; per article compute `relevance = max(relevanceMap[id])` over active ids, `strength = sentiment==='neutral' ? 0.2 : 1`, then `e = c(wSentiment)*strength + c(wRecency)*recency + c(wRelevance)*relevance + c(wTopic)`, `emphasis = clamp(e/4, -1, 1)`, and set `{ scale: 1 + emphasis*0.45, opacity: 1 + Math.min(0, emphasis)*0.55 }` keyed by `article.id`; all weights 0.5 → every entry `{scale:1, opacity:1}`

**Checkpoint**: `npx tsc --noEmit` clean; `computeEmphasisMap` callable.

---

## Phase 3: US1 — Sliders Visibly Change the Output (Priority: P1) 🎯 MVP

**Goal**: Dragging any filter weight slider immediately and visibly changes the dots in a way matching that filter; default (0.5) leaves the view unchanged; effects are reversible.

**Independent Test**: Drag Recency low→high → recent dots grow; Relevance → relevant dots grow; Sentiment → pos/neg dots grow + field strengthens; a topic slider → that topic's dots grow; set back to 50% → view returns to baseline.

### Tests for US1

- [ ] T002 [P] [US1] Create `tests/utils/emphasis.test.ts`: all weights 0.5 → every dot `{scale:1, opacity:1}`; with `recency` weight = 1.0, the newest article's `scale` > the oldest article's `scale`; with `relevance` weight = 1.0, a high-`relevanceMap` article's `scale` > a low one's; a weight set to 0 yields `scale < 1` AND `opacity < 1` for affected dots; all outputs satisfy `0.55 ≤ scale ≤ 1.45` and `0.45 ≤ opacity ≤ 1`; empty input → empty map

### Implementation for US1

- [ ] T003 [US1] Apply emphasis in `src/components/output/ArticleScatter.tsx`: import `computeEmphasisMap`; add store reads for the full `filterWeights`, `keywords`, and `activeKeywords`; `const emphasis = useMemo(() => computeEmphasisMap(points, activeKeywords, filterWeights, keywords), [points, activeKeywords, filterWeights, keywords])`; in the dot `motion.div` `animate`, multiply: `scale: (isHovered ? 1.6 : 1) * (emphasis.get(point.id)?.scale ?? 1)` and `opacity: (isLoading ? 0.35 : 1) * (emphasis.get(point.id)?.opacity ?? 1)`; leave position/color/hover/click and the timeline branch unchanged (emphasis applies in both cluster and timeline views since it keys on `point.id`)

**Checkpoint**: Each slider drag visibly resizes/dims the matching dots within ~1s; centered sliders = today's view; effects reverse.

---

## Phase 4: US2 — Uncramped, Legible Panel (Priority: P1)

**Goal**: Hybrid panel — compact neural flow on top, a dedicated Filters slider strip below — with no overlap and comfortably draggable sliders.

**Independent Test**: Open the panel: keyword chips + filter chips + edges sit in the top region without overlapping; the bottom strip lists big sliders (Sentiment/Recency/Relevance + topic categories), each with a clear track, value, and neutral baseline; dragging one is comfortable and never hits an adjacent control.

### Implementation for US2

- [ ] T004 [US2] Restructure `src/components/neural/NeuralPanel.tsx` into two stacked regions: wrap content so the top region (`flex-[0.58]`, relative) holds the existing SVG flow and the bottom region (`flex-[0.42]`, relative, `overflow-y-auto`) holds the Filters strip; pass the top region's measured height into the existing `layout()` so nodes/edges fit the smaller area; keep edges at `z-0` behind nodes
- [ ] T005 [US2] Convert `FilterCard` (top flow) in `src/components/neural/NeuralPanel.tsx` to a **label-only chip**: remove the embedded `<input type="range">`, the MIN/MAX row, and the percentage; render just the bordered label chip (keep the layer-1 purple / layer-2 green accent and the React Flow handles/positioning)
- [ ] T006 [US2] Add a `FilterSliderRow` component + the Filters strip in `src/components/neural/NeuralPanel.tsx`: read `dynamicFilterNodes` and `filterWeights` + `setFilterWeight` from the store; render rows in this order — `sentiment`, `recency`, `relevance` (Layer-2, with fixed labels Sentiment/Recency/Relevance), then each `dynamicFilterNodes` with `layer === 1` (topic categories, label = node.label); each row: a label + `{Math.round(weight*100)}%` value + a full-width `<input type="range" min="0" max="1" step="0.01">` with a comfortable hit height (wrapper `py-1.5`, track styled), a neutral 50% baseline tick, and a color cue (`weight>0.55` → neon-blue accent, `0.45–0.55` → muted white/30, `<0.45` → dim/red-ish); `onChange={(e)=>setFilterWeight(id, parseFloat(e.target.value))}`, `onPointerDown={(e)=>e.stopPropagation()}`; a small "FILTERS" section header above the rows

**Checkpoint**: No interactive elements overlap; every slider has a clear, comfortably draggable track with value + neutral baseline; the panel stays information-rich.

---

## Phase 5: US3 — Understand the Feedback Loop (Priority: P2)

**Goal**: It's obvious which slider controls what and that moving it caused the output change.

**Independent Test**: Focus/drag a slider row → the matching filter chip in the top flow pulses/glows; the slider's label clearly names what it controls; boosted/neutral/reduced states are visually distinct.

### Implementation for US3

- [ ] T007 [US3] Add cause→effect highlighting to `src/components/neural/NeuralPanel.tsx`: track local `activeFilterId` state set on a `FilterSliderRow`'s `onFocus`/`onPointerDown` and cleared on `onBlur`/`onPointerUp`; when `activeFilterId` matches a top-flow filter chip's id, add a pulse/glow class to that chip (CSS animation, e.g. ring + brightness); ensure the boosted/neutral/reduced color cue from T006 makes each slider's state legible at rest

**Checkpoint**: Dragging a slider visibly lights up its matching flow chip; slider states are self-explanatory.

---

## Phase 6: Polish & Verification

- [ ] T008 [P] Adjust mobile panel height in `src/app/page.tsx`: change the neural panel's mobile sizing from `h-[300px]` to `h-auto min-h-[380px]` (keep the `lg:` desktop classes) so the flow + Filters strip both fit on phones
- [ ] T009 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (43 existing + new emphasis tests pass); fix any type errors
- [ ] T010 Manual verification: (a) drag each slider → matching dots grow/shrink + sentiment also strengthens the field, within ~1s; (b) all sliders at 50% → view identical to before; (c) return a slider to its prior value → output restores; (d) no overlap; sliders comfortably draggable (incl. touch); (e) feedback chip pulses on drag; (f) cluster/topic/timeline views all honor emphasis; (g) mobile panel fits both regions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (T001)**: emphasis engine. BLOCKS US1.
- **US1 (Phase 3)**: T002 after T001; T003 after T001.
- **US2 (Phase 4)**: T004 → T005 → T006 (all same file `NeuralPanel.tsx`, sequential). Independent of US1's files.
- **US3 (Phase 5)**: T007 after T006 (needs the slider rows + flow chips).
- **Polish (Phase 6)**: T008 (page.tsx) ∥ T009; T010 last.

### User Story Dependencies

- **US1 (P1)**: needs T001. → "sliders work"
- **US2 (P1)**: independent of US1 (different files: NeuralPanel vs ArticleScatter). → "panel uncramped"
- **US3 (P2)**: needs US2's rows + chips.

### Critical Path

```
T001 → (T002 ∥ T003)        [US1]
T004 → T005 → T006 → T007    [US2 → US3]
→ (T008 ∥ T009) → T010
US1 and US2 chains run in parallel (different files).
```

---

## Parallel Execution Examples

```
T001 (emphasis util) lands →
  Track A (US1): T002 (test) ∥ T003 (ArticleScatter apply)
  Track B (US2): T004 → T005 → T006 (NeuralPanel) → T007 (US3)
→ T008 ∥ T009 → T010
```

---

## Implementation Strategy

### MVP (US1 + US2)

1. T001 (emphasis engine)
2. US1: T002 + T003 → sliders now visibly drive the dots
3. US2: T004 → T005 → T006 → uncramped hybrid panel with usable sliders
4. **STOP and VALIDATE**: sliders work AND are operable — the core complaint resolved
5. Ship

### Then US3 + Polish

6. T007 (feedback pulse) → T008 (mobile height) + T009 (tsc/test) → T010 (manual)

---

## Notes

- T001 (`emphasis.ts`) is the substantive, unit-tested core — it makes the sliders "work"
- Centered model means default (0.5) preserves today's exact view — no regression
- T004–T007 all touch `NeuralPanel.tsx` → keep them sequential to avoid conflicts
- Emphasis keys on `point.id`, so it applies in BOTH cluster and timeline views automatically
- Sentiment keeps its existing field effect via `fieldIntensity` — so the Sentiment slider has a double visible effect (dots + field)
- Store/types unchanged — `filterWeights` already holds every weight at default 0.5
