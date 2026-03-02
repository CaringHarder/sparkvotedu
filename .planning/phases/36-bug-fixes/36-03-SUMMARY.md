---
phase: 36-bug-fixes
plan: 03
subsystem: ui
tags: [react, student-ux, name-disambiguation, form]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - Simplified name collision prompt with "Name taken" message
  - Preserved returning student identity claim flow via secondary link
affects: [student-join-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [inline-disambiguation, secondary-reveal-pattern]

key-files:
  created: []
  modified:
    - src/components/student/name-disambiguation.tsx
    - src/components/student/name-entry-form.tsx

key-decisions:
  - "Primary prompt shows 'Name taken. Add your last initial to join.' with input pre-filled"
  - "Candidate list hidden behind 'Returning student? Tap here' secondary link"
  - "Exact same name resubmission blocked client-side with case-insensitive check"
  - "onNameChange callback syncs disambiguation input with parent form state"

patterns-established:
  - "Secondary reveal pattern: hide complex flows behind a link, show simple prompt by default"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 36 Plan 03: Duplicate Name Prompt Fix Summary

**Direct "Name taken" prompt replaces candidate list for first-time name collisions, with returning student flow preserved via secondary link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T11:03:17Z
- **Completed:** 2026-03-02T11:05:40Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Replaced candidate list UI with direct "Name taken. Add your last initial to join." message
- Input pre-fills with original name so student can append their initial
- Exact same name resubmission blocked with re-prompt
- Returning students can still reclaim identity via "Returning student? Tap here" secondary link

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace candidate list disambiguation with direct "Name taken" prompt** - `1980604` (fix)

Note: Task 1 changes were bundled into commit `1980604` alongside 36-05 changes from a prior execution session. The implementation is correct and complete.

## Files Created/Modified
- `src/components/student/name-disambiguation.tsx` - Rewrote to show "Name taken" prompt by default, candidate list only via "Returning student?" link
- `src/components/student/name-entry-form.tsx` - Updated disambiguation rendering to show session context and pass onNameChange callback

## Decisions Made
- Primary prompt uses `text-destructive` color class for "Name taken" message (direct, not playful tone)
- Input styling matches the parent form (same text-2xl, rounded-xl, py-4 sizing for consistency)
- Client-side blocking of exact same name (case-insensitive comparison against original firstName prop) provides instant feedback without server round-trip
- Server-side still returns duplicates for the same name, so the double-check is preserved
- "Returning student? Tap here" uses same muted underline-offset-2 styling as other secondary links in the form
- Added optional `onNameChange` prop to NameDisambiguation for parent state sync (backward-compatible, existing callers unaffected)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Task 1 changes were already committed to the repository in commit `1980604` (bundled with 36-05 changes from a prior execution). Verified the implementation matches all plan criteria. No additional commit needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Name collision UX is complete and simplified
- Student join flow preserved for both new and returning students
- No blockers for subsequent plans

## Self-Check: PASSED

- FOUND: src/components/student/name-disambiguation.tsx
- FOUND: src/components/student/name-entry-form.tsx
- FOUND: 36-03-SUMMARY.md
- FOUND: commit 1980604

---
*Phase: 36-bug-fixes*
*Completed: 2026-03-02*
