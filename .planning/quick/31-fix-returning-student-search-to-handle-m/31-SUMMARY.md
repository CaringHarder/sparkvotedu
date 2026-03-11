---
phase: quick-31
plan: 01
subsystem: student-lookup
tags: [bugfix, disambiguation, student-join]
dependency_graph:
  requires: []
  provides: [multi-match-current-session-handling]
  affects: [student-join-flow, returning-disambiguation]
tech_stack:
  added: []
  patterns: [filter-before-auto-reclaim]
key_files:
  created: []
  modified:
    - src/actions/student.ts
    - src/actions/__tests__/student-lookup.test.ts
decisions:
  - Use filter() instead of find() to count current-session matches before deciding behavior
metrics:
  duration: 53s
  completed: "2026-03-11T18:33:37Z"
  tasks_completed: 1
  tasks_total: 1
---

# Quick Task 31: Fix Returning Student Search to Handle Multiple Current-Session Matches

Changed lookupStudentByFirstName from find() to filter() so multiple same-firstName students in the current session get disambiguation instead of the first match being auto-reclaimed.

## What Changed

The bug: when two students named "David" existed in the same active session, `matches.find()` grabbed the first one and auto-reclaimed it, giving the wrong identity to the second David.

The fix: `matches.filter()` counts current-session matches. When exactly 1: auto-reclaim (existing behavior). When 2+: fall through to disambiguation candidates so the student can pick their identity.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add tests + fix lookupStudentByFirstName | f412bf8 | filter() instead of find(), 3 new test cases |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All 14 tests pass in `src/actions/__tests__/student-lookup.test.ts` including 3 new test cases:
- shows candidates when multiple current-session matches exist
- auto-reclaims when exactly one current-session match
- shows all candidates when multiple current-session + cross-session matches
