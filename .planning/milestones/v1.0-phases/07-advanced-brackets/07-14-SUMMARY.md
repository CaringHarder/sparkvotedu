---
phase: 07-advanced-brackets
plan: 14
type: execute
subsystem: student-bracket-views
tags: [bracket-type-routing, state-api, double-elimination, round-robin, predictive]
gap_closure: true

dependency_graph:
  requires: [07-09, 07-10, 07-11]
  provides: [bracket-type-aware-student-page, enriched-state-api]
  affects: [07-15, 07-16]

tech_stack:
  added: []
  patterns:
    - "bracketType routing pattern mirrored from bracket-detail.tsx to student page"
    - "enriched API response with safe fallback defaults"

file_tracking:
  key_files:
    created: []
    modified:
      - src/app/api/brackets/[bracketId]/state/route.ts
      - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx

decisions:
  - id: "07-14-01"
    decision: "Student RR page passes empty standings array since state API doesn't fetch standings; RoundRobinStandings handles empty gracefully"
    rationale: "Avoids adding standings computation to the public API; standings are teacher-computed server-side"
  - id: "07-14-02"
    decision: "Predictive brackets with predictions_open + draft status are allowed into the ready state for student prediction submission"
    rationale: "Prediction lifecycle is independent of bracket status; students need to submit predictions before bracket goes active"

metrics:
  duration: "~2.6m"
  completed: "2026-02-01"
  tasks: 2/2
---

# Phase 7 Plan 14: Bracket Type Routing (Gap Closure) Summary

**State API enriched with bracketType + type-specific fields; student page routes to DE/RR/Predictive/SE components**

## What Was Done

### Task 1: Enrich bracket state API with type-specific fields
Added bracket-level fields (`bracketType`, `predictionStatus`, `predictiveMode`, `roundRobinPacing`, `roundRobinVotingStyle`, `roundRobinStandingsMode`, `maxEntrants`, `playInEnabled`) and per-matchup fields (`bracketRegion`, `isBye`, `roundRobinRound`, `nextMatchupId`) to the `/api/brackets/[bracketId]/state` response. No Prisma query changes were needed -- the fields already existed on the models but were not included in the JSON response.

**Commit:** 0271214

### Task 2: Add bracket type routing to student page
Four sub-changes applied to the student bracket page:

1. **Updated BracketStateResponse interface** with all new fields from the enriched API
2. **Fixed toBracketWithDetails conversion** to use actual API data instead of hardcoded `'single_elimination'`, `null`, and `false` values
3. **Added component imports** for DoubleElimDiagram, RoundRobinStandings, RoundRobinMatchups, and PredictiveBracket
4. **Added bracketType routing** in both completed and ready states:
   - `double_elimination`: Renders DoubleElimDiagram with Winners/Losers/Grand Finals tabs
   - `round_robin`: Renders RoundRobinStandings + RoundRobinMatchups grid
   - `predictive`: Renders PredictiveBracket for prediction submission (predictions_open) or AdvancedVotingView (active/resolving)
   - `single_elimination`: Keeps existing viewingMode routing (SimpleVotingView vs AdvancedVotingView)

**Commit:** 1727383

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit`: Zero type errors
- `npx vitest run`: 275 tests passed, zero regressions
- Manual verification: Requires running application (UAT re-test)

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 07-14-01 | Student RR page passes empty standings array | Avoids adding standings computation to public API; component handles empty gracefully |
| 07-14-02 | Predictive brackets with predictions_open + draft status enter ready state | Prediction lifecycle is independent of bracket status; students need to submit predictions before bracket goes active |

## UAT Impact

This plan directly addresses:
- **UAT Test 5** (Double-elimination live flow): Students now see DoubleElimDiagram instead of SE diagram
- **UAT Test 9** (Round-robin standings/matchups): Students now see standings + matchup grid
- **UAT Test 12** (Predictive lifecycle end-to-end): Students now see PredictiveBracket during predictions_open
- **UAT Test 13** (Bracket type rendering): Student page now routes based on actual bracketType

## Next Phase Readiness

- Plan 15 (live dashboard bracket type routing) can proceed independently
- Plan 16 (poll winner reveal) is unrelated and can proceed in parallel
- UAT re-test should be run after plans 14-16 are all complete
