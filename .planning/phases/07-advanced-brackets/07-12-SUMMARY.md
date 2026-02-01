---
phase: 07-advanced-brackets
plan: 12
subsystem: bracket-ui
tags: [predictive, leaderboard, scoring, realtime, bracket-ui, prediction-stats]

# Dependency graph
requires:
  - phase: 07-05
    provides: "scorePredictions pure function, getPointsForRound, PredictionScore type"
  - phase: 07-11
    provides: "Prediction DAL with scoring, server actions (getLeaderboard), usePredictions real-time hook, PredictiveBracket component"
provides:
  - "PredictionLeaderboard component with dual views (student rank-only, teacher expandable breakdown)"
  - "Per-matchup prediction stats with visual distribution bars"
  - "Bulk getAllMatchupPredictionStats DAL function and getMatchupStats server action"
  - "Leaderboard integrated into bracket detail page alongside predictive bracket diagram"
affects: [07-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk matchup prediction stats fetched in single query with groupBy aggregation"
    - "Dual-view leaderboard: student (rank + score) vs teacher (expandable per-round breakdown)"
    - "Server-side initial score fetch with client-side real-time updates via usePredictions"

key-files:
  created:
    - src/components/bracket/prediction-leaderboard.tsx
  modified:
    - src/lib/dal/prediction.ts
    - src/actions/prediction.ts
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
    - src/components/bracket/bracket-detail.tsx

key-decisions:
  - "Bulk getAllMatchupPredictionStats uses single groupBy query with matchupId+predictedWinnerId for efficient fetching"
  - "Gold/silver/bronze rank badges use amber-400, gray-300, amber-600 matching 05-04 poll leaderboard pattern"
  - "Leaderboard renders only when bracket status is active or completed (not during draft/predictions_open)"
  - "Responsive grid layout: diagram + controls on left, leaderboard on right (lg:grid-cols-2)"

patterns-established:
  - "Server-side score prefetch passed as initialScores prop, with client-side real-time updates replacing it"
  - "Per-matchup prediction stats use visual bar charts with green (winner) and red (loser) prediction distribution"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 7 Plan 12: Predictive Bracket Leaderboard Summary

**Dual-view prediction leaderboard with student rank table, teacher expandable per-round breakdown, per-matchup prediction stats with visual bars, and real-time updates via usePredictions hook**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T18:09:29Z
- **Completed:** 2026-02-01T18:12:50Z
- **Tasks:** 2/2
- **Files created:** 1
- **Files modified:** 4

## Accomplishments

- PredictionLeaderboard component with dual views: student sees rank + name + score (gold/silver/bronze badges, own row highlighted); teacher sees expandable rows with rank, name, score, correct picks, accuracy %, and per-round breakdown (green correct / red wrong indicators)
- Per-matchup prediction stats section with visual distribution bars showing how many participants predicted each entrant, green for correct majority, red for incorrect
- Bulk getAllMatchupPredictionStats DAL function and getMatchupStats server action for efficient single-query fetching of all resolved matchup prediction data
- Leaderboard integrated into bracket detail page with responsive grid layout (diagram + controls on left, leaderboard on right) for predictive brackets in active or completed status
- Real-time leaderboard updates via usePredictions hook -- scores refresh automatically as matchups are resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Build PredictionLeaderboard with student and teacher views** - `30a83c1` (feat)
2. **Task 2: Integrate leaderboard into bracket detail page** - `3abb077` (feat)

## Files Created/Modified

- `src/components/bracket/prediction-leaderboard.tsx` - Dual-view prediction leaderboard (student rank + score, teacher expandable per-round breakdown), per-matchup prediction stats with visual bars, RankBadge with gold/silver/bronze, responsive table + mobile cards
- `src/lib/dal/prediction.ts` - Added getAllMatchupPredictionStats for bulk matchup prediction distribution fetching
- `src/actions/prediction.ts` - Added getMatchupStats server action for bulk matchup stats
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - Server-side prediction score prefetch for predictive brackets
- `src/components/bracket/bracket-detail.tsx` - Responsive grid layout with PredictionLeaderboard alongside PredictiveBracket for predictive brackets

## Decisions Made

- **Bulk matchup stats query:** Used `prisma.prediction.groupBy` with `matchupId` and `predictedWinnerId` to fetch all matchup prediction distributions in a single query rather than N individual queries per matchup.
- **Rank badge styling:** Gold (amber-400), silver (gray-300), bronze (amber-600) matching the poll leaderboard pattern established in 05-04.
- **Leaderboard visibility:** Only renders when bracket is active or completed -- during draft and predictions_open phases, the leaderboard is hidden since no matchups have been resolved yet.
- **Server + client score loading:** Initial scores are fetched server-side and passed as `initialScores` prop for immediate rendering. The `usePredictions` hook then provides real-time updates that replace the initial data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - all changes are code-only, no external configuration needed.

## Next Phase Readiness

- Prediction leaderboard complete and integrated into teacher bracket detail page
- Student leaderboard view (isTeacher=false) is ready for use when student-facing pages integrate PredictionLeaderboard
- Per-matchup stats infrastructure can be reused by any future component needing prediction distribution data
- Ready for 07-13 (final plan in phase 7)

---
*Phase: 07-advanced-brackets*
*Completed: 2026-02-01*
