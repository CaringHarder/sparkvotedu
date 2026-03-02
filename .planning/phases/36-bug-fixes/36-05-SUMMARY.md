---
phase: 36-bug-fixes
plan: 05
subsystem: ui
tags: [bracket, poll, vote-indicators, navigation, live-dashboard]

# Dependency graph
requires:
  - phase: 35-real-time-vote-indicators
    provides: "mergedVoterIds, ParticipationSidebar, currentVoterIds computation"
provides:
  - "SE/DE bracket vote indicators aggregate across voting matchups"
  - "Go Live hidden on draft activities for brackets and polls"
  - "Start auto-navigates to live dashboard for brackets and polls"
affects: [live-dashboard, bracket-detail, poll-detail, bracket-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Voter ID union across voting matchups for SE/DE brackets when no matchup selected"
    - "Start button navigates to live dashboard via router.push"

key-files:
  created: []
  modified:
    - src/components/teacher/live-dashboard.tsx
    - src/components/poll/poll-detail-view.tsx
    - src/components/bracket/bracket-detail.tsx
    - src/components/bracket/bracket-status.tsx

key-decisions:
  - "Union (not intersection) for SE/DE voter IDs -- green dot if voted on ANY matchup in current round"
  - "hasActiveVotingContext also checks for any voting matchups, not just selectedMatchupId"

patterns-established:
  - "Voter aggregation: union across voting matchups when no explicit selection"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 36 Plan 05: FIX-08/FIX-09 Summary

**SE/DE bracket vote indicators aggregate voter IDs across voting matchups; Go Live hidden on draft, Start auto-navigates to live dashboard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T11:03:14Z
- **Completed:** 2026-03-02T11:05:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SE/DE bracket vote indicators (green dots) now work by unioning voter IDs across all voting matchups in the current round when no specific matchup is selected
- Go Live button hidden on draft bracket and poll detail pages
- Clicking Start on brackets and polls activates the activity AND auto-navigates to the live dashboard

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix SE/DE bracket vote indicators by aggregating voter IDs** - `dc0201a` (fix)
2. **Task 2: Hide Go Live on draft activities and auto-navigate on Start** - `1980604` (fix)

## Files Created/Modified
- `src/components/teacher/live-dashboard.tsx` - SE/DE currentVoterIds unions across voting matchups; hasActiveVotingContext checks voting matchups
- `src/components/poll/poll-detail-view.tsx` - Go Live hidden for draft, handleStatusChange navigates to live on 'active'
- `src/components/bracket/bracket-detail.tsx` - Go Live hidden for draft brackets
- `src/components/bracket/bracket-status.tsx` - handleStatusChange navigates to live dashboard on 'active'

## Decisions Made
- Used union (not intersection) for SE/DE voter IDs when no matchup is selected -- a student gets a green dot if they voted on ANY matchup in the current round (matches user expectation of "has participated")
- Updated hasActiveVotingContext to also check for any voting matchups, ensuring the ParticipationSidebar shows voter indicators even without an explicit matchup selection
- RR intersection and Predictive prediction paths left completely unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated hasActiveVotingContext for SE/DE without selection**
- **Found during:** Task 1 (SE/DE vote indicator fix)
- **Issue:** hasActiveVotingContext was false when selectedMatchupId was null for SE/DE, which would prevent the sidebar from showing voter indicators even with the new aggregation
- **Fix:** Added `currentMatchups.some((m) => m.status === 'voting')` to the hasActiveVotingContext condition
- **Files modified:** src/components/teacher/live-dashboard.tsx
- **Verification:** TypeScript compilation passes, logic covers SE/DE without explicit selection
- **Committed in:** dc0201a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness -- without this fix, the sidebar would still not show indicators for SE/DE brackets. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All FIX-08 and FIX-09 bugs resolved
- Bracket vote indicators work for all bracket types (SE, DE, RR, Predictive)
- Go Live / Start flow consistent across brackets and polls

---
*Phase: 36-bug-fixes*
*Completed: 2026-03-02*
