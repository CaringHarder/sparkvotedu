---
phase: 32-settings-editing
plan: 04
subsystem: ui
tags: [react, supabase, realtime, bracket, student-view, viewingMode]

# Dependency graph
requires:
  - phase: 32-01
    provides: useRealtimeBracket hook returns viewingMode, showVoteCounts, showSeedNumbers
  - phase: 32-02
    provides: teacher bracket settings panel with viewingMode toggle and broadcast
provides:
  - Student SE/DE/RR/Predictive views all route simple/advanced based on realtime viewingMode
  - DE simple mode with card-by-card MatchupVoteCard voting
  - showSeedNumbers reactivity in AdvancedVotingView and DEVotingView
  - PredictiveBracket accepts viewingMode prop for realtime mode routing
affects: [student-experience, bracket-display, settings-editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SELiveView/DEVotingView/RRLiveView wrapper pattern: top-level useRealtimeBracket for viewingMode routing"
    - "effectiveBracket pattern: merge realtime display settings into bracket object for child components"

key-files:
  created: []
  modified:
    - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
    - src/components/bracket/predictive-bracket.tsx
    - src/components/student/advanced-voting-view.tsx

key-decisions:
  - "SELiveView wrapper instead of inline routing -- keeps useRealtimeBracket call unconditional"
  - "DESimpleVoting uses MatchupVoteCard with useVote hook (no double-submit) -- consistent with RRSimpleVoting pattern"
  - "RR isSimpleMode driven purely by viewingMode (no roundRobinVotingStyle fallback) -- teacher can toggle"
  - "PredictiveBracket viewingMode prop maps simple/advanced directly, falls back to bracket.predictiveMode"

patterns-established:
  - "effectiveBracket: useMemo spreading realtime showSeedNumbers/showVoteCounts over bracket prop"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 32 Plan 04: Student Bracket ViewingMode Summary

**Realtime viewingMode routing for all four bracket types (SE/DE/RR/Predictive) with DE simple mode and showSeedNumbers reactivity**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T21:41:50Z
- **Completed:** 2026-03-01T21:47:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All four bracket types (SE, DE, RR, Predictive) now route between simple/advanced views based on realtime viewingMode from useRealtimeBracket hook
- DE simple mode implemented with DESimpleVoting card-by-card component using MatchupVoteCard
- showSeedNumbers reactivity wired through AdvancedVotingView and DEVotingView (effectiveBracket pattern)
- PredictiveBracket accepts viewingMode prop, overriding bracket.predictiveMode for realtime switching

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor SE routing and extend DE/RR viewingMode** - `dc55827` (feat)
2. **Task 2: Wire Predictive viewingMode and showSeedNumbers reactivity** - `05ef78d` (feat)

## Files Created/Modified
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` - SELiveView wrapper, DEVotingView simple mode routing, DESimpleVoting component, RRLiveView realtime viewingMode, PredictiveStudentView viewingMode passthrough, effectiveBracket for DE
- `src/components/bracket/predictive-bracket.tsx` - viewingMode prop on interface, mode routing with fallback to predictiveMode
- `src/components/student/advanced-voting-view.tsx` - Realtime showSeedNumbers from useRealtimeBracket passed to BracketDiagram and RegionBracketView

## Decisions Made
- Created SELiveView wrapper component (not inline routing) to keep useRealtimeBracket call unconditional per React hooks rules
- DESimpleVoting delegates server-side vote submission to MatchupVoteCard's internal useVote hook (avoids double-submit), tracking votes in parent via onVoteTracked callback
- RR isSimpleMode now driven purely by viewingMode from the realtime hook, with no fallback to roundRobinVotingStyle -- this is correct because the teacher toggle sets viewingMode, and old RR brackets default to 'advanced' until the teacher toggles
- PredictiveBracket viewingMode prop explicitly maps 'simple'/'advanced', falling back to bracket.predictiveMode when prop is undefined

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DESimpleVoting double-submit**
- **Found during:** Task 1 (DESimpleVoting implementation)
- **Issue:** Plan suggested using onEntrantClick (which calls castVote server action) in DESimpleVoting, but MatchupVoteCard already handles server-side submission via its internal useVote hook -- this would double-submit votes
- **Fix:** Changed to onVoteTracked callback pattern (matching RRSimpleVoting) that only syncs parent state without server call
- **Files modified:** src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
- **Verification:** TypeScript passes, no duplicate server calls
- **Committed in:** dc55827 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Essential fix to prevent double vote submission. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All student bracket views now reactively respond to teacher settings changes
- Phase 32 (Settings Editing) is complete -- all 4 plans executed
- Ready for Phase 33 or next milestone phase

## Self-Check: PASSED

All files exist, all commit hashes verified.

---
*Phase: 32-settings-editing*
*Completed: 2026-03-01*
