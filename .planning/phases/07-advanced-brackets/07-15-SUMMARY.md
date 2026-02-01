---
phase: 07-advanced-brackets
plan: 15
subsystem: bracket-live-view
tags: [live-dashboard, bracket-type-routing, double-elimination, round-robin, gap-closure]
depends_on:
  requires: [07-09, 07-10, 07-08]
  provides: [bracket-type-aware-live-dashboard, rr-live-standings, de-live-diagram]
  affects: [07-16]
tech-stack:
  added: []
  patterns: [bracket-type-conditional-rendering, type-aware-totalRounds]
key-files:
  created: []
  modified:
    - src/components/teacher/live-dashboard.tsx
    - src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
decisions:
  - "SE action buttons hidden for RR (RR uses its own advancement pattern via recordResult/advanceRound)"
  - "DE brackets retain SE action bar (Open Voting / Close & Advance) since DE uses same matchup status model"
  - "Predictive brackets render standard BracketDiagram in live view (prediction phase is before go-live)"
  - "Round tabs hidden for RR, replaced with current round indicator badge"
  - "totalRounds uses Math.ceil(Math.log2(effectiveSize)) with maxEntrants fallback for bye bracket support"
  - "RR totalRounds set to 1 since RR matchups are grouped by roundRobinRound, not SE round numbers"
metrics:
  duration: ~2.6m
  completed: 2026-02-01
---

# Phase 7 Plan 15: Bracket Type Routing in Live Dashboard Summary

**One-liner:** Added bracketType-based conditional rendering to LiveDashboard so DE brackets show DoubleElimDiagram and RR brackets show standings+matchups instead of falling back to SE BracketDiagram.

## What Was Done

### Task 1: Add bracket type routing to LiveDashboard component (15ba3d1)
- Added imports for DoubleElimDiagram, RoundRobinStandings, RoundRobinMatchups, and round-robin server actions
- Added bracketType detection flags (isDoubleElim, isRoundRobin, isPredictive)
- Added round-robin handlers: handleRecordRoundRobinResult (calls recordResult action), handleAdvanceRoundRobin (calls advanceRound action)
- Computed currentRoundRobinRound and canAdvanceRoundRobin from matchup state
- Replaced single BracketDiagram render with conditional: DoubleElimDiagram for DE, RoundRobinStandings+RoundRobinMatchups for RR, BracketDiagram for SE/predictive
- Wrapped SE round tabs in `!isRoundRobin` guard; added current round indicator for RR
- Wrapped SE action buttons in `!isRoundRobin` guard; added Open Round N button for RR advancement
- Added standings prop (RoundRobinStanding[]) to LiveDashboardProps

### Task 2: Pass standings data and fix totalRounds for live page (9d91908)
- Fixed totalRounds: was `Math.log2(bracket.size)` (wrong for DE/RR), now uses type-aware calculation with `Math.ceil(Math.log2(effectiveSize))` and maxEntrants fallback
- RR brackets get totalRounds=1 since they don't use SE-style rounds
- Added standings fetch for RR brackets via getRoundRobinStandings DAL
- Passed standings prop to LiveDashboard component

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| SE action bar retained for DE | DE brackets use same matchup status model (pending/voting/decided) as SE for winners bracket |
| RR hides all SE controls | RR uses completely different advancement pattern (recordResult per matchup, advanceRound per round) |
| Predictive uses SE diagram | Prediction phase occurs before go-live; once active, predictive brackets run as standard SE tournaments |
| totalRounds=1 for RR | RR matchups are grouped by roundRobinRound field, not by SE round numbers; totalRounds is irrelevant |

## Verification Results

1. `npx tsc --noEmit` -- zero type errors
2. `npx vitest run` -- 275/275 tests pass (8 test files)
3. Key link verification:
   - live-dashboard.tsx contains `DoubleElimDiagram` import and render
   - live-dashboard.tsx contains `bracket.bracketType === 'double_elimination'` check
   - live-dashboard.tsx contains `bracket.bracketType === 'round_robin'` check
   - live/page.tsx serializes bracketType and passes standings prop

## UAT Impact

This plan closes the teacher-side rendering gap for UAT tests:
- **UAT 6** (DE teacher view): DoubleElimDiagram now renders in live dashboard
- **UAT 10** (RR teacher view): Standings + matchup grid now render with round advancement
- **UAT 11** (RR round advancement): Open Round N button available when current round complete

## Next Phase Readiness

Plan 16 (student page bracket type routing) is the remaining gap closure work. The student page still hardcodes bracketType to single_elimination and the state API lacks bracket type fields.
