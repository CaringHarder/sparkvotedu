---
phase: 25-ux-parity
plan: 01
subsystem: ui, api
tags: [radix, dropdown-menu, dialog, server-actions, prisma, context-menu]

# Dependency graph
requires: []
provides:
  - renameBracket, duplicateBracket, archiveBracket server actions
  - renamePoll, archivePoll server actions
  - renameBracketDAL, duplicateBracketDAL, archiveBracketDAL DAL functions
  - renamePollDAL DAL function
  - CardContextMenu shared component (6 menu items)
  - DeleteConfirmDialog shared component (with live warning)
  - archived status support in bracket and poll VALID_TRANSITIONS
affects: [25-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared component pattern: reusable components in src/components/shared/ that work for both poll and bracket item types"
    - "CardContextMenu calls server actions directly via useTransition for async operations"

key-files:
  created:
    - src/components/shared/card-context-menu.tsx
    - src/components/shared/delete-confirm-dialog.tsx
  modified:
    - src/lib/dal/bracket.ts
    - src/lib/dal/poll.ts
    - src/actions/bracket.ts
    - src/actions/poll.ts

key-decisions:
  - "CardContextMenu uses onStartRename callback prop (parent card handles inline edit UI, matching editable-session-name.tsx pattern)"
  - "Archive menu item is hidden when status is already archived"
  - "DeleteConfirmDialog uses amber color for live impact warning (not red, to differentiate from destructive action)"

patterns-established:
  - "CardContextMenu: single component handles both poll and bracket card operations via itemType prop"
  - "DeleteConfirmDialog: generic delete confirmation with conditional isLive warning paragraph"

requirements-completed: [UXP-01]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 25 Plan 01: Backend Infrastructure & Shared Components Summary

**Rename/duplicate/archive server actions for both polls and brackets, plus shared CardContextMenu and DeleteConfirmDialog components using Radix primitives**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T03:45:54Z
- **Completed:** 2026-02-25T03:48:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All 5 new server actions (renameBracket, duplicateBracket, archiveBracket, renamePoll, archivePoll) and their DAL functions implemented and compiling
- Both VALID_TRANSITIONS maps updated to include 'archived' from all active states
- CardContextMenu component with all 6 menu items (Rename, Edit, Copy Link, Duplicate, Archive, Delete) using Radix DropdownMenu
- DeleteConfirmDialog component with conditional live impact warning using Radix Dialog
- duplicateBracketDAL correctly clones bracket + entrants but not matchups/votes/predictions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing DAL functions and server actions** - `b8e2948` (feat)
2. **Task 2: Create shared CardContextMenu and DeleteConfirmDialog** - `af0daa9` (feat)

## Files Created/Modified
- `src/lib/dal/bracket.ts` - Added renameBracketDAL, duplicateBracketDAL, archiveBracketDAL; updated VALID_TRANSITIONS with archived state
- `src/lib/dal/poll.ts` - Added renamePollDAL; updated VALID_POLL_TRANSITIONS with archived from draft/active
- `src/actions/bracket.ts` - Added renameBracket, duplicateBracket, archiveBracket server actions with auth/validation
- `src/actions/poll.ts` - Added renamePoll, archivePoll server actions with auth/validation
- `src/components/shared/card-context-menu.tsx` - Unified context menu for both poll and bracket cards with 6 actions
- `src/components/shared/delete-confirm-dialog.tsx` - Generic delete confirmation dialog with conditional live warning

## Decisions Made
- Used `onStartRename` callback prop on CardContextMenu instead of inline rename UI -- lets the parent card component handle the edit UX following the editable-session-name.tsx pattern
- Archive menu item is conditionally hidden when item is already archived (no sense in archiving twice)
- Used amber text color for live impact warning in DeleteConfirmDialog to differentiate from the red destructive action buttons

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend infrastructure ready for Plan 02 to integrate CardContextMenu into bracket-card.tsx and poll-card.tsx
- Server actions are exported and ready to be called from the card components
- Components are in src/components/shared/ for easy import

## Self-Check: PASSED

All 6 files verified present. Both task commits (b8e2948, af0daa9) verified in git history.

---
*Phase: 25-ux-parity*
*Completed: 2026-02-25*
