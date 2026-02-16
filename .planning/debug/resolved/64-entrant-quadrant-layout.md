---
status: documented
trigger: "64-Entrant Bracket Quadrant Layout Not Implemented"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — SVG layout is purely horizontal without quadrant support
test: Complete architecture analysis, implementation roadmap, and critical questions
expecting: User decision on implementation approach
next_action: Present findings and await user decision

## Symptoms

expected: 64-entrant brackets should render in a 2x2 quadrant grid:
- Top-left: first 16 entrants (left to right)
- Top-right: second 16 entrants (right to left, mirrored)
- Bottom-left: third 16 entrants (left to right)
- Bottom-right: fourth 16 entrants (right to left, mirrored)

actual: 64-entrant brackets render as a single horizontal left-to-right layout. Section navigation buttons (TL/TR/BL/BR) appear but scroll to sections of the horizontal layout, not quadrants.

errors: None reported - rendering works but layout is wrong

reproduction:
1. Create a 64-entrant bracket
2. Observe the bracket diagram
3. Section nav buttons appear (TL/TR/BL/BR)
4. Clicking buttons scrolls horizontally, not to quadrants
5. Bracket is one long horizontal SVG instead of 2x2 grid

started: Since 07-27 implementation - buttons added but layout not changed

## Eliminated

## Evidence

- timestamp: 2026-02-02 Investigation Start
  checked: bracket-diagram.tsx layout computation (lines 64-89)
  found: getMatchPosition() computes purely horizontal left-to-right layout. X position = PADDING + (round - 1) * (MATCH_WIDTH + ROUND_GAP). Y position computed recursively by centering between feeder matchups from previous round. No quadrant logic exists.
  implication: SVG layout is fundamentally horizontal — 64-entrant brackets render as one wide horizontal diagram

- timestamp: 2026-02-02 Investigation Start
  checked: bracket-diagram.tsx SVG dimensions (lines 482-494)
  found: svgWidth = PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP. Width grows with rounds (6 rounds for 64 entrants), creating very wide SVG. Height computed from round 1 matchup count only.
  implication: Dimensions assume single horizontal layout, no 2x2 grid structure

- timestamp: 2026-02-02 Investigation Start
  checked: bracket-zoom-wrapper.tsx section navigation (lines 72-97)
  found: Sections defined as scroll positions. For 64+: TL={top:0, left:0}, TR={top:0, left:'max'}, BL={top:'max', left:0}, BR={top:'max', left:'max'}. scrollToSection() scrolls container to these positions. Uses el.scrollHeight and el.scrollWidth as 'max'.
  implication: Section buttons scroll to corners of the existing horizontal layout — they treat the horizontal SVG as if it were already a 2x2 grid

- timestamp: 2026-02-02 Investigation Start
  checked: Planning docs (07-27-PLAN, 07-UAT)
  found: Plan 07-27 added section nav buttons and scrollToSection logic. UAT confirms buttons appear but bracket layout is still horizontal. Expected behavior: "first 16 top-left, second 16 top-right (mirrored), third 16 bottom-left, fourth 16 bottom-right (mirrored)."
  implication: 07-27 only implemented UI controls, not the underlying bracket layout change

- timestamp: 2026-02-02 Investigation Start
  checked: bracket/engine.ts matchup generation
  found: generateMatchups() creates linear bracket structure — doesn't know about quadrants. Returns flat array of MatchupSeed with round/position. No awareness of visual layout.
  implication: Engine is layout-agnostic (correct), but diagram component must interpret this into quadrant layout for 64+

- timestamp: 2026-02-02 Analysis
  checked: 64-entrant bracket structure
  found: 64 entrants = 6 rounds total. Round 1 has 32 matchups (64 entrants), Round 2 has 16 matchups, Round 3 has 8, Round 4 has 4, Round 5 has 2, Round 6 (Final) has 1. For quadrant layout, the first 4 rounds should be split into quadrants (16 entrants each = 8 matchups in R1, 4 in R2, 2 in R3, 1 in R4 per quadrant). Rounds 5-6 connect the quadrants.
  implication: Quadrants are essentially 16-entrant sub-brackets (4 rounds each). The 4 quadrant winners feed into rounds 5-6 (semifinals and finals).

