---
phase: 04-restructure-teacher-dashboard-navigation-to-session-first-workflow
plan: 04
subsystem: ui
tags: [react, shadcn, context-menu, session-picker, dashboard]

requires:
  - phase: 04-01
    provides: simplified sidebar nav, route redirects
  - phase: 04-02
    provides: DAL functions (getSessionWithActivities, migrateOrphanActivities), duplicate actions with targetSessionId
  - phase: 04-03
    provides: SessionWorkspace tabbed interface
provides:
  - SessionPickerDialog for move/duplicate-to-session flows
  - CardContextMenu with Move and Duplicate to session options
  - DashboardSessionDropdown for quick session navigation
  - Orphan migration on dashboard load
affects: []

tech-stack:
  added: []
  patterns: [session-picker-dialog-pattern, context-menu-actions]

key-files:
  created:
    - src/components/teacher/session-picker-dialog.tsx
    - src/components/dashboard/dashboard-session-dropdown.tsx
  modified:
    - src/components/shared/card-context-menu.tsx
    - src/components/dashboard/shell.tsx
    - src/components/bracket/bracket-card.tsx
    - src/components/poll/poll-card.tsx
    - src/components/teacher/session-workspace.tsx
    - src/app/(dashboard)/sessions/[sessionId]/page.tsx

key-decisions:
  - "SessionPickerDialog uses shadcn Dialog with session list from getTeacherSessions"
  - "Orphan migration runs on dashboard shell mount via useEffect"

patterns-established:
  - "Session picker pattern: reusable dialog for selecting target session"

requirements-completed: [D-14, D-15, D-16, D-17, D-18]

duration: 5min
completed: 2026-04-08
---

# Plan 04-04: Context Menu Actions, Session Dropdown, and Orphan Migration

**Move/Duplicate-to-session context menus, dashboard session dropdown selector, and orphan activity migration on load**

## Performance

- **Duration:** 5 min
- **Tasks:** 2/3 (Task 3 is human verification checkpoint)
- **Files modified:** 8

## Accomplishments
- Card context menu includes "Move to session..." and "Duplicate to session..." with session picker dialog
- Dashboard shell replaced session cards with dropdown selector for quick navigation
- Orphan migration runs automatically on dashboard load

## Task Commits

1. **Task 1: SessionPickerDialog + CardContextMenu** - `da9cad0` (feat)
2. **Task 2: Dashboard dropdown + orphan migration** - `f18d857` (feat)
3. **Task 3: Human verification** - checkpoint (verified by user)

## Files Created/Modified
- `src/components/teacher/session-picker-dialog.tsx` - Reusable dialog for picking target session
- `src/components/dashboard/dashboard-session-dropdown.tsx` - Dropdown for quick session navigation
- `src/components/shared/card-context-menu.tsx` - Added Move/Duplicate to session actions
- `src/components/dashboard/shell.tsx` - Integrated dropdown and orphan migration
- `src/components/bracket/bracket-card.tsx` - Wired context menu actions
- `src/components/poll/poll-card.tsx` - Wired context menu actions
- `src/components/teacher/session-workspace.tsx` - Connected move/duplicate flows
- `src/app/(dashboard)/sessions/[sessionId]/page.tsx` - Updated data fetching

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered

User verification identified 3 polish items:
1. Sidebar bottom items (Analytics, Billing, Profile) require scrolling — should be pinned to viewport bottom
2. "End Session" button should require confirmation dialog
3. Dashboard session dropdown needs to be more visually prominent

These items will surface as gaps in verification.

## Next Phase Readiness
- Session-first workflow is functionally complete
- Polish items identified above should be addressed before milestone completion

---
*Phase: 04-restructure-teacher-dashboard-navigation-to-session-first-workflow*
*Completed: 2026-04-08*
