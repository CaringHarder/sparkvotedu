---
phase: 45-polish-teacher-sidebar-student-join-ux
plan: 01
subsystem: ui
tags: [react, wizard, server-actions, prisma, vitest, tdd]

# Dependency graph
requires:
  - phase: 44-teacher-sidebar-emoji-display
    provides: emoji data pipeline, teacherUpdateStudentName, nameViewDefault schema field
provides:
  - lookupStudentByFirstName server action (firstName-only cross-session lookup)
  - setNameViewDefault server action (persists teacher toggle preference)
  - ReturningConfirmation component (single-match confirmation card)
  - Extended teacherUpdateStudentName with optional lastInitial
  - findReturningByFirstName DAL function
  - DuplicateCandidate with lastInitial field
affects: [45-02-plan, teacher-sidebar, student-join-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns: [firstName-only lookup with explicit confirmation, no auto-reclaim for single match]

key-files:
  created:
    - src/components/student/join-wizard/returning-confirmation.tsx
    - src/actions/__tests__/teacher-name-view.test.ts
  modified:
    - src/types/student.ts
    - src/lib/dal/student-session.ts
    - src/actions/student.ts
    - src/components/student/join-wizard/types.ts
    - src/components/student/join-wizard/returning-name-entry.tsx
    - src/components/student/join-wizard/returning-disambiguation.tsx
    - src/components/student/join-wizard/join-wizard.tsx
    - src/actions/__tests__/student-lookup.test.ts

key-decisions:
  - "No auto-reclaim for single match in firstName-only lookup -- always show confirmation card"
  - "Impersonation guard is warning-only (does not block submission)"
  - "claimReturningIdentity reused for confirmation card claim (same API as disambiguation)"

patterns-established:
  - "firstName-only lookup returns candidates array even for single match"
  - "Wizard SET_RETURNING_CONFIRM action for single-match confirmation step"

requirements-completed: [TCHR-02]

# Metrics
duration: 5min
completed: 2026-03-09
---

# Phase 45 Plan 01: First-Name-Only Returning Flow Summary

**firstName-only returning student lookup with single-match confirmation card, setNameViewDefault action, and extended teacher edit with lastInitial**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T12:00:32Z
- **Completed:** 2026-03-09T12:05:36Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Returning students now enter only first name (no last initial required) to find their identity
- Single match shows explicit confirmation card with "That's me!" button instead of auto-reclaiming
- Multiple matches show disambiguation cards with lastInitial displayed when available
- Zero matches show "Join as new student" CTA plus "misspelled name -- try again" link
- setNameViewDefault server action persists teacher toggle preference to DB
- teacherUpdateStudentName extended with optional lastInitial parameter
- Impersonation guard warns if student already in session under different name

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 -- Create test scaffolds** - `0d8cae9` (test)
2. **Task 1: Backend -- DAL, server actions, type extensions** - `670f148` (feat)
3. **Task 2: Student wizard -- first-name-only flow with confirmation card** - `441e670` (feat)

## Files Created/Modified
- `src/types/student.ts` - Added lastInitial to DuplicateCandidate
- `src/lib/dal/student-session.ts` - Added findReturningByFirstName DAL function
- `src/actions/student.ts` - Added lookupStudentByFirstName, setNameViewDefault, extended teacherUpdateStudentName
- `src/components/student/join-wizard/types.ts` - Added returning-confirm step and SET_RETURNING_CONFIRM action
- `src/components/student/join-wizard/returning-name-entry.tsx` - Simplified to single firstName input
- `src/components/student/join-wizard/returning-confirmation.tsx` - New single-match confirmation card component
- `src/components/student/join-wizard/returning-disambiguation.tsx` - Added lastInitial display on cards
- `src/components/student/join-wizard/join-wizard.tsx` - Wired new confirmation step and updated callbacks
- `src/actions/__tests__/teacher-name-view.test.ts` - New test file for setNameViewDefault
- `src/actions/__tests__/student-lookup.test.ts` - Extended with lookupStudentByFirstName and lastInitial tests

## Decisions Made
- No auto-reclaim for single match in firstName-only lookup -- always show confirmation card (per user decision)
- Impersonation guard is warning-only, does not block submission (lightweight client-only check)
- Reused claimReturningIdentity server action for confirmation card claim (same security flow as disambiguation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added lastInitial: null to existing DuplicateCandidate constructors**
- **Found during:** Task 1 (type extension)
- **Issue:** Adding lastInitial to DuplicateCandidate interface broke existing code constructing candidates without lastInitial (lookupStudent, joinSessionByName)
- **Fix:** Added `lastInitial: null` to all existing candidate object literals
- **Files modified:** src/actions/student.ts
- **Verification:** TypeScript compiles clean
- **Committed in:** 670f148 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for type safety. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend actions (lookupStudentByFirstName, setNameViewDefault, extended teacherUpdateStudentName) ready for Plan 02 to consume
- Teacher sidebar toggle persistence and edit dialog lastInitial field can proceed
- All tests passing, TypeScript clean

## Self-Check: PASSED

All 10 files verified present. All 3 task commits verified in git log.

---
*Phase: 45-polish-teacher-sidebar-student-join-ux*
*Completed: 2026-03-09*
