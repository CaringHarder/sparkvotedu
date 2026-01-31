---
phase: 05-polls
plan: 07
subsystem: poll-management
tags: [bug-fix, navigation, polls, uat-gap-closure]

dependency_graph:
  requires: [05-03, 05-06]
  provides: [fixed-poll-update, polls-index-page]
  affects: []

tech_stack:
  added: []
  patterns:
    - try/catch/finally for async form submit state management

file_tracking:
  key_files:
    created:
      - src/app/(dashboard)/polls/page.tsx
    modified:
      - src/components/poll/poll-form.tsx

decisions:
  - id: "05-07-01"
    description: "try/catch/finally pattern for isSubmitting state reset ensures all exit paths (success, error, exception) reset the button"
  - id: "05-07-02"
    description: "Polls index page follows exact /brackets page pattern (server component, auth guard, serialized data, grid cards)"

metrics:
  duration: "~1.3m"
  completed: "2026-01-31"
---

# Phase 5 Plan 7: UAT Gap Closure - Poll Update Hang + Polls 404 Summary

**One-liner:** Fixed poll update button infinite loading via try/finally and created /polls index page to resolve sidebar 404.

## What Was Done

### Task 1: Fix poll update button hang
- **Root cause:** `handleSubmit` in poll-form.tsx never called `setIsSubmitting(false)` on the update success path. After `router.refresh()`, the button stayed stuck in "Updating..." state permanently.
- **Fix:** Replaced individual `setIsSubmitting(false)` calls on each error path with a single `finally` block that always resets `isSubmitting` regardless of outcome (success, error return, or exception).
- **Commit:** `51db071`

### Task 2: Create /polls index page
- **Root cause:** Sidebar linked to `/polls` but only `/polls/new` and `/polls/[pollId]` pages existed -- no index page.
- **Fix:** Created `src/app/(dashboard)/polls/page.tsx` following the exact `/brackets/page.tsx` pattern: async server component with auth guard, getPollsByTeacherDAL fetch, serialized data, grid card layout with poll type/status badges, vote counts, and empty state.
- **Commit:** `0c5371b`

## UAT Tests Addressed

| UAT Test | Issue | Resolution |
|----------|-------|------------|
| Test 4 | Update Poll button stuck in "Updating..." forever | Fixed: try/finally ensures setIsSubmitting(false) on all paths |
| Test 7 | Polls sidebar link leads to 404 | Fixed: Created /polls/page.tsx index page |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **try/catch/finally over individual resets** -- Single `setIsSubmitting(false)` in `finally` is more maintainable than individual calls on each error path. If new exit paths are added later, they automatically benefit from the finally block.

2. **Polls index as dedicated list page** -- Created a full polls list page (not a redirect to /activities) because the sidebar specifically links to /polls and users expect to see their polls there.

## Verification

- TypeScript compiles with zero errors (`npx tsc --noEmit` passes clean)
- `finally` block exists in poll-form.tsx with `setIsSubmitting(false)`
- `/polls/page.tsx` exists and follows brackets page pattern
- Sidebar navigation Polls link now resolves to a working page
