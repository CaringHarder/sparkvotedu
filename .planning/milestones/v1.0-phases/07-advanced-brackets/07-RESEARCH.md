# Phase 7: Advanced Brackets - Research

**Researched:** 2026-02-01
**Domain:** Tournament algorithms, SVG rendering, drag-and-drop, pan/zoom, predictive scoring
**Confidence:** HIGH (algorithms are well-established mathematical constructs; codebase patterns are verified from source)

## Summary

Phase 7 extends the existing custom bracket engine (Phase 3/4) with three new bracket types (double-elimination, round-robin, predictive), non-power-of-two support with automatic byes, drag-and-drop entrant reordering, and zoom/pan for large brackets. The existing codebase uses custom SVG rendering with inline styles and CSS custom properties, HTML5 native drag-and-drop, pure function feature gates, and a `Matchup` model with self-referential `nextMatchupId` chaining.

The tournament algorithms (double-elimination structure, round-robin circle method, bye placement) are well-established mathematical constructs with deterministic implementations. The main complexity is in schema evolution (new models for predictions, round-robin standings, losers bracket tracking) and SVG layout (losers bracket requires a completely different layout geometry from the existing single-elimination renderer). The predictive bracket adds a new student-facing data model (predictions, scoring) that has no current analog in the codebase.

**Primary recommendation:** Extend the existing bracket engine with new `generateDoubleEliminationMatchups()`, `generateRoundRobinMatchups()`, and bye-aware `generateMatchupsWithByes()` functions. Keep all rendering in custom SVG (no third-party bracket library). Use the existing HTML5 native drag-and-drop pattern from `EntrantList`. Build a lightweight custom pan/zoom hook using CSS transforms rather than adding a library dependency.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in project -- no new dependencies for bracket logic)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Custom bracket engine | N/A | `src/lib/bracket/engine.ts` | Already generates single-elim matchups; extend for new types |
| Custom SVG rendering | N/A | `src/components/bracket/bracket-diagram.tsx` | Already renders brackets with connectors; extend for double-elim/round-robin |
| Prisma ORM | ^7.3.0 | Schema for new models (Prediction, RoundRobinStanding) | Already used for all DB access |
| HTML5 Drag-and-Drop | Native | Entrant reordering | Already used in `EntrantList` component (Phase 3 decision: [03-06]) |

### Supporting (Already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | ^12.29.2 | Tab transitions, leaderboard animations | Predictive leaderboard updates, tab switching |
| Supabase Realtime | ^2.93.3 | Live leaderboard, live standings | Predictive bracket leaderboard, round-robin standings |
| Zod | ^4.3.6 | Validation schemas for new bracket types | All new server actions |