- timestamp: 2026-02-02 Analysis
  checked: Double-elim-diagram.tsx for multi-section layout patterns
  found: Uses tabs to separate Winners/Losers/GrandFinals brackets. Each tab shows a separate BracketDiagram component. Calls normalizeRounds() to re-number rounds starting from 1 for each region.
  implication: Multi-section brackets are handled via separate diagram instances, not spatial layout within a single SVG. This pattern could work for quadrants (4 separate BracketDiagram components in CSS grid).

- timestamp: 2026-02-02 Integration Point Analysis
  checked: bracket-detail.tsx (lines 217-222)
  found: Single-elimination brackets render via: `<BracketDiagram matchups={bracket.matchups} totalRounds={totalRounds} />`. No bracketSize prop passed. No conditional logic for 64+ entrants.
  implication: Integration point is simple — need to add conditional: if bracketSize >= 64, render QuadrantBracketLayout instead of BracketDiagram. BracketSize can be computed from bracket.size or bracket.entrants.length.

- timestamp: 2026-02-02 Integration Point Analysis
  checked: BracketDiagram component signature (bracket-diagram.tsx line 20)
  found: Props include optional `bracketSize?: number` — currently used for zoom wrapper threshold (32+). Not passed from bracket-detail.tsx.
  implication: bracket-detail.tsx should pass bracketSize prop. This is already supported but unused in teacher view.

## Resolution

root_cause: The bracket-diagram.tsx component renders all brackets using a single horizontal left-to-right layout via getMatchPosition(). For 64-entrant brackets, this creates a very wide SVG (6 rounds horizontally). The section navigation buttons added in 07-27 scroll to corners of this horizontal layout, but the actual SVG structure was never changed to a 2x2 quadrant grid. The expected quadrant layout requires:

1. **Architectural change needed**: Instead of one continuous horizontal SVG, 64-entrant brackets need either:
   - Option A: Four separate SVG diagrams arranged in a 2x2 CSS grid (each quadrant is 16 entrants = 4 rounds)
   - Option B: Modified getMatchPosition() that maps rounds 1-4 to quadrants with mirrored positioning for right quadrants

2. **Current behavior**:
   - All 64 matchups positioned in single horizontal line
   - SVG width = 6 rounds * (MATCH_WIDTH + ROUND_GAP)
   - Section buttons scroll to: top-left corner (TL), top-right edge (TR), bottom-left edge (BL), bottom-right corner (BR) of the horizontal layout

3. **Expected behavior**:
   - Quadrant TL: Entrants 1-16 (rounds 1-4) positioned left-to-right
   - Quadrant TR: Entrants 17-32 (rounds 1-4) positioned RIGHT-to-LEFT (mirrored)
   - Quadrant BL: Entrants 33-48 (rounds 1-4) positioned left-to-right
   - Quadrant BR: Entrants 49-64 (rounds 1-4) positioned RIGHT-to-LEFT (mirrored)
   - Final rounds (5-6) connect quadrants (possibly centered or duplicated across quadrants)

4. **Files that need changes**:
   - bracket-diagram.tsx: Core layout logic (getMatchPosition or quadrant-aware positioning)
   - Possibly bracket-zoom-wrapper.tsx: Section scroll targets might need adjustment for new layout
   - Consider: connector paths between quadrants for rounds 5-6

5. **Key architectural decision**: Should 64-entrant brackets be:
   - Four independent 16-entrant sub-brackets with connecting rounds?
   - A single SVG with quadrant-aware position calculations?
   - A CSS grid container with four SVG children?

fix: NOT IMPLEMENTED (research-only task)

verification: NOT APPLICABLE (research-only task)

files_changed: []

---

## TECHNICAL ANALYSIS

### Current Architecture (Horizontal Layout)

