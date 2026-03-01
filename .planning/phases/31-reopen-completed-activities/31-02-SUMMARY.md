---
phase: 31-reopen-completed-activities
plan: 02
subsystem: ui
tags: [react, next.js, radix-ui, lucide-react, reopen, context-menu, live-dashboard]

# Dependency graph
requires:
  - phase: 31-reopen-completed-activities/01
    provides: "reopenBracket and reopenPoll server actions, DAL functions, broadcast events"
provides:
  - "Reopen menu item in activity card context menu for completed brackets and closed polls"
  - "Reopen button on bracket live dashboard when bracket is completed"
  - "Poll live dashboard Reopen button rewired to use reopenPoll (closed->paused instead of closed->draft)"
  - "Paused status badge with orange styling on activity cards"
affects: [31.1-activity-card-layout-fix]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reopen action pattern: server action call with optimistic callback (onReopened/router.refresh)"
    - "Status-conditional menu items: render DropdownMenuItem based on activity status"

key-files:
  created: []
  modified:
    - src/components/shared/card-context-menu.tsx
    - src/app/(dashboard)/activities/activities-list.tsx
    - src/components/teacher/live-dashboard.tsx
    - src/app/(dashboard)/polls/[pollId]/live/client.tsx

key-decisions:
  - "No confirmation dialog on reopen -- landing in paused state is safe by default"
  - "Reopen menu item placed after Duplicate, before Archive separator for logical grouping"
  - "Poll Reopen button rewired from handleStatusChange(draft) to reopenPoll server action for closed->paused"

patterns-established:
  - "Reopen action callback: onReopened prop triggers router.refresh for status badge update"
  - "Status-conditional rendering: (status === 'completed' || status === 'closed') && !isArchived"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 31 Plan 02: Reopen UI Summary

**Reopen UI wired across context menu and live dashboards for both brackets and polls, with paused status badge**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T14:28:01Z
- **Completed:** 2026-03-01T14:33:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint verification)
- **Files modified:** 4

## Accomplishments
- Card context menu shows "Reopen" with RotateCcw icon for completed brackets and closed polls
- Bracket live dashboard shows Reopen button when bracket status is completed
- Poll live dashboard Reopen button now calls reopenPoll (closed->paused) instead of updatePollStatus(draft)
- Activity list statusColors map includes `paused` with orange styling matching Phase 29 conventions
- All verified via Playwright automated testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Reopen to card context menu and fix status badge colors** - `3aa219b` (feat)
2. **Task 2: Add Reopen button to bracket live dashboard and fix poll live dashboard** - `9d63aec` (feat)
3. **Task 3: Verify reopen functionality across brackets and polls** - checkpoint (human-verify, approved)

## Files Created/Modified
- `src/components/shared/card-context-menu.tsx` - Added Reopen menu item with RotateCcw icon, handleReopen function calling reopenBracket/reopenPoll
- `src/app/(dashboard)/activities/activities-list.tsx` - Added paused status color (orange) and onReopened callback
- `src/components/teacher/live-dashboard.tsx` - Added Reopen button for completed brackets with handleReopenBracket
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` - Rewired Reopen button from handleStatusChange('draft') to reopenPoll server action

## Decisions Made
- No confirmation dialog on reopen -- landing in paused state is safe by default (per user decision from planning)
- Reopen menu item placed after Duplicate, before Archive separator for logical grouping
- Poll Reopen button rewired to use dedicated reopenPoll server action instead of generic status change

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 31 (Reopen Completed Activities) is now fully complete -- both backend (31-01) and UI (31-02)
- Teachers can reopen completed brackets and closed polls from both the activities page context menu and live dashboards
- Ready for Phase 31.1 (Activity Card Layout Fix & Quick Settings Toggle)

---
*Phase: 31-reopen-completed-activities*
*Completed: 2026-03-01*
