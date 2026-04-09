---
phase: quick
plan: 260409-ecx
subsystem: dashboard
tags: [session-dropdown, ux-fix]
key-files:
  created: []
  modified:
    - src/components/dashboard/shell.tsx
    - src/app/(dashboard)/sessions/page.tsx
decisions:
  - "Alphabetical sort by name using localeCompare for consistent cross-locale ordering"
metrics:
  duration: "2min"
  completed: "2026-04-09"
  tasks: 2
  files: 2
---

# Quick Task 260409-ecx: Fix Session Dropdown to Show All Sessions Summary

Removed `.slice(0, 6)` from session dropdown data in both dashboard shell and sessions page, and added alphabetical sorting by session name for the dropdown.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix shell.tsx -- dropdown gets all sessions alphabetically | 2a20353 | src/components/dashboard/shell.tsx |
| 2 | Fix sessions/page.tsx -- dropdown gets all sessions, cards unchanged | edb8b24 | src/app/(dashboard)/sessions/page.tsx |

## Changes Made

### shell.tsx
- Added `dropdownSessions` sorted alphabetically by name
- Replaced `activeSessions.slice(0, 6).map(...)` with `dropdownSessions.map(...)` for the DashboardSessionDropdown prop

### sessions/page.tsx
- Removed `.slice(0, 6)` from `activeSessions` filter so all active sessions are available
- Added `dropdownSessions` sorted alphabetically by name
- Passed `dropdownSessions` to DashboardSessionDropdown instead of `activeSessions`
- Session cards grid unchanged (still shows all sessions)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without new errors (pre-existing implicit `any` errors in filter/map callbacks are unrelated)
- No `.slice(0, 6)` on dropdown data in either file
- Both dropdowns receive alphabetically sorted sessions
- Session card grid on sessions page still shows all sessions

## Self-Check: PASSED
