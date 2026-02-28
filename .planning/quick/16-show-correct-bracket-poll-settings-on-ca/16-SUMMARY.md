---
phase: quick-16
plan: 01
subsystem: ui
tags: [bracket, viewingMode, badge, conditional-rendering]

# Dependency graph
requires:
  - phase: quick-13
    provides: activity-metadata-bar shared component with bracket/poll badges
provides:
  - viewingMode badge gated behind single_elimination bracketType check
affects: [bracket-card, activity-metadata-bar, activities-list]

# Tech tracking
tech-stack:
  added: []
  patterns: [bracketType-gated conditional badge rendering]

key-files:
  created: []
  modified:
    - src/components/bracket/bracket-card.tsx
    - src/components/shared/activity-metadata-bar.tsx
    - src/app/(dashboard)/activities/activities-list.tsx

key-decisions:
  - "Guard viewingMode badge with bracketType === 'single_elimination' rather than removing viewingMode prop entirely, preserving API for future use"

patterns-established:
  - "Badge guards: bracket-type-specific badges use explicit bracketType check before rendering"

requirements-completed: [QUICK-16]

# Metrics
duration: 1min
completed: 2026-02-28
---

# Quick Task 16: Show Correct Bracket/Poll Settings on Cards Summary

**Guard viewingMode (Simple/Advanced) badge behind bracketType === 'single_elimination' check across all three UI surfaces**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T22:59:36Z
- **Completed:** 2026-02-28T23:00:11Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- ViewingMode badge (Eye icon + Simple/Advanced text) now only renders for single_elimination brackets
- Double elimination, round robin, predictive, and sports brackets no longer show misleading "Advanced" badge
- All other badges (pacing, prediction mode, sport gender, status) remain unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard viewingMode badge with single_elimination check** - `62335a3` (fix)

## Files Created/Modified
- `src/components/bracket/bracket-card.tsx` - Added `bracket.bracketType === 'single_elimination'` guard to viewingMode badge (line 182)
- `src/components/shared/activity-metadata-bar.tsx` - Added `bracketType === 'single_elimination'` guard to viewingMode badge (line 66)
- `src/app/(dashboard)/activities/activities-list.tsx` - Added `item.meta.bracketType === 'single_elimination'` guard to viewingMode badge (line 327)

## Decisions Made
- Used explicit `bracketType === 'single_elimination'` guard rather than removing the viewingMode prop/data, keeping the data pipeline intact for potential future use by other bracket types

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ViewingMode badge correctly scoped to single_elimination brackets
- No follow-up work needed

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit 62335a3 found in git log
- single_elimination guard pattern confirmed in all 3 files (1 match each)
- TypeScript compilation passes with no errors

---
*Quick Task: 16-show-correct-bracket-poll-settings-on-ca*
*Completed: 2026-02-28*
