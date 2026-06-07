---
description: "Tasks for Neural News UI/UX Complete Redesign"
---

# Tasks: Neural News UI/UX Complete Redesign

**Input**: Design documents from `specs/005-neural-ui-redesign/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ui-components.md ✅

**Tests**: Not explicitly requested — existing `tests/utils/clustering.test.ts` must remain passing.

**Organization**: Tasks grouped by user story. US1 and US4 are implemented together (the layout IS the clarity improvement).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3/US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Layout constants and CSS animations — used by every new component.

- [x] T001 Create `src/utils/layout.ts` exporting: `NEURAL_PANEL_WIDTH = 360`, `ARTICLE_STRIP_HEIGHT = 180`, `ARTICLE_DETAIL_WIDTH = 400`, `HEADER_HEIGHT = 72`, `DOT_SIZE = 24`, `CARD_WIDTH = 200`
- [x] T002 Add to `src/app/globals.css`: `@keyframes neuralFlow { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }` and `.animate-neural-flow { animation: neuralFlow 1.8s linear infinite; }` and scrollbar-hide utility `[&::-webkit-scrollbar]{display:none}` via `.scrollbar-hide` class

**Checkpoint**: Both files updated; `npm test` still passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove `currentGradient` from the store and types before rebuilding `page.tsx`. These are prerequisites for the layout rewrite.

⚠️ **CRITICAL**: Complete before any component work.

- [x] T003 [P] Remove `currentGradient: string` from `AppState` interface in `src/types/index.ts`; also remove `currentGradient` from the AppState actions section if present
- [x] T004 [P] Remove `currentGradient` from initial state in `src/store/useStore.ts`; remove the `currentGradient` set call from within the store; also remove `calculateGradient` import from `src/utils/clustering.ts` if it is now unused

**Checkpoint**: `npx tsc --noEmit` passes with no errors about `currentGradient`.

---

## Phase 3: US1 + US4 — Filter State Clarity & Complete Layout (Priority: P1) 🎯 MVP

**Goal**: All three zones (keyword input, neural processing, article output) visible simultaneously. Active keywords are visually unmistakable. Article count is prominent. The spatial layout communicates left→right data flow.

**Independent Test**: Open the app cold. Without reading any labels, a first-time user must identify: (1) which keywords are active, (2) how many articles are showing, (3) what to click to toggle a keyword — all in under 10 seconds. Also confirm all three zones are visible without scrolling on a 1280px+ screen.

### Implementation for US1 + US4

- [x] T005 [US1] Create `src/components/neural/` directory and `src/components/neural/NeuralPanel.tsx`: reads `activeKeywords`, `dynamicFilterNodes`, `filterWeights`, `toggleKeyword`, `setFilterWeight` from Zustand store; measures own dimensions via `ResizeObserver + getBoundingClientRect()`; renders SVG layer (`<svg className="absolute inset-0 pointer-events-none">`) with cubic bezier paths between layers (`M sx sy C sx+120 sy tx-120 ty tx ty`); active edge: `stroke="#00f3ff" strokeWidth={1+weight*2.5} strokeOpacity={0.3+weight*0.7} strokeDasharray="6 10" className="animate-neural-flow"`; inactive edge: `stroke="white" strokeWidth={0.5} strokeOpacity={0.05}`; keyword pill nodes positioned at `x = panelWidth * 0.12`, `y = 40 + i * nodeSpacing` — active style: `bg-neon-blue/15 border-2 border-neon-blue text-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.35)] animate-pulse` — inactive: `bg-black border border-white/15 text-white/30 hover:border-white/30` — with `onPointerDown={e => e.stopPropagation()} onClick={() => toggleKeyword(id)}`; filter card nodes at `x = panelWidth * 0.50` (layer1) and `x = panelWidth * 0.84` (layer2): `bg-black/60 border border-neon-purple/40 rounded-lg p-2.5 min-w-[130px]` containing neon-purple mono label + `<input type="range">` slider; add faint layer labels `text-[8px] font-mono text-white/[0.08] uppercase tracking-widest` at top of each column
- [x] T006 [P] [US1] Create `src/components/output/` directory and `src/components/output/ArticleScatter.tsx`: container `<div style={{position:'absolute',top:0,left:0,right:0,bottom:0,overflow:'hidden'}}>`; `ResizeObserver` for dimensions; calls `useClustering(w, h)`; dots: `<motion.div key={point.id} initial={{opacity:0,scale:0}} animate={{opacity:isLoading?0.35:1, x:point.x-12, y:point.y-12, scale:1}} exit={{opacity:0,scale:0}} transition={{type:'spring',stiffness:60,damping:12,delay:i*0.004}}` with classes `absolute top-0 left-0 w-6 h-6 rounded-full cursor-pointer border border-white/20` + sentiment color (`bg-neon-blue shadow-[0_0_12px_rgba(0,243,255,0.7)]` / `bg-neon-red` / `bg-white/80`); `onMouseEnter={() => setHovered(point)} onMouseLeave={() => setHovered(null)} onClick={() => setSelectedArticle(point.id)}`; `HoverCard`: `bg-black/95 border border-white/15 backdrop-blur-md rounded-xl p-3 w-[230px]` showing title (3-line clamp), domain, date, sentiment badge, positioned right of dot (flips left near edge), `pointer-events-none`, Framer Motion 120ms fade; article count badge: `<div className="absolute top-4 right-4 z-20 text-sm font-mono text-white/40">{points.length} <span className="text-white/20">articles</span></div>`; loading spinner only when `isLoading && points.length === 0`; empty state when `!isLoading && !error && points.length === 0 && dimensions.width > 0`
- [x] T007 [P] [US1] Create `src/components/output/ArticleStrip.tsx`: `<div className="h-full flex flex-col bg-black/40 border-t border-white/[0.05]">`; header: `<div className="px-4 py-1.5 text-[9px] font-mono text-white/25 uppercase tracking-widest shrink-0 border-b border-white/[0.04]">LIVE FEED · {articles.length} ARTICLES</div>`; scroll area: `<div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide px-3 py-2" onWheel={e => { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}>` containing article cards `w-[200px] shrink-0 h-full rounded-lg cursor-pointer bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-white/[0.15] border-l-2 {sentimentColor} p-3 transition-all duration-200 flex flex-col gap-1.5` (ring-1 ring-neon-blue/50 when selected); card shows: title 2-line clamp, domain + date footer; articles sorted by `seendate` descending; loading shows 5 skeleton placeholder divs `w-[200px] shrink-0 h-full rounded-lg bg-white/[0.015] animate-pulse`; reads `articles`, `selectedArticleId`, `setSelectedArticle`, `isLoading` from store
- [x] T008 [US1] Rewrite `src/app/page.tsx` — remove all old imports (`NetworkGraph`, `CurationMap`, `ArticleList`, `ArticleModal`, `useClustering`); remove `useGdeltFetch` line and add it back with only `useGdeltFetch()` + `const { isLoading, error } = useStore()`; import `NeuralPanel`, `ArticleScatter`, `ArticleStrip`, `ArticleDetailPanel`; layout: `<main className="flex h-screen flex-col bg-[#050508] text-white overflow-hidden">` → fixed radial glow `<div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_25%_25%,rgba(0,243,255,0.04),transparent_60%)]" />` → header `<header className="z-20 h-[72px] px-6 flex items-center justify-between border-b border-white/[0.06] bg-black/60 backdrop-blur-md shrink-0">` (left: 8px neon dot + "NEURAL **NEWS**" with blue accent; right: status "SYNCED/FETCHING/ERROR" + "MVP v1.0.0") → content `<div className="flex-1 flex flex-row min-h-0 overflow-hidden">` → `<NeuralPanel className="w-[360px] shrink-0 border-r border-white/[0.05]" />` → right `<div className="flex-1 flex flex-col min-h-0 min-w-0">` → `<div className="flex-1 relative min-h-0"><ArticleScatter /></div>` + `<ArticleStrip className="h-[180px] shrink-0" />` → `<ArticleDetailPanel />`

