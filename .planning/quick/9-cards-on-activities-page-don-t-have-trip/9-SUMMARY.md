---
phase: quick-9
plan: 01
subsystem: ui
tags: [context-menu, activities, card-actions, rename, dropdown]

# Dependency graph
requires:
  - phase: card-context-menu
    provides: "CardContextMenu shared component with Rename/Edit/Copy Link/Duplicate/Archive/Delete"
provides:
  - "Triple-dot context menu on all activity cards on the Activities page"
  - "Inline rename for bracket and poll activities from Activities page"
affects: [activities-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CardContextMenu integration pattern applied to ActivityItemCard (same as BracketCard/PollCard)"

key-files:
  created: []
  modified:
    - "src/app/(dashboard)/activities/activities-list.tsx"

key-decisions:
  - "Used same div+Link wrapper pattern as BracketCard for card body clickability with absolute menu positioning"
  - "Dispatch to renameBracket or renamePoll server action based on item.type"

patterns-established:
  - "ActivityItemCard context menu: identical CardContextMenu integration as BracketCard and PollCard"

requirements-completed: [QUICK-9]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Quick Task 9: Activity Cards Context Menu Summary

**Added triple-dot CardContextMenu to activity cards on the Activities page with Rename, Edit, Copy Link, Duplicate, Archive, and Delete actions matching bracket and poll pages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T03:39:09Z
- **Completed:** 2026-02-27T03:41:08Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Activity cards on the Activities page now display a triple-dot context menu in the top-right corner
- Inline rename works for both bracket and poll items (Enter saves, Escape cancels)
- Card body remains clickable as a navigation link to the bracket/poll detail page
- All six context menu actions (Rename, Edit, Copy Link, Duplicate, Archive, Delete) are functional

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CardContextMenu and inline rename to ActivityItemCard** - `83bd165` (feat)

## Files Created/Modified
- `src/app/(dashboard)/activities/activities-list.tsx` - Added CardContextMenu integration, inline rename state management, converted outer Link to div with nested Link for card body

## Decisions Made
- Used the same `div` (outer) + `Link` (body) wrapper pattern as BracketCard to allow absolute positioning of the context menu while keeping the card body clickable
- Dispatched to `renameBracket` or `renamePoll` server action based on `item.type`, matching the existing rename patterns in BracketCard and PollCard respectively
- Used `renameValue` state for optimistic display after rename, consistent with BracketCard and PollCard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Activity cards now have full feature parity with bracket and poll cards
- No blockers or concerns

## Self-Check: PASSED

- FOUND: src/app/(dashboard)/activities/activities-list.tsx
- FOUND: .planning/quick/9-cards-on-activities-page-don-t-have-trip/9-SUMMARY.md
- FOUND: commit 83bd165

---
*Phase: quick-9*
*Completed: 2026-02-27*
