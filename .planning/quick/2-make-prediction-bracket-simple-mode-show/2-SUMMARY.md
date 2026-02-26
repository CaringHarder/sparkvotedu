---
phase: quick
plan: 2
subsystem: ui
tags: [motion, AnimatePresence, prediction-bracket, simple-mode, sequential-ux]

# Dependency graph
requires:
  - phase: none
    provides: existing SimplePredictionMode and usePredictionCascade hook
provides:
  - One-at-a-time prediction UX in SimplePredictionMode matching SimpleVotingView pattern
affects: [predictive-bracket, student-simple-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [AnimatePresence one-at-a-time card pattern for prediction brackets]

key-files:
  created: []
  modified:
    - src/components/bracket/predictive-bracket.tsx

key-decisions:
  - "Moved useState hooks above early returns to comply with React rules of hooks"
  - "Used bracket.name as heading in the one-at-a-time form view for context"
  - "Reused ChevronRight (rotated) from lucide-react for Previous button instead of adding new icon"

patterns-established:
  - "One-at-a-time card pattern: now used in both SimpleVotingView and SimplePredictionMode"

requirements-completed: [QUICK-02]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Quick Task 2: Prediction Bracket Simple Mode One-at-a-Time Summary

**SimplePredictionMode rewritten to show one matchup at a time with AnimatePresence transitions, confirmation cards, and batch submit at end**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-26T11:11:54Z
- **Completed:** 2026-02-26T11:17:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced scrollable list of all matchups with sequential one-at-a-time display using AnimatePresence
- Added "Prediction X of Y" progress counter that updates dynamically as cascade adds matchups
- Added "Vote Submitted!" confirmation card (1.2s duration) between picks with scale-in animation
- Added "All predictions made!" submit card with green checkmark, progress bar, and Submit All Predictions button
- Added "Previous" back navigation and "Review predictions" link for revisiting earlier picks
- Kept read-only, closed, submitted-not-editing, and loading states completely unchanged
- Kept usePredictionCascade hook and MatchupPredictionCard component unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite SimplePredictionMode to show one matchup at a time with animated transitions** - `5f06d27` (feat)

## Files Created/Modified
- `src/components/bracket/predictive-bracket.tsx` - Rewrote SimplePredictionMode return block from all-at-once list to AnimatePresence-based sequential display; added motion/react import; moved useState hooks above early returns

## Decisions Made
- Moved `currentIndex` and `showConfirmation` useState hooks to the top of SimplePredictionMode (alongside existing hooks) to comply with React's rules of hooks -- they cannot be placed after conditional early returns
- Used `bracket.name` as a heading in the one-at-a-time form view to provide context to students about which bracket they are predicting
- Reused the existing `ChevronRight` icon (rotated 180 degrees) for the Previous button instead of importing a new icon

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved useState hooks above early returns**
- **Found during:** Task 1 (SimplePredictionMode rewrite)
- **Issue:** Plan placed `useState(0)` and `useState(false)` for `currentIndex`/`showConfirmation` in the prediction form section, which is after three early returns (isLoading, !isPredictionsOpen, hasSubmitted && !isEditing). React hooks cannot be called conditionally.
- **Fix:** Moved both useState calls to the top of SimplePredictionMode alongside the existing hooks
- **Files modified:** src/components/bracket/predictive-bracket.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** 5f06d27 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for React correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Prediction bracket simple mode now matches SE bracket simple mode UX pattern
- No blockers for subsequent work

## Self-Check: PASSED

- [x] src/components/bracket/predictive-bracket.tsx exists
- [x] Commit 5f06d27 exists in git history
- [x] 2-SUMMARY.md exists

---
*Quick Task: 2*
*Completed: 2026-02-26*