**Checkpoint**: App loads. NeuralPanel shows keyword nodes + animated SVG edges. ArticleScatter shows dots with count. ArticleStrip shows horizontal cards. All three zones visible without scrolling. Toggling a keyword changes edge animation instantly.

---

## Phase 4: US2 — Instant Filter-to-Article Feedback (Priority: P1)

**Goal**: Toggle keyword → edges dim/animate AND dots reposition within 3s. Screen never goes blank during re-fetch.

**Independent Test**: (1) Toggle a keyword off → edges from that keyword must dim within 500ms. (2) Wait for new fetch → dots must stay visible (dim) during loading, then smoothly reposition. (3) Click a dot → detail panel slides in from right without covering the NeuralPanel.

### Implementation for US2

- [x] T009 [US2] Create `src/components/shared/ArticleDetailPanel.tsx`: reads `selectedArticleId`, `articles`, `setSelectedArticle` from store; uses `<AnimatePresence>`; backdrop: `<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40" style={{background:'rgba(0,0,0,0.2)'}} onClick={() => setSelectedArticle(null)} />`; panel: `<motion.div initial={{x: 400}} animate={{x:0}} exit={{x:400}} transition={{type:'spring',stiffness:300,damping:30}} className="fixed right-0 z-50 flex flex-col bg-black/95 border-l border-white/10 backdrop-blur-xl overflow-y-auto" style={{top: 72, bottom: 0, width: 400}}>` — close button top-right — type badge + sentiment badge — `<h2 className="text-2xl font-bold text-white">{article.title}</h2>` — summary — relevance keyword chips `text-[9px] font-mono text-white/30 bg-white/[0.04] px-2 py-1 rounded` — domain + date footer — `<a href={article.url} target="_blank" className="mt-4 w-full py-3 bg-neon-blue text-black font-bold rounded-lg text-center text-xs uppercase tracking-widest block">Read Full Source Article</a>`; the 400px width leaves 360px NeuralPanel fully visible
- [x] T010 [US2] Add loading state indicator to `src/components/neural/NeuralPanel.tsx`: when `isLoading=true`, render a thin `<div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-blue/60 to-transparent animate-pulse" />` at the bottom of the panel to signal "data is flowing"; also add `isLoading` border-pulse to the panel's outer container via `className={isLoading ? 'border-r border-neon-blue/20' : 'border-r border-white/[0.05]'}`; reads `isLoading` from store