**bracket-diagram.tsx:**
- `getMatchPosition(round, position, totalRounds)` (lines 67-89)
  - X: `PADDING + (round - 1) * (MATCH_WIDTH + ROUND_GAP)`
  - Y: Recursive centering between feeder matchups
  - Layout: All rounds placed horizontally left-to-right
  - For 64 entrants: 6 rounds × ~196px = ~1176px wide SVG

**SVG Dimensions:**
- Width: `PADDING * 2 + totalRounds * MATCH_WIDTH + (totalRounds - 1) * ROUND_GAP`
- Height: Based on Round 1 matchup count × (MATCH_HEIGHT + MATCH_V_GAP)
- For 64: ~1200px wide × ~2300px tall (32 matchups vertically)

**Section Navigation (bracket-zoom-wrapper.tsx lines 72-97):**
- Computes sections based on bracketSize prop
- 64+ brackets: TL/TR/BL/BR buttons
- `scrollToSection()` scrolls container to corners of horizontal SVG:
  - TL: {top: 0, left: 0}
  - TR: {top: 0, left: el.scrollWidth} — right edge
  - BL: {top: el.scrollHeight, left: 0} — bottom edge
  - BR: {top: el.scrollHeight, left: el.scrollWidth} — bottom-right corner

**Problem:** Section buttons scroll to corners of a horizontal layout, not actual quadrants.

---

### Expected Architecture (2×2 Quadrant Layout)

**Visual Structure:**
```
┌─────────────────┬─────────────────┐
│   TOP-LEFT      │   TOP-RIGHT     │
│  Entrants 1-16  │  Entrants 17-32 │
│  (L→R layout)   │  (R→L mirrored) │
│  Rounds 1-4     │  Rounds 1-4     │
└─────────────────┴─────────────────┘
┌─────────────────┬─────────────────┐
│  BOTTOM-LEFT    │  BOTTOM-RIGHT   │
│  Entrants 33-48 │  Entrants 49-64 │
│  (L→R layout)   │  (R→L mirrored) │
│  Rounds 1-4     │  Rounds 1-4     │
└─────────────────┴─────────────────┘

          [Semifinals & Finals]
         Rounds 5-6 (centered)
```

**Matchup Distribution:**
- Each quadrant: 16 entrants = 4 rounds (8→4→2→1 matchups)
- Round 1: 32 total matchups split into 4 quadrants (8 each)
  - Positions 1-8: Top-Left
  - Positions 9-16: Top-Right
  - Positions 17-24: Bottom-Left
  - Positions 25-32: Bottom-Right
- Rounds 5-6: Connect quadrant winners (semifinals + finals)

**Entrant Seed Mapping:**
- TL quadrant: Seeds 1, 16, 8, 9, 4, 13, 5, 12 (first 8 matchups)
- TR quadrant: Seeds 2, 15, 7, 10, 3, 14, 6, 11 (next 8 matchups)
- BL quadrant: Seeds ... (third 8 matchups)
- BR quadrant: Seeds ... (last 8 matchups)

**Layout Calculation Changes Needed:**

Option A: **Four Separate SVG Diagrams (CSS Grid)**
- Split matchups by position ranges into 4 groups
- Render 4 independent BracketDiagram components
- Each shows rounds 1-4 only (16-entrant sub-bracket)
- Rounds 5-6 rendered separately below/center
- Section nav scrolls CSS grid, not SVG internals

Option B: **Single SVG with Quadrant-Aware Positioning**
- Modify `getMatchPosition()` to accept quadrant parameter
- Map position ranges to quadrants:
  - Positions 1-8 (round 1) → TL quadrant at (x: 0, y: 0)
  - Positions 9-16 → TR quadrant at (x: QUADRANT_WIDTH, y: 0) with mirrored X
  - Positions 17-24 → BL at (x: 0, y: QUADRANT_HEIGHT)
  - Positions 25-32 → BR at (x: QUADRANT_WIDTH, y: QUADRANT_HEIGHT) mirrored
- Right quadrants: reverse X calculation (right-to-left)
- Rounds 5-6: center between quadrants

