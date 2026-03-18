---
phase: 01-sports-bracket-import-reliability
plan: 01
subsystem: api
tags: [prisma, sports, ncaa, bracket, dal, validation]

requires:
  - phase: none
    provides: existing sports DAL and Prisma schema
provides:
  - finalFourPairing column on Bracket model
  - pairings.ts utility (getFinalFourPairings, parsePairing, detectDefaultPairing)
  - Warning collection in createSportsBracketDAL
  - Auto-fix position collision logic in R1 seed placement
  - Pairing-aware R4->R5 wiring in wireMatchupAdvancement
affects: [01-02-PLAN, 01-03-PLAN, sports-bracket-ui, bracket-settings]

tech-stack:
  added: []
  patterns: [warning-collection-pattern, auto-fix-fallback-pattern]

key-files:
  created:
    - src/lib/sports/pairings.ts
  modified:
    - prisma/schema.prisma
    - src/lib/dal/sports.ts
    - src/lib/utils/validation.ts
    - src/actions/sports.ts
    - src/actions/bracket.ts

key-decisions:
  - "Used region-based Set tracking for position collision detection rather than global counter"
  - "Auto-detect Final Four pairing from ESPN R5 game data via previousHome/AwayGameId links"
  - "Changed createSportsBracketDAL return type to { bracket, warnings } for upstream consumption"

patterns-established:
  - "Warning collection pattern: accumulate string[] warnings during import, log server-side, return to caller"
  - "Auto-fix pattern: detect position collisions and silently correct with next-available-slot fallback"

requirements-completed: []

duration: 3min
completed: 2026-03-18
---

# Phase 01 Plan 01: Schema + DAL Foundation Summary

**finalFourPairing schema field, pairings utility with 3-option generation, and DAL warning collection with auto-fix position collision logic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T00:38:58Z
- **Completed:** 2026-03-18T00:42:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added finalFourPairing nullable column to Bracket model with Prisma db push
- Created pairings.ts utility with getFinalFourPairings (3 options for 4 regions), parsePairing, and detectDefaultPairing
- Implemented warning collection in createSportsBracketDAL for missing seeds, unexpected seeds, position collisions, and incomplete play-in data
- Added auto-fix logic for R1 seed/position collisions using next-available-slot fallback per region
- Updated wireMatchupAdvancement with optional finalFourPairing parameter for region-based R4->R5 wiring
- Auto-detect Final Four pairing from ESPN game data and save to bracket on import

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + pairings utility** - `20ea29a` (feat)
2. **Task 2: DAL warning collection, auto-fix, and pairing-aware wiring** - `7c9b2a6` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added finalFourPairing column to Bracket model
- `src/lib/sports/pairings.ts` - New pairings utility with FinalFourPairing type and 4 exported functions
- `src/lib/utils/validation.ts` - Added finalFourPairing to updateBracketSettingsSchema
- `src/lib/dal/sports.ts` - Warning collection, auto-fix position collisions, pairing-aware wiring, new return type
- `src/actions/sports.ts` - Updated importTournament for new DAL return type { bracket, warnings }
- `src/actions/bracket.ts` - Added finalFourPairing to updateBracketSettings action

## Decisions Made
- Used per-region Set-based position tracking for collision detection instead of global counters
- Auto-detect Final Four pairing from ESPN R4/R5 game relationship data (previousHomeGameId/previousAwayGameId)
- Changed createSportsBracketDAL return type to { bracket, warnings } -- callers updated accordingly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated importTournament action for new return type**
- **Found during:** Task 2 (DAL return type change)
- **Issue:** createSportsBracketDAL return type changed from bracket to { bracket, warnings }, breaking src/actions/sports.ts
- **Fix:** Updated caller to destructure result.bracket instead of result directly
- **Files modified:** src/actions/sports.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 7c9b2a6 (Task 2 commit)

**2. [Rule 3 - Blocking] Updated updateBracketSettings action for finalFourPairing**
- **Found during:** Task 1 (validation schema update)
- **Issue:** finalFourPairing added to schema but not destructured/applied in updateBracketSettings action
- **Fix:** Added finalFourPairing to destructured fields and updateData builder
- **Files modified:** src/actions/bracket.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 7c9b2a6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness -- callers must handle new return type and new field. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema and DAL foundation complete for plans 02 (server actions + UI) and 03 (R0 entrant fix)
- wireMatchupAdvancement now supports pairing-aware wiring
- Warning collection ready for UI surfacing in plan 02

---
*Phase: 01-sports-bracket-import-reliability*
*Completed: 2026-03-18*