**Checkpoint**: Toggle keyword off. Edges from that keyword dim instantly (no fetch needed). New articles arrive → dots stay visible at 35% opacity while loading, then reposition. Clicking a dot → detail panel slides in from right at 400px width, NeuralPanel remains fully visible.

---

## Phase 5: US3 — Glamorous Visual Design (Priority: P2)

**Goal**: App looks polished, professional, and visually striking. Glassmorphism consistent throughout. Dark neon aesthetic applied to every element.

**Independent Test**: Open the app. Every visible element must have intentional dark styling (no unstyled defaults). Show to an unfamiliar user → they describe it as "polished" or "impressive."

### Implementation for US3

- [x] T011 [US3] Visual polish pass across all new components: in `src/components/output/ArticleScatter.tsx` — add top-left section label `<div className="absolute top-4 left-4 z-20 text-[9px] font-mono text-white/20 uppercase tracking-widest pointer-events-none">Output Layer</div>`; in `src/components/neural/NeuralPanel.tsx` — add panel title `<div className="absolute top-3 left-4 text-[9px] font-mono text-white/20 uppercase tracking-widest z-20">Neural Filter</div>`; in `src/app/globals.css` — ensure `scrollbar-hide` is applied globally; in `src/components/output/ArticleScatter.tsx` — verify `HoverCard` `backdrop-blur-md` is rendering correctly with `bg-black/95`; in `src/components/output/ArticleStrip.tsx` — add left/right fade gradient `<div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />` and corresponding right gradient; verify all panel borders use consistent `border-white/[0.05]` opacity

---

## Phase 6: Cleanup & Verification

**Purpose**: Remove old code, remove unused dependency, verify clean build.

