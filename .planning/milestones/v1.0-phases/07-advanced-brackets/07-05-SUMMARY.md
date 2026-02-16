---
phase: 07-advanced-brackets
plan: 05
subsystem: bracket-engine
tags: [predictive, scoring, leaderboard, tdd, pure-functions]

# Dependency graph
requires:
  - phase: 07-01
    provides: PredictionScore type in types.ts, Prediction model in schema
provides:
  - "scorePredictions() pure function for scoring student predictions against bracket outcomes"
  - "getPointsForRound() standard doubling formula (1-2-4-8-16-32)"
  - "Leaderboard sorting by total points with correct-picks tiebreaker"
affects: [07-06, 07-07, 07-08, 07-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Pure function scoring engine with Map-based matchup lookup"]

key-files:
  created:
    - src/lib/bracket/predictive.ts
    - src/lib/bracket/__tests__/predictive.test.ts
  modified: []

key-decisions:
  - "getPointsForRound takes only round number (no totalRounds param) -- standard doubling is round-independent"
  - "scorePredictions returns empty array (not error) when inputs are empty or no matchups resolve"
  - "participantName set to empty string by engine; DAL layer fills from DB on read"
  - "Tiebreaker uses correctPicks descending after totalPoints descending"

patterns-established:
  - "Pure scoring engine: no DB calls, operates on IDs only, caller provides data and fills display names"
  - "Map-based matchup lookup for O(1) resolution checking in scoring loop"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 7 Plan 5: Predictive Bracket Scoring Engine Summary

**Pure-function scoring engine with standard doubling points (1-2-4-8-16-32), per-round breakdowns, and leaderboard ranking with correct-picks tiebreaker**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T17:40:36Z
- **Completed:** 2026-02-01T17:42:33Z
- **Tasks:** 2 (RED + GREEN; REFACTOR skipped -- no cleanup needed)
- **Files created:** 2

## Accomplishments
- getPointsForRound returns standard doubling values using Math.pow(2, round - 1)
- scorePredictions scores predictions against resolved matchups with per-round breakdown
- Leaderboard sorted by total points descending, correct picks as tiebreaker
- 18 test cases covering perfect bracket, all wrong, partial results, multiple students, tiebreaker, empty inputs, and unresolved matchups

## Task Commits

Each task was committed atomically (TDD RED-GREEN cycle):

1. **RED: Failing tests for predictive scoring** - `622cd34` (test)
2. **GREEN: Implement predictive scoring engine** - `84d9f68` (feat)

_REFACTOR phase skipped: implementation was already clean and minimal (89 lines)._

## Files Created/Modified
- `src/lib/bracket/predictive.ts` - Predictive bracket scoring engine (getPointsForRound, scorePredictions)
- `src/lib/bracket/__tests__/predictive.test.ts` - 18 tests covering all plan cases (268 lines)

## Decisions Made
- getPointsForRound takes only round number, not totalRounds -- the doubling formula is round-independent (totalRounds parameter on scorePredictions is preserved for future advanced scoring modes)
- Empty inputs return empty arrays rather than throwing errors -- graceful handling for brackets with no predictions yet
- participantName is always empty string from the engine; the DAL/action layer fills display names from the database after scoring
- Tiebreaker sorts by correctPicks descending when totalPoints are equal; truly tied students appear adjacent in the array (no explicit rank number assigned -- caller can derive ranks from position)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Scoring engine ready for use by prediction DAL (07-06) and prediction server actions (07-07/07-08)
- PredictionScore type from types.ts fully utilized
- Engine is pure functions with no side effects; can be imported anywhere

---
*Phase: 07-advanced-brackets*
*Completed: 2026-02-01*
