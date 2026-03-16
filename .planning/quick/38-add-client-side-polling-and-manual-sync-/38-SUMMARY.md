---
phase: quick-38
plan: 1
subsystem: ui
tags: [polling, setInterval, sports-bracket, live-dashboard]

provides:
  - "Auto-polling useEffect for sports bracket live scores (60s interval)"
  - "Visual auto-sync indicator in sports bracket sync bar"
affects: [live-dashboard]

tech-stack:
  added: []
  patterns: [setInterval with isSyncing guard to prevent overlapping fetches]

key-files:
  created: []
  modified:
    - src/components/teacher/live-dashboard.tsx

key-decisions:
  - "isSyncing intentionally excluded from useEffect deps to avoid restarting interval on every sync cycle"

requirements-completed: [QUICK-38]

duration: <1min
completed: 2026-03-15
---

# Quick 38: Auto-polling for Sports Bracket Live Scores Summary

**60-second client-side auto-polling on sports bracket live dashboard with green pulsing indicator**

## Performance

- **Duration:** <1 min
- **Started:** 2026-03-16T01:54:08Z
- **Completed:** 2026-03-16T01:54:41Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Sports bracket live dashboard auto-polls handleManualSync every 60 seconds
- Polling only activates for sports bracket type (isSports guard)
- Overlapping sync calls prevented via isSyncing check inside interval
- Interval properly cleaned up on component unmount
- Green pulsing "Auto-sync 60s" indicator displayed in sync status bar

## Task Commits

1. **Task 1: Add auto-polling useEffect and UI indicator** - `2519132` (feat)

## Files Created/Modified
- `src/components/teacher/live-dashboard.tsx` - Added auto-poll useEffect and auto-sync indicator span

## Decisions Made
- Intentionally excluded `isSyncing` from useEffect dependency array to prevent interval restart on every sync cycle; the closure reads current value via callback pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

---
*Quick task: 38*
*Completed: 2026-03-15*
