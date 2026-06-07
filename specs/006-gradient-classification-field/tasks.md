---
description: "Tasks for Gradient Classification Field (Decision Boundary Heatmap)"
---

# Tasks: Gradient Classification Field

**Input**: Design documents from `specs/006-gradient-classification-field/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Unit tests included for the pure `sentimentField` helpers (constitution Principle V). Existing `tests/utils/clustering.test.ts` must remain passing.

**Organization**: Tasks grouped by user story. US1 (field display) is the MVP; US2 (filter responsiveness) and US3 (toggle) build on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3 from spec.md

---

## Phase 1: Setup

**No setup needed.** Canvas is a browser primitive; no new dependencies. Vitest + path alias already configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Store state + pure helpers that the field component depends on.

⚠️ **CRITICAL**: Complete before any user-story work.

- [x] T001 [P] Add `showClassificationField: boolean` and `toggleClassificationField: () => void` to the `AppState` interface in `src/types/index.ts`
- [x] T002 [P] Create `src/utils/sentimentField.ts` exporting three pure functions: `clamp01(n)`, `sentimentFieldColor(sentiment, alpha)` returning `rgba(0,243,255,a)` for positive / `rgba(255,49,49,a)` for negative / `rgba(120,120,140,a)` for neutral, and `fieldIntensity(sentimentWeight)` returning `0.4 + clamp01(sentimentWeight) * 0.6`
- [x] T003 Add `showClassificationField: true` to the initial state in `src/store/useStore.ts` and add the `toggleClassificationField: () => set((s) => ({ showClassificationField: !s.showClassificationField }))` action (depends on T001 for the type)

**Checkpoint**: `npx tsc --noEmit` passes; store exposes the new field + action.

---

## Phase 3: US1 — See the Classification Field Behind Articles (Priority: P1) 🎯 MVP

**Goal**: A smooth sentiment-colored gradient heatmap renders behind the article dots — blue where positive articles cluster, red where negative, neutral/dark elsewhere — with dots clearly visible on top.

**Independent Test**: Load the app with articles present. Confirm a smooth multi-color gradient fills the output panel behind the dots; positive-dense regions tint blue, negative-dense regions tint red, blending smoothly; dots remain visible and clickable.

### Tests for US1

- [x] T004 [P] [US1] Create `tests/utils/sentimentField.test.ts` covering: (1) `sentimentFieldColor('positive', 0.5)` starts with `rgba(0,243,255,` and includes the alpha; (2) `'negative'` → `rgba(255,49,49,`; (3) `'neutral'` → `rgba(120,120,140,`; (4) `fieldIntensity(0)` === `0.4`; (5) `fieldIntensity(1)` === `1.0`; (6) `fieldIntensity(2)` clamps to `1.0` and `fieldIntensity(-1)` clamps to `0.4`

### Implementation for US1

- [x] T005 [US1] Create `src/components/output/ClassificationField.tsx`: a client component taking props `{ points: MappedPoint[]; width: number; height: number; intensity: number; visible: boolean; dimmed: boolean }`; in a `useEffect` keyed on `[points, width, height, intensity]`, get the canvas 2D context, set backing-store size to `width*dpr × height*dpr` with `ctx.scale(dpr,dpr)`, `clearRect`, early-return if `points.length === 0`, then with `globalCompositeOperation = 'lighter'` draw one `createRadialGradient(p.x,p.y,0, p.x,p.y, R)` per point where `R = Math.min(width,height)*0.35`, color stops `sentimentFieldColor(p.sentiment, 0.45*intensity)` → `sentimentFieldColor(p.sentiment, 0)`, fill, then reset composite to `'source-over'`; render `<canvas className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300" style={{ width, height, filter: 'blur(24px)', opacity: visible ? (dimmed ? 0.5 : 1) : 0 }} />`
- [x] T006 [US1] Integrate the field into `src/components/output/ArticleScatter.tsx`: import `ClassificationField` and `fieldIntensity`; read `showClassificationField` and `filterWeights` from the store; compute `intensity = fieldIntensity(filterWeights['sentiment'] ?? 0.5)`; render `<ClassificationField points={points} width={dimensions.width} height={dimensions.height} intensity={intensity} visible={showClassificationField} dimmed={isLoading} />` as the FIRST child inside the container `<div>` (before the dots `z-10` layer) so it sits at `z-0` behind the dots

**Checkpoint**: Gradient heatmap appears behind dots, colored by sentiment, smooth blending; dots fully visible and clickable on top.

---

## Phase 4: US2 — Field Updates with Filter Changes (Priority: P2)

**Goal**: Toggling a keyword or moving the Sentiment slider visibly re-colors the field within 1 second.

**Independent Test**: Note the gradient pattern. Toggle a keyword off → field re-colors after new articles load. Move the Sentiment weight slider → field intensity changes within 1 second.

### Implementation for US2

- [x] T007 [US2] Verify reactive redraw in `src/components/output/ClassificationField.tsx`: confirm the `useEffect` dependency array includes `points` and `intensity` so the canvas redraws when articles change (keyword toggle → new `points`) and when the Sentiment weight changes (new `intensity`); confirm the canvas keeps the prior field visible at `opacity 0.5` while `dimmed` (isLoading) is true so the panel never goes blank during re-fetch (no code change expected if T005/T006 are correct — this is a verification + adjustment task)

**Checkpoint**: Keyword toggle re-colors the field after fetch; Sentiment slider changes field saturation live; field dims (not blanks) during loading.

---

## Phase 5: US3 — Toggle the Field On/Off (Priority: P3)

**Goal**: A button in the output panel hides/shows the gradient field; default ON; state persists for the session.

**Independent Test**: Click the field toggle → gradient fades out, dots remain on dark background. Click again → gradient fades back in. State stays through other interactions.

### Implementation for US3

- [x] T008 [US3] Add the toggle button to `src/components/output/ArticleScatter.tsx`: read `toggleClassificationField` from the store; render a `<button onClick={toggleClassificationField}>` positioned `absolute top-4 right-32 z-20` (left of the article count, not overlapping it) with classes `text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors` and conditional styling `showClassificationField ? 'border-neon-blue/50 text-neon-blue' : 'border-white/15 text-white/30 hover:text-white/50'`, label `Field {showClassificationField ? 'ON' : 'OFF'}`; confirm the 300ms opacity transition on the canvas (from T005) produces a smooth fade

**Checkpoint**: Toggle hides/shows field with a smooth fade; default ON; survives keyword/filter interactions within the session.

---

## Phase 6: Polish & Verification

- [x] T009 [P] Run `npx tsc --noEmit` (zero errors) and `npm test` (existing 5 clustering tests + new sentimentField tests all pass); fix any type errors
- [x] T010 [P] Manual verification against spec acceptance scenarios: (a) positive region tints blue, negative tints red, mixed/empty stays dark; (b) dots clickable on top of field; (c) zero-articles shows no misleading color; (d) resize re-fits the field without artifacts; (e) toggle ON/OFF works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: T001 + T002 in parallel; T003 after T001. BLOCKS all stories.
- **US1 (Phase 3)**: T004 after T002 (tests the helpers); T005 after T002 (uses `sentimentFieldColor`); T006 after T005 + T003 (uses component + store). T004 can run parallel with T005.
- **US2 (Phase 4)**: After US1 (verifies behavior built in T005/T006).
- **US3 (Phase 5)**: After US1 (needs the field + store toggle from T003).
- **Polish (Phase 6)**: After all stories.

### User Story Dependencies

- **US1 (P1)**: Needs Foundational. No dependency on US2/US3. → MVP
- **US2 (P2)**: Needs US1 (the field must exist to react to changes).
- **US3 (P3)**: Needs Foundational (store toggle) + US1 (the field to toggle).

### Within Foundational

- T001 + T002 parallel → T003 (needs T001's type)

---

## Parallel Execution Examples

### Phase 2 (run T001 + T002 simultaneously)

```
Task A: "Add showClassificationField + toggle to AppState in src/types/index.ts"
Task B: "Create src/utils/sentimentField.ts pure helpers"
→ Then: "Add field + action to src/store/useStore.ts" (T003)
```

### Phase 3 (run T004 + T005 simultaneously)

```
Task A: "Write sentimentField unit tests in tests/utils/sentimentField.test.ts"
Task B: "Create ClassificationField.tsx canvas component"
→ Then: "Integrate field into ArticleScatter.tsx" (T006)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 2: T001 + T002 → T003
2. Phase 3: T004 + T005 → T006
3. **STOP and VALIDATE**: gradient field renders behind dots, colored by sentiment
4. Ship — the decision-boundary heatmap is the core deliverable

### Incremental Delivery

1. Foundational → US1 → Validate field renders → **MVP**
2. US2 → Validate filter responsiveness → ship
3. US3 → Validate toggle → ship
4. Polish → type-check + manual scenarios → done

### Solo Developer (fastest path)

```
T001 + T002 (parallel) → T003 → T004 + T005 (parallel) → T006 → T007 → T008 → T009 + T010 (parallel)
```

---

## Notes

- No new dependencies — Canvas 2D is a browser primitive
- T002 and T005 are the substantive work; T001/T003 are small store edits; T007 is mostly verification
- The `sentimentField.ts` helpers are the only unit-tested logic (pure functions); the canvas rendering is presentational
- Keep the field's `pointer-events: none` so dots stay clickable (SC-005) — do not remove it
- `devicePixelRatio` scaling in T005 keeps the field crisp on retina displays