**Connector Path Changes:**
- Within-quadrant connectors: use existing `getConnectorPath()`
- Cross-quadrant connectors (rounds 4→5): special logic to bridge quadrants

**Section Scroll Target Changes:**
- TL: scroll to (0, 0)
- TR: scroll to (QUADRANT_WIDTH, 0)
- BL: scroll to (0, QUADRANT_HEIGHT)
- BR: scroll to (QUADRANT_WIDTH, QUADRANT_HEIGHT)

---

### Recommended Approach: Option A (Four Separate SVGs)

**Advantages:**
- Reuses existing BracketDiagram logic without modification
- Simpler to implement (filter matchups, render 4 times)
- Easier to debug and test
- Pattern already used in double-elim-diagram.tsx (tab-based regions)
- Section navigation maps directly to CSS grid cells

**Implementation Steps:**
1. Create new component `QuadrantBracketLayout.tsx`
2. Filter matchups into 4 quadrant groups by round 1 position ranges
3. Render 4 BracketDiagram components in CSS grid (2×2)
4. Each quadrant: filter rounds 1-4, normalize if needed
5. Separate component for rounds 5-6 (semifinals/finals) centered below
6. Update section scroll to target CSS grid cells instead of SVG scroll
7. Conditional rendering: if bracketSize >= 64, use QuadrantBracketLayout; else, BracketDiagram

**Challenges:**
- Defining position ranges for quadrants (which positions go where?)
- Ensuring seed distribution is correct (does engine.ts produce correct seeds?)
- Right quadrants need mirroring — may need to pass `mirrorX` prop to BracketDiagram
- Connector lines between rounds 4→5 span quadrants — may need overlay SVG

**Files to Create/Modify:**
- **NEW:** `src/components/bracket/quadrant-bracket-layout.tsx`
- **MODIFY:** `src/components/bracket/bracket-diagram.tsx` (add mirrorX prop for right quadrants?)
- **MODIFY:** Component that renders brackets (check where BracketDiagram is invoked, add conditional for 64+)
- **POSSIBLY MODIFY:** `bracket-zoom-wrapper.tsx` (scroll targets for quadrants vs. single SVG)

---

### Open Questions

1. **Matchup position ranges:** How does the engine assign positions 1-32 in round 1? Are they already grouped logically for quadrants, or arbitrary?

2. **Seed distribution:** Does the standard seeding naturally create balanced quadrants, or will quadrants have unbalanced strength?

3. **Mirroring:** Should right quadrants (TR, BR) mirror horizontally (rounds go right-to-left)? This was mentioned in symptoms ("right to left, mirrored").

4. **Rounds 5-6 placement:** Where do semifinals and finals appear in the 2×2 grid? Centered below? Overlay? Separate section?

5. **Connector lines:** How do connectors between round 4 (quadrant finals) and round 5 (semifinals) work visually?

6. **Section scroll behavior:** Should clicking TL/TR/BL/BR scroll to that quadrant, or does the layout naturally fit on screen at 75% zoom (current initialScale for 64+)?

---

### Next Steps (If Implementing)

1. **Verify matchup position distribution:** Create test 64-entrant bracket, inspect matchup positions in DB
2. **Prototype quadrant filtering:** Write utility function to split matchups by quadrant
3. **Test seed distribution:** Verify top seeds distributed across quadrants
4. **Design rounds 5-6 layout:** Sketch where semifinals/finals appear
5. **Implement QuadrantBracketLayout:** Render 4 sub-brackets in CSS grid
6. **Add mirroring prop:** If needed, make BracketDiagram support right-to-left layout
7. **Update section navigation:** Point to CSS grid cells instead of SVG corners
8. **Test with real 64-entrant bracket:** Verify visual layout matches expectations

---

## SUMMARY

**Finding:** 64-entrant brackets render as a single wide horizontal SVG because `getMatchPosition()` only implements left-to-right round progression. The section navigation buttons added in 07-27 scroll to corners of this horizontal layout, but the SVG structure itself was never changed to a 2×2 quadrant grid.

