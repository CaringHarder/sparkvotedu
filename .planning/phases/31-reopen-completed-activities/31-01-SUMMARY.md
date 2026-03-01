---
phase: 31-reopen-completed-activities
plan: 01
subsystem: api
tags: [server-actions, dal, broadcast, realtime, zod, prisma, supabase]

# Dependency graph
requires:
  - phase: 30-undo-round-advancement
    provides: "undoRoundSE/RR/DE/Predictive engine functions and getMostRecentAdvancedRound"
provides:
  - "reopenBracketDAL and reopenPollDAL data access functions"
  - "reopenBracket and reopenPoll server actions"
  - "bracket_reopened and poll_reopened broadcast event types"
  - "Realtime hook support for reopen events with celebration/reveal state reset"
affects: [31-02 reopen UI buttons, student bracket/poll views]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Bypass VALID_TRANSITIONS for reverse operations via dedicated DAL + direct prisma update"]

key-files:
  created: []
  modified:
    - src/lib/realtime/broadcast.ts
    - src/lib/utils/validation.ts
    - src/lib/dal/bracket.ts
    - src/lib/dal/poll.ts
    - src/actions/bracket-advance.ts
    - src/actions/poll.ts
    - src/hooks/use-realtime-bracket.ts
    - src/hooks/use-realtime-poll.ts
    - src/components/student/simple-voting-view.tsx
    - src/components/student/advanced-voting-view.tsx

key-decisions:
  - "Bracket reopen uses existing undo engine (undoRoundSE/RR/DE/Predictive) to clear final round, implicitly clearing champion"
  - "Poll reopen locks allowVoteChange=false to prevent already-voted students from changing votes"
  - "Bypass VALID_TRANSITIONS for completed->paused and closed->paused via direct prisma update (same pattern as unarchive)"
  - "Student voting views reset showCelebration/revealState via useEffect watching bracketCompleted"

patterns-established:
  - "Reopen pattern: dedicated DAL function with direct prisma update bypassing VALID_TRANSITIONS"
  - "Celebration reset pattern: useEffect watching bracketCompleted for false to dismiss overlays"

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 31 Plan 01: Backend Infrastructure for Reopening Summary

**DAL functions and server actions for reopening completed brackets (via undo engine) and closed polls (status transition with vote locking), with broadcast events and realtime hook fixes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T14:06:04Z
- **Completed:** 2026-03-01T14:09:56Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added reopenBracketDAL that uses Phase 30's undo engine to clear the final round and transition completed->paused
- Added reopenPollDAL that transitions closed->paused with allowVoteChange locked to false
- Added reopenBracket and reopenPoll server actions with full auth/validation/broadcast/revalidation pipeline
- Fixed realtime hooks to handle bracket_reopened and poll_reopened events with full refetch
- Fixed student voting views to reset celebration/reveal state when bracket is reopened

## Task Commits

Each task was committed atomically:

1. **Task 1: Add broadcast event types, Zod schemas, and DAL functions for reopen** - `79f84c4` (feat)
2. **Task 2: Create server actions and fix realtime hooks for reopen** - `318080d` (feat)

## Files Created/Modified
- `src/lib/realtime/broadcast.ts` - Added bracket_reopened and poll_reopened event types
- `src/lib/utils/validation.ts` - Added reopenBracketSchema and reopenPollSchema Zod schemas
- `src/lib/dal/bracket.ts` - Added reopenBracketDAL using undo engine for final-round clearing
- `src/lib/dal/poll.ts` - Added reopenPollDAL for closed->paused transition with vote locking
- `src/actions/bracket-advance.ts` - Added reopenBracket server action
- `src/actions/poll.ts` - Added reopenPoll server action
- `src/hooks/use-realtime-bracket.ts` - Added bracket_reopened/round_undone event handling, bracketCompleted reset
- `src/hooks/use-realtime-poll.ts` - Added poll_reopened event handling
- `src/components/student/simple-voting-view.tsx` - Added celebration/reveal reset on bracketCompleted false
- `src/components/student/advanced-voting-view.tsx` - Added celebration/reveal/hasShownRevealRef reset on bracketCompleted false

## Decisions Made
- Bracket reopen reuses Phase 30's undo engine functions (undoRoundSE/RR/DE/Predictive) rather than writing new clearing logic -- champion is implicitly cleared by clearing the final matchup's winnerId
- Poll reopen sets allowVoteChange=false to enforce "already-voted students locked out" per user decision from CONTEXT.md
- Used direct prisma update to bypass VALID_TRANSITIONS for completed->paused and closed->paused, following established unarchive pattern
- Added round_undone to the bracket realtime event handler (was missing, discovered during implementation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend infrastructure for reopen is in place
- Plan 31-02 can now build the teacher UI (reopen buttons) that calls these server actions
- Broadcast events will automatically notify student clients when reopen happens

## Self-Check: PASSED

All 10 files verified present. Both commit hashes (79f84c4, 318080d) confirmed in git history.

---
*Phase: 31-reopen-completed-activities*
*Completed: 2026-03-01*
