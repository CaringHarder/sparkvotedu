---
phase: "49"
plan: 1
subsystem: api
tags: [sports-bracket, ncaa, matchup-ordering, seed-positioning]

requires:
  - phase: 40-fix-ncaa-bracket-matchup-ordering
    provides: SEED_TO_R1_POSITION map, wireMatchupAdvancement
provides:
  - Seed-based R2-R4 position assignment during import
  - repairBracketAdvancement function for existing bracket repair
affects: [sports-sync, bracket-import, cron-sports-sync]

tech-stack:
  added: []
  patterns: [seed-derived position formula for multi-round brackets]

key-files:
  created: []
  modified:
    - src/lib/dal/sports.ts
    - src/actions/sports.ts
    - src/app/api/cron/sports-sync/route.ts

key-decisions:
  - "Used finalFourPairing field directly from bracket model instead of settings JSON"
  - "Applied repair to cron route in addition to manual sync for completeness"

requirements-completed: [FIX-SWEET16-ORDERING]

duration: 3min
completed: 2026-03-23
---

# Quick Task 49: Fix Sweet 16 Bracket Matchup Ordering Summary

**Seed-based R2-R4 position assignment replaces broken sequential counter, with auto-repair for existing brackets on next sync**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T13:25:02Z
- **Completed:** 2026-03-23T13:27:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- SEED_TO_R1_POSITION expanded to all 16 seeds (both teams in each matchup pair)
- R2-R4 matchups now derive positions from team seeds using `ceil(r1Pos / 2^(round-1))`
- repairBracketAdvancement function recalculates positions, clears and rebuilds wiring, re-propagates winners
- Repair runs before every sync (manual and cron) so existing brackets self-heal

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand seed map and fix R2-R4 position assignment during import** - `91afbb5` (fix)
2. **Task 2: Add repairBracketAdvancement function and wire into sync** - `b4654c0` (feat)

## Files Created/Modified
- `src/lib/dal/sports.ts` - Expanded SEED_TO_R1_POSITION to 16 seeds, added seed-based R2-R4 position logic, added repairBracketAdvancement export
- `src/actions/sports.ts` - Import and call repairBracketAdvancement before syncBracketResults in triggerSportsSync
- `src/app/api/cron/sports-sync/route.ts` - Import and call repairBracketAdvancement before syncBracketResults in cron sync

## Decisions Made
- Used `finalFourPairing` field directly from Bracket model instead of a `settings` JSON field (plan referenced `settings` which doesn't exist on the model)
- Added separate `regionPositionCounters` map (string keys) to avoid type collision with existing `positionCounters` map (number keys)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added repair to cron sports-sync route**
- **Found during:** Task 2
- **Issue:** Plan only specified wiring repair into `triggerSportsSync` (manual sync), but the cron route at `src/app/api/cron/sports-sync/route.ts` also calls `syncBracketResults` directly without repair
- **Fix:** Added `repairBracketAdvancement` import and call to cron route before `syncBracketResults`
- **Files modified:** src/app/api/cron/sports-sync/route.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** b4654c0 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed settings field reference to finalFourPairing**
- **Found during:** Task 2
- **Issue:** Plan referenced `bracket.settings` which doesn't exist on the Prisma Bracket model; TypeScript compilation error
- **Fix:** Changed select to use `finalFourPairing` field directly from bracket model
- **Files modified:** src/lib/dal/sports.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** b4654c0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## Known Stubs
None

## Next Phase Readiness
- Sweet 16, Elite Eight, and Regional Final matchups will display in correct bracket order
- Existing brackets with wrong ordering will self-repair on next sync cycle

---
*Quick Task: 49*
*Completed: 2026-03-23*
