---
phase: 35-real-time-vote-indicators
plan: 02
subsystem: ui
tags: [react, supabase, realtime, hooks, participation-sidebar]

# Dependency graph
requires:
  - phase: 35-real-time-vote-indicators
    plan: 01
    provides: "participantId in broadcast payloads, voterIds in polling APIs"
provides:
  - "voterIds tracking in useRealtimeBracket hook (per-matchup + predictions)"
  - "mergedVoterIds computation in live-dashboard (initial + realtime union)"
  - "RR intersection logic for ALL-matchup-voted green dot"
  - "Not-voted-first sidebar sort order"
  - "hasActiveVotingContext prop for sidebar vote summary gating"
affects: [35-03, 35-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["mergedVoterIds union pattern for initial + realtime voter data", "hasActiveVotingContext prop for bracket-type-aware UI gating", "Set intersection for RR all-matchup-voted check"]

key-files:
  created: []
  modified:
    - "src/hooks/use-realtime-bracket.ts"
    - "src/components/teacher/live-dashboard.tsx"
    - "src/components/teacher/participation-sidebar.tsx"

key-decisions:
  - "Not-voted students sort to top of sidebar (aVoted - bVoted comparator)"
  - "Green dots always visible based on voterIds (no selectedMatchupId gate)"
  - "hasActiveVotingContext prop defaults true for backward compat with poll live page"
  - "RR intersection: student must vote on ALL round matchups for green dot"
  - "Predictive brackets use special 'predictions' key in voterIds map"
  - "Removed realtimeExcess heuristic -- replaced with accurate mergedVoterIds"
  - "Preserve 'predictions' key in setVoterIds during fetchBracketState to avoid overwriting prediction data"

patterns-established:
  - "mergedVoterIds: union of initial server data + realtime broadcast data for live-updating voter tracking"
  - "hasActiveVotingContext: bracket-type-aware boolean prop for conditional UI rendering"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 35 Plan 02: Bracket Vote Indicators Summary

**Real-time voterIds in bracket hook with merged initial+realtime data, not-voted-first sidebar sort, RR intersection logic, and predictive prediction tracking**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T04:32:45Z
- **Completed:** 2026-03-02T04:37:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useRealtimeBracket hook now accumulates voterIds per matchup from vote_update broadcast events, extracts voterIds from fetchBracketState API, and tracks prediction submitters
- Live dashboard computes mergedVoterIds (union of initial + realtime) and derives currentVoterIds per bracket type: SE/DE per-matchup, RR intersection, predictive predictions
- Participation sidebar sorts not-voted students to the top and shows green dots without requiring selectedMatchupId gate
- VoteProgressBar now uses accurate live-updating mergedVoterIds (realtimeExcess heuristic removed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add voterIds tracking to useRealtimeBracket hook** - `d562891` (feat)
2. **Task 2: Wire realtime voterIds into live-dashboard and fix sidebar sort order** - `cbe2dd4` (feat)

## Files Created/Modified
- `src/hooks/use-realtime-bracket.ts` - Added voterIds state, pendingVoterUpdates ref, voter accumulation in vote_update handler, voterIds extraction in fetchBracketState, prediction_status_changed handler, structural event reset
- `src/components/teacher/live-dashboard.tsx` - Destructured realtimeVoterIds from hook, computed mergedVoterIds and currentVoterIds per bracket type, added hasActiveVotingContext, replaced realtimeExcess heuristic with mergedVoterIds
- `src/components/teacher/participation-sidebar.tsx` - Reversed sort order (not-voted first), removed selectedMatchupId gates on dot/tile styling, added hasActiveVotingContext prop

## Decisions Made
- Not-voted students sort to top via `aVoted - bVoted` comparator (reversed from original `bVoted - aVoted`)
- Green dots always render based on voterIds -- no selectedMatchupId gate on dot rendering
- hasActiveVotingContext prop defaults to true for backward compatibility with poll live page that passes poll.id as selectedMatchupId
- RR intersection logic: student must appear in ALL matchup voter sets for the current RR round to get green dot
- Predictive brackets use special 'predictions' key in voterIds map, preserved during fetchBracketState
- Removed realtimeExcess heuristic entirely -- mergedVoterIds already contains union of initial + realtime voter IDs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved currentVoterIds useMemo after currentRoundRobinRound declaration**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** currentVoterIds useMemo referenced currentRoundRobinRound which was declared later in the component, causing TS2448 block-scoped variable used before declaration
- **Fix:** Moved currentVoterIds and hasActiveVotingContext declarations from line 505 to after line 784 (after currentRoundRobinRound and canAdvanceRoundRobin)
- **Files modified:** src/components/teacher/live-dashboard.tsx
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** cbe2dd4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Variable ordering fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the variable ordering fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 35-03 (poll vote indicators) and 35-04 (visual polish) can now build on the established patterns
- mergedVoterIds pattern is ready to replicate for poll live dashboard
- hasActiveVotingContext prop established for sidebar vote summary gating

## Self-Check: PASSED

All 3 modified files exist on disk. Both task commits (d562891, cbe2dd4) verified in git log.

---
*Phase: 35-real-time-vote-indicators*
*Completed: 2026-03-02*
