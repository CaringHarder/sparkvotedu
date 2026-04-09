---
phase: quick
plan: 260409-erc
subsystem: dashboard-navigation
tags: [navigation, consolidation, ux]
dependency_graph:
  requires: []
  provides: [sessions-redirect-to-dashboard, inline-session-creator]
  affects: [dashboard-shell, sidebar-nav, session-detail, archived-sessions]
tech_stack:
  added: []
  patterns: [server-redirect, inline-component-composition]
key_files:
  created: []
  modified:
    - src/app/(dashboard)/sessions/page.tsx
    - src/components/dashboard/sidebar-nav.tsx
    - src/components/dashboard/shell.tsx
    - src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx
    - src/app/(dashboard)/sessions/archived/page.tsx
decisions:
  - Removed Sessions nav item entirely rather than redirecting to /dashboard (avoids two items highlighting same route)
  - Removed empty state CTA button since SessionCreator is now rendered inline above
metrics:
  duration: 2min
  completed: 2026-04-09
---

# Quick Task 260409-erc: Remove Sessions List Page, Redirect to Dashboard

Consolidated session management into dashboard by replacing sessions list page with a redirect, embedding SessionCreator inline on dashboard, and updating all navigation back-links.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace sessions page with redirect and update sidebar nav | 790ec34 | sessions/page.tsx, sidebar-nav.tsx |
| 2 | Update dashboard shell and all back-links | 91b0e83 | shell.tsx, session-detail.tsx, archived/page.tsx |

## Deviations from Plan

### Skipped Files

**1. [Rule 3 - Blocking] session-workspace.tsx does not exist**
- Plan referenced `src/components/teacher/session-workspace.tsx` for a back-link update
- File does not exist in the codebase; no action needed

### Auto-fixed Issues

None.

## Verification Results

- TypeScript: No new errors introduced (pre-existing implicit-any errors unrelated to changes)
- Stale links: `grep -rn 'href="/sessions"' src/` returns zero top-level /sessions links (only sub-route references remain, which is correct)
- /sessions route preserved as redirect to /dashboard
- /sessions/[id] and /sessions/archived routes unchanged and functional

## Self-Check: PASSED

- [x] src/app/(dashboard)/sessions/page.tsx - contains redirect
- [x] src/components/dashboard/sidebar-nav.tsx - no Sessions nav item
- [x] src/components/dashboard/shell.tsx - SessionCreator inline, no stale links
- [x] src/app/(dashboard)/sessions/[sessionId]/session-detail.tsx - links to /dashboard
- [x] src/app/(dashboard)/sessions/archived/page.tsx - links to /dashboard
- [x] Commit 790ec34 exists
- [x] Commit 91b0e83 exists
