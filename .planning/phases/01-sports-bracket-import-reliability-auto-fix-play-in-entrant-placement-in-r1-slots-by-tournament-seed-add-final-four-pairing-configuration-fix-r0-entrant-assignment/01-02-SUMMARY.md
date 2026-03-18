---
phase: 01-sports-bracket-import-reliability
plan: 02
subsystem: api
tags: [sports, bracket, server-actions, play-in, final-four, pairing, sync]

requires:
  - phase: 01-sports-bracket-import-reliability
    provides: DAL foundation with warning collection, wireMatchupAdvancement pairing support, pairings utility
provides:
  - importTournament returns warnings to client
  - Play-in resolution in syncBracketResults replaces combined entrants with winners
  - updateBracketSettings handles finalFourPairing with R4->R5 re-wiring and prediction warning
  - repairBracketLinkage respects stored finalFourPairing
  - getSlotByFeederOrder exported for cross-module reuse
affects: [01-03-PLAN, bracket-settings-ui, sports-bracket-sync]

tech-stack:
  added: []
  patterns: [play-in-resolution-pattern, pairing-rewiring-pattern]

key-files:
  created: []
  modified:
    - src/actions/sports.ts
    - src/actions/bracket.ts
    - src/lib/dal/sports.ts

key-decisions:
  - "Exported getSlotByFeederOrder from DAL for reuse in bracket settings re-wiring"
  - "Clear R5 entrant slots before re-wiring to avoid stale winner placements"
  - "Play-in resolution filters on externalTeamId IS NULL to ensure idempotent updates"

patterns-established:
  - "Play-in resolution pattern: on sync, check R0 closed games and replace combined entrants with actual winners using abbreviation match"
  - "Pairing re-wire pattern: clear R4 links + R5 slots, re-wire, then re-propagate R4 winners into new R5 positions"

requirements-completed: []

duration: 2min
completed: 2026-03-18
---

# Phase 01 Plan 02: Server Actions + Play-in Resolution Summary

**Import warnings returned to client, play-in auto-resolution on sync, and Final Four pairing re-wiring with prediction warning in settings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T00:44:39Z
- **Completed:** 2026-03-18T00:46:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- importTournament now returns warnings array alongside bracket data for UI surfacing
- syncBracketResults resolves play-in combined entrants (e.g., "TEX/NCSU") to actual winners on R0 game completion
- updateBracketSettings handles finalFourPairing changes: clears R4 links, re-wires via wireMatchupAdvancement, checks for R5+ predictions, re-propagates R4 winners to R5 slots
- repairBracketLinkage passes stored finalFourPairing to wireMatchupAdvancement for correct R4->R5 wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: Update import action and add play-in resolution to sync** - `10fe9c2` (feat)
2. **Task 2: Add updateFinalFourPairing action with re-wiring and prediction warning** - `c582114` (feat)

## Files Created/Modified
- `src/actions/sports.ts` - importTournament now returns warnings to client
- `src/actions/bracket.ts` - updateBracketSettings handles pairing re-wiring + prediction warning; repairBracketLinkage passes finalFourPairing
- `src/lib/dal/sports.ts` - Play-in resolution in syncBracketResults; exported getSlotByFeederOrder

## Decisions Made
- Exported getSlotByFeederOrder from sports DAL so bracket.ts can reuse it for R4 winner re-propagation
- Clear both R4 nextMatchupId and R5 entrant slots before re-wiring to avoid stale data
- Play-in resolution uses externalTeamId IS NULL + abbreviation contains match for idempotent combined-entrant replacement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported getSlotByFeederOrder for cross-module use**
- **Found during:** Task 2 (pairing re-wiring implementation)
- **Issue:** getSlotByFeederOrder was a private function in sports.ts but needed by bracket.ts for R4 winner re-propagation
- **Fix:** Added export keyword to the function
- **Files modified:** src/lib/dal/sports.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** c582114 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Clear R5 entrant slots before re-wiring**
- **Found during:** Task 2 (pairing re-wiring implementation)
- **Issue:** Plan didn't specify clearing R5 entrant slots -- without this, old R4 winners would remain in wrong R5 positions after re-wiring
- **Fix:** Added updateMany to null out entrant1Id/entrant2Id on R5 matchups before re-wire + re-propagate
- **Files modified:** src/actions/bracket.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** c582114 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server actions complete for Plan 03 (R0 entrant assignment fix and UI)
- Play-in resolution logic ready for live sync testing
- Pairing re-wiring ready for bracket settings UI integration

---
*Phase: 01-sports-bracket-import-reliability*
*Completed: 2026-03-18*