**Root Cause:** The bracket-diagram.tsx component was designed for linear single-bracket layouts (4, 8, 16, 32 entrants). It lacks quadrant-aware positioning logic for 64+ entrants.

**Solution Options:**
1. **Four separate BracketDiagram components in CSS grid** (recommended: simpler, reuses existing logic)
2. **Modify getMatchPosition() for quadrant-aware positioning** (complex: requires mirroring, connector math)

**Architectural Decision Needed:** Choose between CSS grid approach (separate sub-brackets) vs. single SVG with quadrant math. CSS grid approach is lower risk and faster to implement.

**Files Involved:**
- `src/components/bracket/bracket-diagram.tsx` — current layout logic
- `src/components/bracket/bracket-zoom-wrapper.tsx` — section navigation
- **NEW FILE:** `src/components/bracket/quadrant-bracket-layout.tsx` (recommended approach)
- Parent component that invokes BracketDiagram (needs conditional rendering for 64+)

**Effort Estimate:** Medium (new component + conditional rendering + testing with 64-entrant data)

---

## IMPLEMENTATION ROADMAP (If Proceeding)

### Phase 1: Research & Validation
- [ ] Create test 64-entrant bracket in development
- [ ] Inspect matchup position distribution in database
- [ ] Verify seed assignments map logically to quadrants
- [ ] Document expected matchup ranges for each quadrant
- [ ] Sketch final layout design (where do rounds 5-6 appear?)

### Phase 2: Utility Functions
- [ ] Write `splitMatchupsIntoQuadrants(matchups, totalRounds)` utility
  - Returns: `{ TL, TR, BL, BR, connecting }` matchup arrays
  - TL/TR/BL/BR: Rounds 1-4 matchups for that quadrant
  - connecting: Rounds 5-6 (semifinals + finals)
- [ ] Write `getQuadrantForPosition(position, round)` helper
  - Maps round 1 position (1-32) to quadrant identifier
- [ ] Test utilities with mock 64-entrant matchup data

### Phase 3: Quadrant Layout Component
- [ ] Create `src/components/bracket/quadrant-bracket-layout.tsx`
- [ ] Implement 2×2 CSS grid container
- [ ] Render TL quadrant: `<BracketDiagram matchups={quadrants.TL} totalRounds={4} />`
- [ ] Render TR quadrant with mirroring (if needed — investigate mirroring approach)
- [ ] Render BL quadrant
- [ ] Render BR quadrant with mirroring
- [ ] Render connecting rounds (5-6) in separate section
- [ ] Add quadrant labels (optional: "Top-Left", "Top-Right", etc.)
- [ ] Pass through props: onEntrantClick, votedEntrantIds, etc.

### Phase 4: Mirroring Logic (If Needed)
- [ ] Determine if right quadrants should mirror horizontally
- [ ] Option A: Add `mirrorX` prop to BracketDiagram component
  - Modify getMatchPosition to reverse X calculation
  - Reverse connector paths for mirrored quadrants
- [ ] Option B: CSS transform `scaleX(-1)` on container (simpler but may flip text)
- [ ] Test mirroring with sample bracket

### Phase 5: Integration
- [ ] Update `bracket-detail.tsx`:
  - Compute `bracketSize` from `bracket.size` or `bracket.entrants.length`
  - Conditional rendering: `bracketSize >= 64 ? <QuadrantBracketLayout /> : <BracketDiagram />`
  - Pass bracketSize prop to both components
- [ ] Update student views (`advanced-voting-view.tsx`, etc.) if needed
- [ ] Update live dashboard (`live-dashboard.tsx`) if needed

### Phase 6: Section Navigation
- [ ] Update `bracket-zoom-wrapper.tsx` or create `quadrant-zoom-wrapper.tsx`
- [ ] Map section buttons to CSS grid cells:
  - TL button → scroll to grid cell (1, 1)
  - TR button → scroll to grid cell (1, 2)
  - BL button → scroll to grid cell (2, 1)
  - BR button → scroll to grid cell (2, 2)
