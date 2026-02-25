---
phase: 25-ux-parity
plan: 04
subsystem: ui
tags: [next.js, archive, server-actions, prisma, react]

# Dependency graph
requires:
  - phase: 25-01
    provides: "Card context menu with archive action"
  - phase: 25-02
    provides: "DeleteConfirmDialog shared component"
provides:
  - "/brackets/archived page with recover and permanent delete"
  - "/polls/archived page with recover and permanent delete"
  - "getArchivedBracketsDAL and getArchivedPollsDAL DAL functions"
  - "unarchiveBracketDAL, unarchivePollDAL bypass-transition DAL functions"
  - "deleteBracketPermanentlyDAL, deletePollPermanentlyDAL DAL functions"
  - "unarchiveBracket, deleteBracketPermanently server actions"
  - "unarchivePoll, deletePollPermanently server actions"
  - "Navigation links from main bracket/poll list pages to archive views"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Archive view pattern: server page + client card list with recover/delete"
    - "Bypass transition for unarchive (same as sessions pattern)"

key-files:
  created:
    - src/app/(dashboard)/brackets/archived/page.tsx
    - src/app/(dashboard)/brackets/archived/archived-brackets-client.tsx
    - src/app/(dashboard)/polls/archived/page.tsx
    - src/app/(dashboard)/polls/archived/archived-polls-client.tsx
  modified:
    - src/lib/dal/bracket.ts
    - src/lib/dal/poll.ts
    - src/actions/bracket.ts
    - src/actions/poll.ts
    - src/app/(dashboard)/brackets/page.tsx
    - src/app/(dashboard)/polls/page.tsx

key-decisions:
  - "Unarchived brackets transition to 'completed' status (safe terminal state)"
  - "Unarchived polls transition to 'closed' status (poll equivalent of completed)"
  - "Unarchive bypasses VALID_TRANSITIONS map intentionally (same as sessions pattern)"
  - "Used shared DeleteConfirmDialog for permanent delete confirmation"

patterns-established:
  - "Archive view pattern consistent across sessions, brackets, and polls"

requirements-completed: [UXP-01]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 25 Plan 04: Archive Views for Brackets and Polls Summary

**Archive view pages for brackets and polls with recover (unarchive) and permanent delete, following the sessions archive pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T18:30:10Z
- **Completed:** 2026-02-25T18:33:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created /brackets/archived and /polls/archived pages with full CRUD archive management
- Added 6 DAL functions and 4 server actions for archive view operations
- Added "Archived" navigation links to both main list pages for seamless navigation
- All patterns match the established sessions/archived page for consistent UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DAL functions and server actions for archive view operations** - `debc22b` (feat)
2. **Task 2: Create archive pages and add navigation links from main list pages** - `dfc94cc` (feat)

## Files Created/Modified
- `src/lib/dal/bracket.ts` - Added getArchivedBracketsDAL, unarchiveBracketDAL, deleteBracketPermanentlyDAL
- `src/lib/dal/poll.ts` - Added getArchivedPollsDAL, unarchivePollDAL, deletePollPermanentlyDAL
- `src/actions/bracket.ts` - Added unarchiveBracket, deleteBracketPermanently server actions
- `src/actions/poll.ts` - Added unarchivePoll, deletePollPermanently server actions
- `src/app/(dashboard)/brackets/archived/page.tsx` - Server component for archived brackets page
- `src/app/(dashboard)/brackets/archived/archived-brackets-client.tsx` - Client component with recover/delete cards
- `src/app/(dashboard)/polls/archived/page.tsx` - Server component for archived polls page
- `src/app/(dashboard)/polls/archived/archived-polls-client.tsx` - Client component with recover/delete cards
- `src/app/(dashboard)/brackets/page.tsx` - Added Archive navigation link in header
- `src/app/(dashboard)/polls/page.tsx` - Added Archive navigation link in header

## Decisions Made
- Unarchived brackets transition to 'completed' (safest terminal state -- bracket was live before archiving)
- Unarchived polls transition to 'closed' (poll equivalent of completed terminal state)
- Unarchive functions bypass VALID_TRANSITIONS map, validating via status: 'archived' in where clause instead (same pattern as sessions)
- Used shared DeleteConfirmDialog from @/components/shared/ for permanent delete confirmation (not the session-specific one from @/components/teacher/)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed type error in recover error handling**
- **Found during:** Task 2 (archive page creation)
- **Issue:** `result.error` could be `string | undefined`, which is not assignable to `SetStateAction<string | null>`
- **Fix:** Added nullish coalescing: `('error' in result ? result.error : null) ?? 'Failed to recover ...'`
- **Files modified:** archived-brackets-client.tsx, archived-polls-client.tsx
- **Verification:** Build passes cleanly
- **Committed in:** dfc94cc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Type safety fix for correct error handling. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Archive views complete for all three entity types (sessions, brackets, polls)
- Phase 25 UX parity features are now complete
- Ready to proceed to Phase 26 (student activity removal)

## Self-Check: PASSED

- All 4 created files verified on disk
- Commit debc22b (Task 1) verified in git log
- Commit dfc94cc (Task 2) verified in git log
- Build passes with no errors

---
*Phase: 25-ux-parity*
*Completed: 2026-02-25*
