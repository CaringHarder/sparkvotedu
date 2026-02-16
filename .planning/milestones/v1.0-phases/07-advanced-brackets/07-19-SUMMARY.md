---
phase: "07-advanced-brackets"
plan: 19
subsystem: "predictive-brackets"
tags: ["prediction-cascade", "client-state", "bracket-topology", "multi-round"]
dependency-graph:
  requires: ["07-05", "07-11"]
  provides: ["prediction-cascade-engine", "multi-round-prediction-ui"]
  affects: ["07-UAT"]
tech-stack:
  added: []
  patterns: ["cascade-propagation-via-nextMatchupId", "position-parity-slot-assignment", "BFS-downstream-invalidation"]
key-files:
  created:
    - src/hooks/use-prediction-cascade.ts
  modified:
    - src/components/bracket/predictive-bracket.tsx
decisions:
  - id: "07-19-01"
    description: "Position parity for slot assignment (odd->entrant1, even->entrant2) reuses existing advancement engine convention"
  - id: "07-19-02"
    description: "Speculative entrants only fill empty slots (original DB data preserved when present)"
  - id: "07-19-03"
    description: "BFS walk for downstream invalidation follows nextMatchupId chain from changed matchup"
  - id: "07-19-04"
    description: "Dashed blue border + 'predicted matchup' badge visually distinguishes speculative from DB-populated matchups"
metrics:
  duration: "~2.4m"
  completed: "2026-02-02"
---

# Phase 7 Plan 19: Predictive Cascade Engine Summary

**One-liner:** Client-side cascade hook propagates R1 picks through nextMatchupId topology to fill later-round matchup slots, enabling full-bracket predictions with downstream invalidation.

## What Was Done

### Task 1: Build usePredictionCascade hook
Created `src/hooks/use-prediction-cascade.ts` -- a client-side prediction cascade engine that:
- Takes bracket matchups and current selections as input
- Computes augmentedMatchups with speculative entrants filled from predictions (round-ordered processing)
- Uses position parity (odd -> entrant1, even -> entrant2) matching the existing advancement engine
- Provides handleSelect with cascade invalidation (BFS walk through nextMatchupId chain)
- Tracks totalSelectableCount/selectedCount/allSelected across all rounds
- Supports toggle-deselect (clicking same entrant clears selection + downstream)
- Syncs with initialSelections on server fetch via stable key comparison

### Task 2: Wire usePredictionCascade into both prediction modes
Refactored `src/components/bracket/predictive-bracket.tsx`:
- **SimplePredictionMode:** Replaced old nonByeMatchups filter + flat selection state with usePredictionCascade hook. selectableMatchups now dynamically grows as earlier rounds are predicted. Progress counter reflects all rounds.
- **AdvancedPredictionMode:** Same hook wiring. BracketDiagram now receives augmentedMatchups showing speculative entrant names in later-round boxes. Interactive click handler delegates to cascade handleSelect.
- **MatchupPredictionCard:** Added isSpeculative prop -- matchups with round > 1 show dashed blue border and "predicted matchup" badge to help students understand which matchups depend on earlier picks.
- **ReadOnlyPredictions:** Now receives augmented matchups so read-only views also show predicted entrant names in later rounds.
- Removed all old state management: nonByeMatchups useMemo, selections useState, lastPredictionCount sync, madeCount/totalCount/allSelected manual computation.

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 07-19-01 | Position parity slot assignment (odd->entrant1, even->entrant2) | Matches existing advancement engine convention from 04-02 |
| 07-19-02 | Speculative entrants only fill empty slots | Preserves real DB data; only fills null entrant slots |
| 07-19-03 | BFS downstream invalidation via nextMatchupId chain | Simple iterative walk; clears all downstream regardless of depth |
| 07-19-04 | Dashed blue border for speculative matchup cards | Visual indicator helps students understand prediction dependency |

## Verification

- [x] `npx tsc --noEmit` passes with no errors
- [x] usePredictionCascade imported and used in both SimplePredictionMode and AdvancedPredictionMode
- [x] Old nonByeMatchups filter completely removed (zero matches in grep)
- [x] SimplePredictionMode shows matchup cards for later rounds when feeder predictions populate them
- [x] AdvancedPredictionMode shows speculative entrants in later-round diagram boxes
- [x] Changing an R1 pick cascades to clear dependent R2/R3 picks
- [x] Submit sends predictions for all rounds to the server

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a6859bb | feat | Build usePredictionCascade hook |
| 0f11faa | feat | Wire usePredictionCascade into both prediction modes |

## Next Phase Readiness

This plan resolves the root cause of UAT Tests 12, 13 (students can now predict all rounds), and enables Test 14 (leaderboard populates once full-bracket predictions exist and matchups resolve). No blockers for remaining gap closure plans.