- [x] T012 [P] Delete 7 old component files: `src/components/graph/NetworkGraph.tsx`, `src/components/graph/KeywordNode.tsx`, `src/components/graph/FilterNode.tsx`, `src/components/graph/WeightEdge.tsx`, `src/components/map/CurationMap.tsx`, `src/components/shared/ArticleList.tsx`, `src/components/shared/ArticleModal.tsx` — verify no imports of these files remain in any `src/` file before deleting
- [x] T013 [P] Run `npm uninstall reactflow` to remove from `package.json` and `node_modules`; verify no `from 'reactflow'` imports remain anywhere in `src/`; also run `npm install` to ensure lockfile is clean
- [x] T014 Run `npx tsc --noEmit` and `npm test` — zero TypeScript errors, 5/5 clustering tests pass; if any type errors, fix them before marking complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependency on Phase 1 (different files) — can start immediately
- **US1 + US4 (Phase 3)**: Depends on Phase 1 (T001 constants, T002 CSS) and Phase 2 (T003/T004 store cleanup) — BLOCKS all component work
- **US2 (Phase 4)**: Depends on Phase 3 completion (needs NeuralPanel + ArticleScatter + page layout)
- **US3 (Phase 5)**: Depends on Phase 4 completion (polishes work done in phases 3-4)
- **Cleanup (Phase 6)**: Depends on Phase 5 completion (can only delete old files once new ones are working)

### User Story Dependencies

- **US1 + US4 (P1)**: After Setup + Foundational — no dependency on US2/US3
- **US2 (P1)**: After US1 + US4 — detail panel (T009) needs the layout from T008; loading indicator (T010) needs NeuralPanel from T005
- **US3 (P2)**: After US2 — pure polish, no new functionality
- **US4**: Implemented within US1 (page.tsx rewrite is the layout reorganization)

### Within Each Phase

- Phase 3: T005 → T006 + T007 (parallel) → T008 (depends on all three)
- Phase 4: T009 and T010 are independent of each other [P possible]
- Phase 6: T012 + T013 are parallel; T014 runs after both

---

## Parallel Execution Examples

### Phase 3 (US1 — run T006 + T007 simultaneously)

```
Task A: "Create ArticleScatter.tsx in src/components/output/"
Task B: "Create ArticleStrip.tsx in src/components/output/"
→ Then (depends on A+B+T005): "Rewrite src/app/page.tsx"
```

### Phase 4 (US2 — run T009 + T010 simultaneously)

```
Task A: "Create ArticleDetailPanel.tsx in src/components/shared/"
Task B: "Add loading indicator to NeuralPanel.tsx"
```

### Phase 1 + 2 simultaneously

```
Task A: "Create src/utils/layout.ts"
Task B: "Update src/app/globals.css"
Task C: "Update src/types/index.ts (remove currentGradient)"
Task D: "Update src/store/useStore.ts (remove currentGradient)"
```

---

## Implementation Strategy

### MVP First (US1 + US4 Only)

1. Complete Phase 1 + 2 (setup)
2. Complete Phase 3: T005 → T006 + T007 → T008
3. **STOP and VALIDATE**: Open app, verify 3-zone layout, toggle keywords, see animated edges and article count
4. **Ship if ready** — the layout and neural network clarity are the core value

### Incremental Delivery

1. Phases 1+2 → Phases 3 → Validate US1+US4 → Ship MVP
2. Phase 4 → Validate US2 → Ship with filter feedback
3. Phase 5 → Validate US3 → Ship polished version
4. Phase 6 → Clean codebase → Final ship

---

## Notes

- T005 (NeuralPanel) is the largest and most complex single task — budget significant time for the SVG positioning math
- T008 (page.tsx rewrite) MUST verify that `useClustering(0,0)` is removed (it no longer serves a purpose with `currentGradient` removed)
- After T012 (deleting old files), do NOT run TypeScript check until T013 (reactflow uninstall) is also complete — `reactflow` imports in deleted files would cause phantom errors
- The `src/components/graph/` directory should be deleted entirely, not file-by-file, using `rm -rf`
- `[P]` tasks in Phase 1+2 can all run simultaneously — they touch completely different files