### New Dependencies
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| None | N/A | N/A | All algorithms are pure math; pan/zoom is achievable with CSS transforms + pointer events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom pan/zoom | `react-zoom-pan-pinch` | Adds ~15kb dep; custom is ~50 lines for our use case (single SVG element) |
| HTML5 DnD (existing) | `@dnd-kit/react` v0.2.1 | Pre-1.0, React 19 compatibility issues (#1654); existing HTML5 DnD works fine |
| Custom bracket SVG | `react-brackets` | No library supports our exact layout needs (tabbed double-elim, custom connectors) |

**Installation:**
```bash
# No new packages needed. All algorithms are hand-built pure functions.
# Pan/zoom is CSS transforms + pointer events (no library).
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/bracket/
│   ├── engine.ts              # EXTEND: add generateDoubleElimMatchups, generateRoundRobinMatchups, generateMatchupsWithByes
│   ├── types.ts               # EXTEND: add DoubleElimMatchupSeed, RoundRobinRound, PredictionData types
│   ├── advancement.ts         # EXTEND: add double-elim advancement (winners->losers drop, losers bracket advancement)
│   ├── double-elim.ts         # NEW: double-elimination bracket generation + losers bracket seeding
│   ├── round-robin.ts         # NEW: circle method round generation + standings calculation
│   ├── predictive.ts          # NEW: prediction scoring engine + leaderboard calculation
│   ├── byes.ts                # NEW: bye placement algorithm for non-power-of-two brackets
│   └── __tests__/
│       ├── double-elim.test.ts
│       ├── round-robin.test.ts
│       ├── predictive.test.ts
│       └── byes.test.ts
├── lib/dal/
│   ├── bracket.ts             # EXTEND: add createDoubleElimBracketDAL, createRoundRobinBracketDAL
│   ├── prediction.ts          # NEW: prediction CRUD, scoring queries
│   └── round-robin.ts         # NEW: round-robin standings queries
├── actions/
│   ├── bracket.ts             # EXTEND: handle new bracket types in createBracket
│   ├── bracket-advance.ts     # EXTEND: double-elim advancement, round-robin result recording
│   ├── prediction.ts          # NEW: submitPrediction, scorePredictions
│   └── round-robin.ts         # NEW: recordRoundRobinResult, advanceRound
├── components/bracket/
│   ├── bracket-diagram.tsx             # EXTEND: add BYE slot rendering, auto-zoom wrapper
│   ├── double-elim-diagram.tsx         # NEW: tabbed winners/losers/grand-finals/overview layout
│   ├── round-robin-standings.tsx       # NEW: league table component
│   ├── round-robin-matchups.tsx        # NEW: round-by-round or all-at-once matchup grid
│   ├── predictive-bracket.tsx          # NEW: prediction submission UI (simple form + advanced SVG click)
│   ├── prediction-leaderboard.tsx      # NEW: student/teacher leaderboard views
│   ├── bracket-zoom-wrapper.tsx        # NEW: CSS transform pan/zoom container
│   ├── bracket-form.tsx                # EXTEND: add bracket type selector, custom size input, play-in toggle
│   └── entrant-list.tsx                # EXTEND: already has drag-and-drop, add bye indicator
└── hooks/
    ├── use-pan-zoom.ts                 # NEW: custom hook for CSS transform pan/zoom with pinch support
    └── use-predictions.ts              # NEW: real-time prediction leaderboard hook
```

### Pattern 1: Bracket Type Strategy Pattern
**What:** Each bracket type has its own engine module that implements a common interface for matchup generation, advancement, and completion checking.
**When to use:** When creating or advancing any bracket type.
**Example:**
```typescript
// Source: Existing pattern from src/lib/bracket/engine.ts
// Each bracket type exports the same function signatures

// single-elim (existing)
export function generateMatchups(size: number): MatchupSeed[]

// double-elim (new)
export function generateDoubleElimMatchups(size: number): {
  winners: MatchupSeed[]
  losers: MatchupSeed[]
  grandFinals: MatchupSeed[]
}

// round-robin (new)
export function generateRoundRobinRounds(entrantCount: number): RoundRobinRound[]

// All are PURE functions -- no DB calls, no side effects
```

### Pattern 2: Schema Extension via bracketType Discriminator
**What:** The existing `Bracket.bracketType` field (already in schema as string, default `single_elimination`) acts as a discriminator for behavior branching in DAL, actions, and rendering.
**When to use:** Everywhere brackets are created, advanced, or rendered.
**Example:**
```typescript
// Source: Existing Bracket model in schema.prisma already has bracketType field
// bracketType: String @default("single_elimination") @map("bracket_type")

// In DAL/actions, branch on bracketType:
switch (bracket.bracketType) {
  case 'single_elimination':
    matchupSeeds = generateMatchups(size)
    break
  case 'double_elimination':
    matchupSeeds = generateDoubleElimMatchups(size)
    break
  case 'round_robin':
    rounds = generateRoundRobinRounds(size)
    break
  case 'predictive':
    // Uses single-elim matchup structure + prediction overlay
    matchupSeeds = generateMatchups(size)
    break
}
```

### Pattern 3: Matchup Tagging for Bracket Region
**What:** Double-elimination matchups need a `bracketRegion` field to distinguish winners bracket, losers bracket, and grand finals matchups within the same bracket.
**When to use:** Double-elimination bracket creation, rendering, and advancement.
**Example:**
```typescript
// New field on Matchup model (or stored in a new field/JSON):
// bracketRegion: 'winners' | 'losers' | 'grand_finals'
// This enables:
// 1. Filtering matchups by tab (Winners/Losers/Grand Finals)
// 2. Knowing which bracket a matchup belongs to for advancement logic
// 3. Rendering the correct SVG layout per tab
```

### Pattern 4: Custom Pan/Zoom via CSS Transforms
**What:** A lightweight `usePanZoom` hook that applies CSS `transform: scale() translate()` to a container div wrapping the SVG bracket diagram.
**When to use:** Large brackets (32+ entrants) where the SVG exceeds viewport.
**Example:**
```typescript
// Custom hook -- no library dependency
function usePanZoom(containerRef: RefObject<HTMLDivElement>) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setTransform(prev => ({
        ...prev,
        scale: Math.max(0.25, Math.min(3, prev.scale * delta))
      }))
    }

    // Pointer drag for pan
    let dragging = false
    let startX = 0, startY = 0
    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      startX = e.clientX
      startY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      setTransform(prev => ({
        ...prev,
        x: prev.x + (e.clientX - startX),
        y: prev.y + (e.clientY - startY)
      }))
      startX = e.clientX
      startY = e.clientY
    }
    const onPointerUp = () => { dragging = false }

    // Touch pinch zoom
    let lastDistance = 0
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.hypot(dx, dy)
        if (lastDistance > 0) {
          const delta = distance / lastDistance
          setTransform(prev => ({
            ...prev,
            scale: Math.max(0.25, Math.min(3, prev.scale * delta))
          }))
        }
        lastDistance = distance
      }
    }
    const onTouchEnd = () => { lastDistance = 0 }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef])

  return { transform, resetZoom: () => setTransform({ scale: 1, x: 0, y: 0 }) }
}
```

### Anti-Patterns to Avoid
- **Shared matchup generation for all types:** Each bracket type has fundamentally different matchup structures. Do NOT try to make `generateMatchups` handle all types -- use separate functions with a shared `MatchupSeed` output interface.
- **Storing losers bracket as a separate Bracket record:** Keep all matchups in one bracket with a `bracketRegion` discriminator. Separate records would break the advancement chain and complicate querying.
- **Over-engineering the round-robin with elimination semantics:** Round-robin does NOT use the `nextMatchupId` chaining pattern. It uses rounds with independent matchups. Do not force it into the single-elim data model.
- **Adding a library for pan/zoom of a single SVG:** The use case is narrow (one SVG element, wheel zoom, drag pan, pinch). CSS transforms + pointer events is ~50 lines vs. adding a 15kb+ dependency with unknown React 19 compatibility.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reorder | New DnD library | Existing HTML5 DnD in `EntrantList` | Already works, zero dependencies (Phase 3 decision [03-06]) |
| Standard tournament seeding | Custom seed algorithm | Existing `buildSeedOrder()` in `engine.ts` | Already implements recursive doubling (NCAA-style) |
| Feature gating | Inline `if (tier === 'pro_plus')` | Existing `canUseBracketType()` in `features.ts` | Tier limits already include bracket type arrays |
| Matchup creation in transaction | Inline DB calls | Existing `createMatchupsInTransaction()` in `bracket.ts` DAL | Already handles create + wire nextMatchupId pattern |
| Real-time broadcasting | Custom WebSocket | Existing `broadcastBracketUpdate()` helper | Already uses Supabase REST API (stateless server actions) |
| Bracket status transitions | Manual status checks | Existing `VALID_TRANSITIONS` Record in DAL | Already enforces forward-only transitions |

**Key insight:** The existing bracket infrastructure is well-architected with pure functions, shared helpers, and established patterns. The new bracket types should extend these patterns, not replace them.

## Common Pitfalls

### Pitfall 1: Double-Elimination Losers Bracket Seeding Causing Rematches
**What goes wrong:** Losers from the winners bracket drop into the losers bracket and immediately face the same opponent they just lost to.
**Why it happens:** Naive drop placement puts WB losers directly adjacent in LB without considering their WB opponents.
**How to avoid:** Use the split-and-reverse algorithm for losers bracket seeding. When N losers drop from winners round R, reverse their order before placing them in the losers bracket. This ensures players from the same WB region end up on opposite sides of the LB.
**Warning signs:** In testing, check that no two entrants who played in WB round 1 are matched in LB round 1.

### Pitfall 2: Bye Matchups Requiring Manual Advancement
**What goes wrong:** Bye matchups are created with one entrant and one null slot, but the system waits for a "winner" to be selected, blocking bracket progression.
**Why it happens:** Existing advancement logic assumes both entrants exist and a winner must be explicitly chosen.
**How to avoid:** Auto-advance bye matchups during creation. When a matchup has exactly one entrant (the other is null/BYE), immediately set the present entrant as the winner and status as 'decided', and propagate to the next round. This should happen in the `createMatchupsInTransaction` flow.
**Warning signs:** Bracket status stuck on first round when byes exist; teacher has to manually "advance" empty matchups.

### Pitfall 3: Round-Robin Matchup Count Explosion
**What goes wrong:** Large round-robin tournaments create N*(N-1)/2 matchups, which overwhelms the UI and the teacher.
**Why it happens:** Round-robin with 8 entrants = 28 matchups. With voting on each, this is 28 separate voting sessions.
**How to avoid:** The CONTEXT.md already caps round-robin at 8 entrants (28 matchups max). Enforce this limit strictly in validation. The round-by-round pacing mode helps by presenting 4 matchups at a time (for 8 entrants) rather than all 28.
**Warning signs:** Teacher creates round-robin with many entrants; "all-at-once" mode shows overwhelming grid.

### Pitfall 4: Predictive Bracket Predictions Becoming Invalid After Bye Auto-Advance
**What goes wrong:** Student predicts a winner for a bye matchup, but the system auto-advances the bye. The prediction is wasted or scored incorrectly.
**Why it happens:** Bye matchups exist in the bracket structure, and students can see them in the prediction UI.
**How to avoid:** Skip bye matchups in the prediction UI entirely. Pre-fill bye winners before opening predictions. Students only predict matchups where both entrants exist.
**Warning signs:** Predictions table has entries for bye matchups; scoring gives free points for "predicting" the only entrant.

### Pitfall 5: Grand Finals Reset Match Creating Confusing UI State
**What goes wrong:** The losers bracket champion wins match 1 of grand finals, triggering a "reset" match. The UI doesn't clearly communicate that a second match is needed.
**Why it happens:** Grand finals reset is a conditional match that only exists if the LB champion wins match 1.
**How to avoid:** Per CONTEXT.md decision: "If winners champ wins match 1 of grand finals, show winner immediately (no 'if necessary' placeholder)." Only show the reset match slot AFTER the LB champ wins match 1. Create the reset matchup dynamically at that point, not upfront.
**Warning signs:** Empty "if necessary" placeholder shown before grand finals even starts; confusing to students.

### Pitfall 6: Schema Migration Breaking Existing Brackets
**What goes wrong:** Adding new required fields to Bracket or Matchup models breaks existing single-elimination brackets.
**Why it happens:** New fields like `bracketRegion`, `roundRobinRound`, `predictionPhaseStatus` are only relevant to new bracket types but may be added as required fields.
**How to avoid:** All new fields must be optional or have sensible defaults. `bracketRegion` defaults to null (single-elim doesn't use it). `bracketType` already defaults to `single_elimination`. New models (Prediction, RoundRobinStanding) are separate tables, not additions to existing models.
**Warning signs:** `prisma db push` fails or existing brackets return null for new fields.

### Pitfall 7: Entrant Count Validation Regression
**What goes wrong:** Existing validation restricts bracket size to `z.union([z.literal(4), z.literal(8), z.literal(16)])`, blocking the new 3-64 range.
**Why it happens:** Phase 3 decision [03-01] locked sizes to power-of-two only; Phase 7 explicitly expands this.
**How to avoid:** Update `bracketSizeSchema` in `validation.ts` to `z.number().int().min(3).max(128)` (128 = pro_plus max entrants). The `canUseEntrantCount` gate already handles tier-based limits.
**Warning signs:** Validation error when trying to create a 5-entrant bracket; schema rejects non-power-of-two sizes.

## Code Examples

### Double-Elimination Matchup Generation
```typescript
// Source: Mathematical structure from Wikipedia + research
// For N entrants (power-of-two after byes):
// Winners bracket: standard single-elim (log2(N) rounds, N-1 matchups)
// Losers bracket: alternating minor/major rounds
//   Minor round: LB survivors play each other (halves the field)
//   Major round: LB survivors play WB dropdowns (field stays same)
// Grand finals: 1-2 matchups (reset if LB champ wins first)

interface DoubleElimMatchups {
  winners: MatchupSeed[]     // Standard single-elim structure
  losers: MatchupSeed[]      // Minor/major alternating rounds
  grandFinals: MatchupSeed[] // 1 matchup (reset created dynamically)
}

function generateDoubleElimMatchups(size: number): DoubleElimMatchups {
  // Winners bracket = standard single-elimination
  const winners = generateMatchups(size) // reuse existing engine

  // Losers bracket structure for size N:
  // WB has log2(N) rounds. LB has 2*(log2(N)-1) rounds.
  // LB Round 1 (minor): N/2 WB R1 losers -> N/4 matchups
  // LB Round 2 (major): N/4 LB R1 winners + N/4 WB R2 losers -> N/4 matchups
  // LB Round 3 (minor): N/4 LB R2 winners -> N/8 matchups
  // LB Round 4 (major): N/8 LB R3 winners + N/8 WB R3 losers -> N/8 matchups
  // ... continues until 1 LB champion

  const wbRounds = Math.log2(size)
  const losers: MatchupSeed[] = []

  let lbRound = 1
  let lbFieldSize = size / 2 // Number of players entering LB from WB R1

  // LB Round 1 (minor): WB R1 losers play each other
  const lbR1Matchups = lbFieldSize / 2
  for (let pos = 1; pos <= lbR1Matchups; pos++) {
    losers.push({
      round: lbRound,
      position: pos,
      entrant1Seed: null, // Filled by WB R1 losers
      entrant2Seed: null,
      nextMatchupPosition: { round: lbRound + 1, position: Math.ceil(pos / 1) } // -> major round
    })
  }
  lbRound++

  // Remaining LB rounds: alternate major (with WB dropdowns) and minor
  let currentFieldSize = lbR1Matchups // survivors from LB R1
  for (let wbRound = 2; wbRound <= wbRounds; wbRound++) {
    // Major round: currentFieldSize matches (LB survivors vs WB dropdowns)
    for (let pos = 1; pos <= currentFieldSize; pos++) {
      losers.push({
        round: lbRound,
        position: pos,
        entrant1Seed: null,
        entrant2Seed: null,
        nextMatchupPosition: currentFieldSize > 1
          ? { round: lbRound + 1, position: Math.ceil(pos / 2) }
          : null // LB final
      })
    }
    lbRound++

    // Minor round: halve the field (only if more than 1 remaining)
    if (currentFieldSize > 1) {
      currentFieldSize = currentFieldSize / 2
      for (let pos = 1; pos <= currentFieldSize; pos++) {
        losers.push({
          round: lbRound,
          position: pos,
          entrant1Seed: null,
          entrant2Seed: null,
          nextMatchupPosition: wbRound < wbRounds
            ? { round: lbRound + 1, position: pos } // -> next major
            : null // -> grand finals
        })
      }
      lbRound++
    }
  }

  // Grand finals: single matchup
  const grandFinals: MatchupSeed[] = [{
    round: 1,
    position: 1,
    entrant1Seed: null, // WB champion
    entrant2Seed: null, // LB champion
    nextMatchupPosition: null
  }]

  return { winners, losers, grandFinals }
}
```

### Bye Placement Algorithm
```typescript
// Source: Standard tournament bye placement (top seeds get byes)
// For N entrants where N is not a power of 2:
// 1. Find next power of 2 >= N (call it bracketSize)
// 2. Number of byes = bracketSize - N
// 3. Top seeds (1 through numByes) get byes
// 4. Place byes in the bracket using standard seeding positions

function calculateBracketSizeWithByes(entrantCount: number): {
  bracketSize: number  // Next power of 2
  numByes: number
  byeSeeds: number[]   // Seeds that get byes (1-indexed)
} {
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(entrantCount)))
  const numByes = bracketSize - entrantCount
  const byeSeeds = Array.from({ length: numByes }, (_, i) => i + 1)
  return { bracketSize, numByes, byeSeeds }
}

function generateMatchupsWithByes(entrantCount: number): MatchupSeed[] {
  const { bracketSize, byeSeeds } = calculateBracketSizeWithByes(entrantCount)

  // Generate full bracket for bracketSize
  const matchups = generateMatchups(bracketSize)

  // Mark bye matchups: in round 1, if a matchup's higher seed is in byeSeeds,
  // the lower seed slot becomes BYE (null). The present entrant auto-advances.
  // Standard seeding puts top seeds against bottom seeds.
  // For bracketSize=8, entrantCount=5: byes for seeds 1,2,3
  // Match 1: Seed 1 vs Seed 8 (BYE) -> Seed 1 auto-advances
  // Match 2: Seed 4 vs Seed 5 -> both real
  // Match 3: Seed 2 vs Seed 7 (BYE) -> Seed 2 auto-advances
  // Match 4: Seed 3 vs Seed 6 (BYE) -> Seed 3 auto-advances

  return matchups.map(m => {
    if (m.round === 1) {
      // Check if either seed is a BYE (> entrantCount)
      const e1IsBye = m.entrant1Seed !== null && m.entrant1Seed > entrantCount
      const e2IsBye = m.entrant2Seed !== null && m.entrant2Seed > entrantCount
      return {
        ...m,
        entrant1Seed: e1IsBye ? null : m.entrant1Seed,  // null = BYE
        entrant2Seed: e2IsBye ? null : m.entrant2Seed,
        isBye: e1IsBye || e2IsBye
      }
    }
    return m
  })
}
```

### Round-Robin Circle Method Schedule Generation
```typescript
// Source: Circle method algorithm (well-established mathematical algorithm)
// Used by major sports leagues worldwide

interface RoundRobinRound {
  roundNumber: number
  matchups: Array<{ entrant1Seed: number; entrant2Seed: number }>
}

function generateRoundRobinRounds(entrantCount: number): RoundRobinRound[] {
  // Step 1: If odd, add a BYE placeholder (entrant count + 1)
  const isOdd = entrantCount % 2 === 1
  const n = isOdd ? entrantCount + 1 : entrantCount
  const BYE_SEED = isOdd ? n : -1 // -1 means no BYE needed

  // Step 2: Fix entrant 1 (seed 1), rotate the rest
  const fixed = 1
  const rotating = Array.from({ length: n - 1 }, (_, i) => i + 2) // [2, 3, ..., n]

  const rounds: RoundRobinRound[] = []

  for (let r = 0; r < n - 1; r++) {
    const current = [fixed, ...rotating]
    const matchups: Array<{ entrant1Seed: number; entrant2Seed: number }> = []

    for (let i = 0; i < n / 2; i++) {
      const a = current[i]
      const b = current[n - 1 - i]

      // Skip if either is the BYE placeholder
      if (a === BYE_SEED || b === BYE_SEED) continue

      matchups.push({ entrant1Seed: a, entrant2Seed: b })
    }

    rounds.push({ roundNumber: r + 1, matchups })

    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop()!)
  }

  return rounds
}

// For 8 entrants: 7 rounds, 4 matchups per round, 28 total matchups
// For 5 entrants: 5 rounds, 2 matchups per round, 10 total matchups
```

### Predictive Bracket Scoring Engine
```typescript
// Source: NCAA March Madness bracket pool scoring systems (ESPN, CBS, Yahoo)
// Using the simple doubling system (1-2-4-8-16-32) which is the most popular

// Recommended point values (Claude's Discretion resolution):
// Use the standard 1-2-4-8-16-32 doubling system
// This is the most popular (50%+ of bracket pools use it)
// It makes later rounds progressively more valuable
// The max points per round are equal (round1: 32*1=32, round2: 16*2=32, etc.)

const POINTS_PER_ROUND: Record<number, number> = {
  1: 1,   // Round of 64
  2: 2,   // Round of 32
  3: 4,   // Sweet 16
  4: 8,   // Elite 8
  5: 16,  // Final Four
  6: 32,  // Championship
}

// For smaller brackets (4-entrant = 2 rounds, 8-entrant = 3 rounds):
// Scale so that the final is always the most valuable
function getPointsForRound(round: number, totalRounds: number): number {
  // Use doubling: R1=1, R2=2, R3=4, R4=8, etc.
  return Math.pow(2, round - 1)
}

interface PredictionScore {
  participantId: string
  totalPoints: number
  correctPicks: number
  totalPicks: number
  pointsByRound: Record<number, { correct: number; total: number; points: number }>
}

function scorePredictions(
  predictions: Array<{ participantId: string; matchupId: string; predictedWinnerId: string }>,
  resolvedMatchups: Array<{ id: string; round: number; winnerId: string }>,
  totalRounds: number
): PredictionScore[] {
  const matchupMap = new Map(resolvedMatchups.map(m => [m.id, m]))
  const scores = new Map<string, PredictionScore>()

  for (const pred of predictions) {
    const matchup = matchupMap.get(pred.matchupId)
    if (!matchup || !matchup.winnerId) continue // Not yet resolved

    if (!scores.has(pred.participantId)) {
      scores.set(pred.participantId, {
        participantId: pred.participantId,
        totalPoints: 0,
        correctPicks: 0,
        totalPicks: 0,
        pointsByRound: {}
      })
    }

    const score = scores.get(pred.participantId)!
    const roundPoints = getPointsForRound(matchup.round, totalRounds)
    const isCorrect = pred.predictedWinnerId === matchup.winnerId

    if (!score.pointsByRound[matchup.round]) {
      score.pointsByRound[matchup.round] = { correct: 0, total: 0, points: 0 }
    }

    score.pointsByRound[matchup.round].total++
    score.totalPicks++

    if (isCorrect) {
      score.totalPoints += roundPoints
      score.correctPicks++
      score.pointsByRound[matchup.round].correct++
      score.pointsByRound[matchup.round].points += roundPoints
    }
  }

  return Array.from(scores.values()).sort((a, b) => b.totalPoints - a.totalPoints)
}
```

### Losers Bracket Seeding to Avoid Rematches
```typescript
// Source: Split-and-reverse algorithm (standard double-elim seeding)
// Rule 2 > Rule 1: Avoid rematches first, then respect seed order

// When losers drop from WB round R into LB:
// Reverse the order so players from the same WB region
// end up on opposite sides of the LB.

function seedLosersFromWinnersRound(
  wbLosers: string[],  // Ordered by WB matchup position
  lbRoundSize: number  // Number of available LB slots
): string[] {
  // Simple reverse: WB position 1 loser goes to LB last slot
  // This ensures WB matchup 1 loser and WB matchup 2 loser
  // (who could rematch) are on opposite sides of LB
  const reversed = [...wbLosers].reverse()

  // For larger brackets, use split-and-reverse:
  // Split into groups, reverse within each group
  if (wbLosers.length > 2) {
    const mid = Math.floor(wbLosers.length / 2)
    const firstHalf = wbLosers.slice(0, mid).reverse()
    const secondHalf = wbLosers.slice(mid).reverse()
    return [...secondHalf, ...firstHalf]
  }

  return reversed
}
```

### Play-In Round Generation (NCAA First Four Style)
```typescript
// Source: NCAA March Madness First Four structure
// Play-in: 8 extra teams play 4 matches to fill 4 slots in the main bracket
// Lowest seeds play in the play-in round

function generatePlayInRound(
  mainBracketSize: number,  // e.g., 64
  playInCount: number       // e.g., 8 (4 play-in matches)
): {
  playInMatchups: MatchupSeed[]
  mainBracketSlotsToFill: number[] // Which seeds in main bracket are filled by play-in winners
} {
  const totalEntrants = mainBracketSize + playInCount
  const playInMatchCount = playInCount / 2  // 8 extra -> 4 matches

  // Lowest seeds play in play-in
  // Seeds (mainBracketSize - playInMatchCount + 1) through (mainBracketSize + playInCount)
  // e.g., for 64+8: seeds 61-72 play in play-in
  const playInMatchups: MatchupSeed[] = []
  const mainSlotsToFill: number[] = []

  for (let i = 0; i < playInMatchCount; i++) {
    const highSeed = mainBracketSize - playInMatchCount + 1 + i  // 61, 62, 63, 64
    const lowSeed = totalEntrants - i                              // 72, 71, 70, 69
    playInMatchups.push({
      round: 0, // Round 0 = play-in round
      position: i + 1,
      entrant1Seed: highSeed,
      entrant2Seed: lowSeed,
      nextMatchupPosition: null // Links to main bracket R1 matchup
    })
    mainSlotsToFill.push(highSeed)
  }

  return { playInMatchups, mainBracketSlotsToFill: mainSlotsToFill }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Power-of-two only brackets | Non-power-of-two with byes | Phase 7 | `bracketSizeSchema` changes from literal union to range |
| `BracketSize = 4 \| 8 \| 16` | `number` with min 3, max 128 | Phase 7 | Type changes in engine, validation, and components |
| Single bracket engine function | Type-discriminated engine modules | Phase 7 | New files for each bracket type |
| No prediction model | Prediction + PredictionScore models | Phase 7 | New Prisma models, new DAL, new actions |
| SVG fits viewport (no zoom) | Pan/zoom wrapper for large brackets | Phase 7 | New component wrapping BracketDiagram |
| `viewBox` auto-scaling only | `viewBox` + CSS transform zoom | Phase 7 | Layered zoom: SVG viewBox for initial fit, CSS for user zoom |

**Deprecated/outdated:**
- `BracketSize` type (`4 | 8 | 16`): Replace with `number` validated by Zod schema. The type alias can be kept for backwards compatibility but should no longer constrain validation.
- `bracketSizeSchema` (`z.union([z.literal(4), z.literal(8), z.literal(16)])`): Replace with `z.number().int().min(3).max(128)`.

## Schema Changes Required

### New Prisma Models

```prisma
// Prediction for predictive brackets
model Prediction {
  id            String             @id @default(uuid())
  bracketId     String             @map("bracket_id")
  bracket       Bracket            @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  participantId String             @map("participant_id")
  participant   StudentParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  matchupId     String             @map("matchup_id")
  matchup       Matchup            @relation(fields: [matchupId], references: [id], onDelete: Cascade)
  predictedWinnerId String         @map("predicted_winner_id")
  predictedWinner   BracketEntrant @relation(fields: [predictedWinnerId], references: [id])
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([bracketId, participantId, matchupId])
  @@index([bracketId])
  @@index([participantId])
  @@map("predictions")
}
```

### Bracket Model Extensions

```prisma
model Bracket {
  // ... existing fields ...

  // NEW: Phase 7 fields (all optional for backwards compatibility)
  predictionStatus  String?  @map("prediction_status")  // 'predictions_open' | 'active' | null
  roundRobinPacing  String?  @map("round_robin_pacing")  // 'round_by_round' | 'all_at_once' | null
  roundRobinVotingStyle String? @map("round_robin_voting_style") // 'simple' | 'advanced' | null
  roundRobinStandingsMode String? @map("round_robin_standings_mode") // 'live' | 'suspenseful' | null
  predictiveScoringMode String? @map("predictive_scoring_mode") // 'simple' | 'advanced' | null
  predictiveResolutionMode String? @map("predictive_resolution_mode") // 'manual' | 'vote_based' | null
  playInEnabled     Boolean  @default(false) @map("play_in_enabled")
  maxEntrants       Int?     @map("max_entrants")  // Actual entrant count (for non-power-of-two)

  predictions       Prediction[]
}
```

### Matchup Model Extensions

```prisma
model Matchup {
  // ... existing fields ...

  // NEW: Phase 7 fields
  bracketRegion     String?  @map("bracket_region")  // 'winners' | 'losers' | 'grand_finals' | null
  isBye             Boolean  @default(false) @map("is_bye")
  roundRobinRound   Int?     @map("round_robin_round")  // For round-robin: which round this matchup belongs to

  predictions       Prediction[]
}
```

## Discretionary Decisions (Claude's Recommendations)

### 1. Double-Elimination Advancement: Independent
**Recommendation:** Advance winners and losers brackets independently.
**Rationale:** Synchronized advancement forces waiting for both brackets to complete a round before proceeding, which slows the classroom experience. Independent advancement lets the teacher progress whichever bracket has resolved matchups, keeping engagement high. The losers bracket naturally lags behind the winners bracket (minor/major round alternation), so synchronization would create awkward pauses.

### 2. Predictive Scoring: Standard Doubling (1-2-4-8-16-32)
**Recommendation:** Use `Math.pow(2, round - 1)` for points per round.
**Rationale:** This is the most popular system (used by ESPN, CBS, Yahoo, NCAA.com -- 50%+ of bracket pools). It is simple to understand, makes each round equally valuable in total max points, and naturally rewards later-round accuracy. For smaller brackets (3-round), this becomes 1-2-4 which still makes the final worth 4x the first round.

### 3. Play-In Round Logic: NCAA First Four Model
**Recommendation:** Play-in round is round 0 with separate matchups. Lowest seeds play in; winners fill the lowest seed slots in the main bracket.
**Rationale:** This mirrors the real NCAA March Madness "First Four" structure. For a 64+8 bracket: seeds 61-72 play 4 play-in matches, winners take seeds 61-64 in the main bracket. The play-in toggle adds a "Round 0" tab/section before round 1.

### 4. Auto-Zoom Breakpoints
**Recommendation:** Auto-fit to viewport using SVG `viewBox` (already works). Add manual zoom controls (zoom in/out buttons + mouse wheel) for brackets with 32+ entrants. Enable pinch-to-zoom on touch devices for all bracket sizes.
**Rationale:** The existing `preserveAspectRatio="xMinYMin meet"` already auto-scales the SVG. For 32+ entrants, the matchup boxes become too small to read. The zoom wrapper adds explicit zoom in/out controls and pinch support. Breakpoints: 32+ shows zoom controls; 64+ starts at 75% zoom with a "fit to screen" button.

### 5. Round-Robin Auto-Round Generation: Circle Method
**Recommendation:** Use the circle method (polygon method / rotation algorithm) described in the Code Examples section.
**Rationale:** This is the standard algorithm used by professional sports leagues worldwide. It produces balanced schedules where each entrant plays exactly once per round, and all rounds have the same number of matchups. For N entrants: N-1 rounds (even) or N rounds (odd, with byes).

## Open Questions

1. **Losers bracket SVG layout geometry**
   - What we know: Winners bracket uses a left-to-right tree layout. Losers bracket has a fundamentally different shape (minor/major alternation means the field size doesn't halve every round -- it stays the same on major rounds).
   - What's unclear: The optimal SVG layout for the losers bracket tab. Should it mirror the winners bracket (left to right) or use a different layout? The minor/major round alternation means rounds alternate between halving and maintaining the field size.
   - Recommendation: Use the same left-to-right layout as winners bracket, but with the minor/major round structure clearly labeled. Each "column" in the SVG is one LB round. The alternating pattern is handled by the matchup positioning algorithm, not a different layout paradigm.

2. **Prediction model storage for large brackets**
   - What we know: A 64-entrant bracket has 63 matchups. 30 students predicting = 1,890 prediction rows.
   - What's unclear: Whether bulk insert performance will be an issue with the current createMany pattern.
   - Recommendation: Use `prisma.prediction.createMany()` for bulk prediction submission. Monitor performance in testing. 1,890 rows is well within Prisma/Postgres capabilities.

3. **Double-elimination total matchup count and database write volume**
   - What we know: An 8-team double-elim has 14-15 matchups. A 64-team double-elim has 126-127 matchups.
   - What's unclear: Whether `createMatchupsInTransaction` performance degrades with 127 sequential creates + 127 updates.
   - Recommendation: Profile the transaction for 64-team brackets. If slow, batch the creates with `createMany` and wire nextMatchupId in a second pass.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/bracket/engine.ts`, `types.ts`, `advancement.ts` -- verified by reading source
- Existing codebase: `src/components/bracket/bracket-diagram.tsx` -- SVG rendering patterns verified
- Existing codebase: `src/lib/gates/tiers.ts` -- tier limits already include bracket type arrays
- Existing codebase: `prisma/schema.prisma` -- current schema verified, `bracketType` field exists
- Existing codebase: `src/components/bracket/entrant-list.tsx` -- HTML5 DnD already implemented

### Secondary (MEDIUM confidence)
- [Double-elimination bracket structure](https://en.wikipedia.org/wiki/Double-elimination_tournament) -- Wikipedia (verified via multiple tournament platforms)
- [Double-elimination matchup formulas](https://abhijeetkrishnan.me/technical/double-elim-bracket-maths/) -- Mathematical analysis of bracket structure
- [Round-robin circle method](https://medium.com/coinmonks/sports-scheduling-simplified-the-power-of-the-rotation-algorithm-in-round-robin-tournament-eedfbd3fee8e) -- Algorithm description verified against multiple sources
- [NCAA bracket scoring systems](https://www.printyourbrackets.com/bracket-scoring.html) -- Scoring systems from ESPN, CBS, Yahoo documented
- [Tournament seeding placement](https://clux.dev/post/2011-03-20-tournament-seeding-placement/) -- Seeding math for power-of-two brackets
- [Losers bracket seeding (Toornament)](https://help.toornament.com/structures/introducing-the-loser-bracket) -- Rule 2 (avoid rematches) > Rule 1 (seed order)
- [NCAA First Four structure](https://www.ncaa.com/news/basketball-men/bracketiq/2025-04-16/first-four-ncaa-tournament-ultimate-guide) -- Play-in round model
- [Bye placement in tournaments](https://www.lucidchart.com/blog/tournament-brackets-101) -- Top seeds get byes, verified across multiple sources

### Tertiary (LOW confidence)
- [dnd-kit React 19 compatibility](https://github.com/clauderic/dnd-kit/issues/1654) -- Open issue, React 19 "use client" problem
- [Pragmatic-drag-and-drop React 19 support](https://github.com/atlassian/pragmatic-drag-and-drop/issues/181) -- Open issue, optional packages not compatible
- [react-svg-pan-zoom](https://www.npmjs.com/package/react-svg-pan-zoom) -- Last published a year ago, unclear React 19 support
- [Panzoom library](https://github.com/timmywil/panzoom) -- ~3.7kb, framework-agnostic, but adding a dependency for narrow use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies needed; all algorithms are well-established mathematics
- Architecture: HIGH -- Existing codebase patterns (bracket engine, DAL, actions, SVG rendering) clearly extend to new types
- Algorithms: HIGH -- Double-elim structure, circle method, bye placement are deterministic well-documented algorithms
- Schema changes: HIGH -- Prisma model extensions follow existing patterns with optional fields
- Pitfalls: HIGH -- Identified from analyzing existing code patterns and known tournament algorithm edge cases
- Pan/zoom approach: MEDIUM -- Custom implementation is straightforward but untested in this codebase; may need iteration
- Losers bracket SVG layout: MEDIUM -- Layout geometry for minor/major alternation needs prototyping

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (algorithms are timeless; library compatibility may shift)