- [ ] Test smooth scrolling between quadrants
- [ ] Verify zoom controls work with CSS grid layout

### Phase 7: Testing & Refinement
- [ ] Create real 64-entrant bracket in development
- [ ] Test teacher view (bracket-detail page)
- [ ] Test student voting view (if applicable)
- [ ] Test live dashboard rendering
- [ ] Verify section navigation buttons work correctly
- [ ] Test zoom in/out behavior
- [ ] Test on mobile/tablet viewports
- [ ] Check connector lines between rounds
- [ ] Verify winner advancement across quadrants

### Phase 8: Edge Cases & Polish
- [ ] Handle bye matchups spanning quadrants
- [ ] Verify colors/styling consistency across quadrants
- [ ] Test with different zoom levels
- [ ] Add loading states if needed
- [ ] Update any storybook stories or docs
- [ ] Add TypeScript types for quadrant utilities

---

## CRITICAL QUESTIONS TO ANSWER BEFORE IMPLEMENTING

1. **Matchup Position Assignment:**
   - Does the bracket engine assign positions 1-32 in round 1 sequentially?
   - Are positions tied to seeds in a predictable way?
   - Example: Position 1 = seeds 1v64, Position 2 = seeds 32v33?

2. **Quadrant Boundaries:**
   - Which positions belong to which quadrant?
   - Proposed: Positions 1-8 (TL), 9-16 (TR), 17-24 (BL), 25-32 (BR)
   - Does this create balanced seed distribution?

3. **Mirroring Requirements:**
   - Should TR and BR quadrants visually mirror (rounds go right-to-left)?
   - Is this purely aesthetic or functional?
   - Does mirroring apply to text rendering?

4. **Connecting Rounds Placement:**
   - Where do rounds 5 (semifinals) and 6 (finals) appear visually?
   - Centered below the 2×2 grid?
   - Overlay on top of grid?
   - Separate scrollable section?

5. **Connector Line Behavior:**
   - Do round 4→5 connectors span across quadrants?
   - Should they be visible or hidden?
   - Special styling for cross-quadrant connectors?

6. **Zoom & Navigation:**
   - At 75% initial zoom (current default for 64+), do all 4 quadrants fit on screen?
   - Should section buttons scroll or just highlight?
   - Should each quadrant be independently zoomable?

---

## FILES REFERENCE

**Current Implementation:**
- `src/components/bracket/bracket-diagram.tsx` — Horizontal layout logic (lines 67-89: getMatchPosition)
- `src/components/bracket/bracket-zoom-wrapper.tsx` — Section nav buttons (lines 72-97)
- `src/lib/bracket/engine.ts` — Matchup generation (generateMatchups function)

**Integration Points:**
- `src/components/bracket/bracket-detail.tsx` (lines 217-222) — Teacher view
- `src/components/student/advanced-voting-view.tsx` — Student view
- `src/components/teacher/live-dashboard.tsx` — Live view

**Reference Patterns:**
- `src/components/bracket/double-elim-diagram.tsx` — Multi-bracket region handling via tabs
- `src/components/bracket/bracket-diagram.tsx` compactVertical mode — Alternative positioning logic

**New Files to Create:**
- `src/components/bracket/quadrant-bracket-layout.tsx` — Main quadrant layout component
- `src/lib/bracket/quadrant-utils.ts` — Utility functions for splitting matchups by quadrant

---

## RESEARCH COMPLETE

**Status:** INVESTIGATING → DOCUMENTED

This debug file now contains:
- ✅ Root cause identification (horizontal-only layout logic)
- ✅ Current architecture analysis
- ✅ Expected behavior specification
- ✅ Two implementation approaches (CSS grid recommended)
- ✅ Integration point identification
- ✅ Implementation roadmap
- ✅ Open questions requiring investigation
- ✅ File references and code locations

**Next action:** Present findings to user for decision on:
1. Whether to proceed with implementation
2. Which approach to use (CSS grid vs. single SVG)
3. Answers to critical questions (quadrant boundaries, mirroring, connecting rounds)
