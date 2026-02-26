---
phase: 26-student-activity-removal
plan: 01
subsystem: realtime, ui
tags: [supabase, broadcast, framer-motion, animatepresence, realtime, student-dashboard]

# Dependency graph
requires:
  - phase: 21-realtime-broadcast
    provides: broadcastActivityUpdate function and useRealtimeActivities hook
  - phase: 25-ux-parity
    provides: CardContextMenu with delete/archive actions on teacher dashboard
provides:
  - broadcastActivityUpdate calls in deleteBracket, archiveBracket, deletePoll, archivePoll
  - Animated card removal with 200ms fade-out on student dashboard
  - Reconnection resilience via visibilitychange and subscribe status callback
  - EmptyState variant prop for contextual empty state messaging
affects: [27-se-final-round-realtime, 28-rr-all-at-once-completion]

# Tech tracking
tech-stack:
  added: []
  patterns: [pre-read-before-cascade-delete, visibilitychange-refetch, hadActivities-state-tracking]

key-files:
  created: []
  modified:
    - src/actions/bracket.ts
    - src/actions/poll.ts
    - src/hooks/use-realtime-activities.ts
    - src/components/student/activity-grid.tsx
    - src/components/student/empty-state.tsx

key-decisions:
  - "Pre-read sessionId before DAL delete to survive cascade removal"
  - "AnimatePresence popLayout mode for smooth card reflow after removal"
  - "hadActivities state tracking to differentiate initial empty vs post-removal empty"

patterns-established:
  - "Pre-read pattern: read foreign keys before cascade-deleting rows"
  - "Visibility refetch: document.visibilitychange listener for stale tab recovery"
  - "Empty state variants: contextual messaging based on prior state"

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 26 Plan 01: Student Activity Removal Summary

**Broadcast-to-removal pipeline wiring delete/archive server actions through Supabase broadcast to animated student dashboard card exit with reconnection resilience**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T11:11:50Z
- **Completed:** 2026-02-26T11:14:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 4 missing server actions (deleteBracket, archiveBracket, deletePoll, archivePoll) now call broadcastActivityUpdate
- Student dashboard cards animate out with 200ms opacity fade when removed from activities list
- Remaining cards slide together via framer-motion layout animation
- Empty state shows contextual message ("Hang tight!" for initial, "No activities right now" for post-removal)
- Stale tab refetches on focus; dropped connection refetches on channel reconnection

## Task Commits

Each task was committed atomically:

1. **Task 1: Add broadcastActivityUpdate to delete and archive server actions** - `80aaf01` (feat)
2. **Task 2: Add animated card removal, empty state variant, and reconnection resilience** - `bdddc38` (feat)

## Files Created/Modified
- `src/actions/bracket.ts` - Added broadcastActivityUpdate to deleteBracket (pre-read sessionId) and archiveBracket (post-read sessionId)
- `src/actions/poll.ts` - Added broadcastActivityUpdate to deletePoll (pre-read sessionId) and archivePoll (uses result.sessionId)
- `src/hooks/use-realtime-activities.ts` - Added subscribe status callback and visibilitychange listener with paired cleanup
- `src/components/student/activity-grid.tsx` - AnimatePresence popLayout wrapping cards, hadActivities tracking, variant-aware empty state
- `src/components/student/empty-state.tsx` - Added variant prop ('waiting' | 'removed') with contextual heading and description

## Decisions Made
- Pre-read sessionId before DAL delete calls because cascade delete removes the row and sessionId becomes unreadable afterward
- Used AnimatePresence with popLayout mode (matching existing BracketCardList pattern) for smooth card reflow
- Tracked hadActivities via useState to differentiate "teacher hasn't added anything" vs "teacher removed everything"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Broadcast-to-removal pipeline is fully wired for delete and archive actions
- Plan 02 (verification/edge cases) can proceed if it exists
- Phase 27 (SE final round realtime) and Phase 28 (RR all-at-once completion) can proceed independently

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit 80aaf01 verified in git log
- Commit bdddc38 verified in git log

---
*Phase: 26-student-activity-removal*
*Completed: 2026-02-26*
