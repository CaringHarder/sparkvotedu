---
phase: 07-advanced-brackets
plan: 08
subsystem: bracket-dal-advancement
tags: [double-elimination, losers-bracket, grand-finals, play-in, advancement, dal]

# Dependency graph
requires:
  - phase: 07-advanced-brackets
    plan: 01
    provides: "bracketRegion field on Matchup, bracketType on Bracket, playInEnabled on Bracket"
  - phase: 07-advanced-brackets
    plan: 03
    provides: "generateDoubleElimMatchups, seedLosersFromWinnersRound from double-elim.ts"
  - phase: 07-advanced-brackets
    plan: 07
    provides: "createMatchupsInTransaction with bye auto-advancement, getSlotForPosition helper"
provides:
  - "Double-elim bracket creation in DAL with three regions (winners, losers, grand_finals)"
  - "Play-in round generation (round 0 matchups) with wiring to main bracket R1"
  - "advanceDoubleElimMatchup with loser drop, GF propagation, and dynamic reset match"
  - "Server action bracketType routing for advancement"
affects: [07-09, 07-11, 07-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Round offset for unique constraint: WB unmodified, LB offset by wbRounds, GF offset by wbRounds+lbRounds"
    - "Region-aware advancement: server action detects bracketType and routes to correct function"
    - "Split-and-reverse loser placement: computeLoserPlacement maps WB position to LB position+slot"
    - "Dynamic GF reset match: created at runtime when LB champion wins GF match 1"

key-files:
  created: []
  modified:
    - "src/lib/dal/bracket.ts"
    - "src/lib/bracket/double-elim.ts"
    - "src/lib/bracket/advancement.ts"
    - "src/actions/bracket-advance.ts"

key-decisions:
  - "Round offsets used to avoid unique constraint collisions instead of schema change"
  - "WB R1 losers fill both LB R1 slots (2 per matchup); WB R2+ losers fill entrant2 in LB major rounds"
  - "LB final -> GF uses explicit entrant2 override (not position parity) to ensure correct slot"
  - "Play-in count fixed at 8 extra entrants (4 play-in matches) for NCAA First Four model"
  - "generatePlayInRound and findR1PositionForSeed added to double-elim.ts engine"

patterns-established:
  - "bracketType routing: advanceMatchup action checks bracket.bracketType to call correct advancement function"
  - "Round offset pattern: losersRoundOffset = wbRounds, gfRoundOffset = wbRounds + lbRounds"
  - "computeLoserPlacement: WB engine round -> LB engine round -> LB DB round -> position + slot"

# Metrics
duration: 6min
completed: 2026-02-01
---

# Phase 7 Plan 08: Double-Elimination DAL & Advancement Summary

**Double-elimination bracket persistence with three-region matchup creation, play-in round support, and cross-region advancement with loser drop and dynamic grand finals reset**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-01T17:59:41Z
- **Completed:** 2026-02-01T18:06:16Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- createDoubleElimBracketDAL generates and persists matchups across winners, losers, and grand_finals regions in a single transaction
- Round offsets ensure the existing `@@unique([bracketId, round, position])` constraint works without schema changes: WB rounds unmodified, LB offset by wbRounds, GF offset by wbRounds+lbRounds
- advanceDoubleElimMatchup handles the full DE lifecycle: WB losers drop to LB via split-and-reverse seeding, WB/LB champions reach grand finals, and reset match created dynamically if LB champion wins GF match 1
- Play-in rounds generate round 0 matchups for lowest seeds with correct wiring to the WB R1 matchup positions
- Server action detects bracketType and routes to the correct advancement function

## Task Commits

1. **Task 1: Double-elim bracket creation with three regions and play-in support** - `135b4e7` (feat)
2. **Task 2: Double-elim advancement with loser drop and grand finals** - `3d418d4` (feat)

## Files Created/Modified

- `src/lib/dal/bracket.ts` -- Added createDoubleElimBracketDAL, extended createMatchupsInTransaction with extraFields and roundOffset params
- `src/lib/bracket/double-elim.ts` -- Added generatePlayInRound and findR1PositionForSeed functions
- `src/lib/bracket/advancement.ts` -- Added advanceDoubleElimMatchup, wbRoundToLbEngineRound, computeLoserPlacement helpers
- `src/actions/bracket-advance.ts` -- Updated advanceMatchup to detect bracketType and route to correct advancement function

## Decisions Made

1. **Round offsets instead of schema change:** Used round number offsets (WB unmodified, LB offset by wbRounds, GF offset by wbRounds+lbRounds) to avoid unique constraint violations rather than adding bracketRegion to the unique index. This avoids schema migration and preserves existing behavior for single-elim brackets.
2. **Explicit GF entrant2 override for LB champion:** The LB final position=1 maps to entrant1 via parity, but GF convention is WB champ=entrant1, LB champ=entrant2. The advancement function explicitly overrides the standard slot assignment for this case.
3. **WB R1 losers fill both LB R1 slots:** Since LB R1 is a minor round where WB losers play each other, each LB R1 matchup receives 2 WB losers (entrant1 and entrant2). WB R2+ losers fill only entrant2 (LB survivor comes via nextMatchupId into entrant1).
4. **Play-in count fixed at 8:** Following the NCAA First Four model (4 play-in matches, 8 extra entrants). Could be made configurable later.
5. **generatePlayInRound and findR1PositionForSeed in engine:** Added to double-elim.ts rather than DAL to keep engine logic pure and testable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Round offset approach for unique constraint**
- **Found during:** Task 1 (bracket creation)
- **Issue:** The `@@unique([bracketId, round, position])` constraint would cause violations when winners and losers bracket matchups share the same round+position values
- **Fix:** Applied round offsets at the DAL layer: LB rounds offset by wbRounds, GF rounds offset by wbRounds+lbRounds. This avoids schema changes and keeps existing single-elim behavior unchanged.
- **Files modified:** src/lib/dal/bracket.ts
- **Verification:** TypeScript compiles, all 210 tests pass
- **Committed in:** 135b4e7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Round offset approach is a clean alternative to schema modification. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - all changes are code-only, no external configuration needed.

## Next Phase Readiness

- Double-elim bracket creation and advancement ready for visualization layer (07-09)
- bracketRegion field on matchups enables region-aware SVG layout (tabbed winners/losers/GF view)
- Round offsets documented for any future code that reads matchup rounds (must account for region)
- Play-in support ready but needs UI integration in bracket creation form
- All 210 existing bracket tests pass unchanged

---
*Phase: 07-advanced-brackets*
*Completed: 2026-02-01*
