---
phase: 07-advanced-brackets
plan: 03
subsystem: bracket-engine
tags: [double-elimination, losers-bracket, tdd, pure-functions]
depends_on: [07-01]
provides: [double-elim-engine, losers-bracket-seeding]
affects: [07-08, 07-09]
tech_stack:
  added: []
  patterns: [split-and-reverse-seeding, alternating-minor-major-rounds]
key_files:
  created:
    - src/lib/bracket/double-elim.ts
    - src/lib/bracket/__tests__/double-elim.test.ts
  modified: []
decisions:
  - Losers bracket built iteratively: R1 minor, then alternating major/minor for each remaining WB round
  - LB final has null nextMatchupPosition (links to grand finals externally during DAL wiring)
  - Grand finals uses round=1, position=1 with null seeds (filled by WB and LB champions)
  - seedLosersFromWinnersRound uses split-and-reverse for 3+ losers, simple reverse for 2
metrics:
  duration: ~2.5m
  completed: 2026-02-01
---

# Phase 7 Plan 3: Double-Elimination Bracket Engine Summary

Pure-function double-elim engine generating winners (via existing engine.ts), losers (alternating minor/major rounds), and grand finals matchup structures with split-and-reverse LB seeding to avoid rematches.

## What Was Built

### generateDoubleElimMatchups(size)
Returns `{ winners, losers, grandFinals }` where:
- **Winners bracket**: Reuses existing `generateMatchups(size)` from engine.ts (single-elimination)
- **Losers bracket**: Built iteratively with alternating minor/major round structure
  - LB R1 (minor): `size/4` matchups (WB R1 losers paired)
  - For each WB round 2+: major round (LB survivors + WB dropdowns), then minor round (LB survivors halved)
  - LB rounds = `2 * (log2(size) - 1)`
- **Grand finals**: Single matchup, null seeds, null nextMatchupPosition

### seedLosersFromWinnersRound(wbLosers, lbRoundSize)
Reorders WB losers for LB placement using split-and-reverse:
- 1 loser: identity
- 2 losers: simple reverse
- 3+ losers: split at midpoint, reverse each half, concatenate second-half first

## Matchup Count Verification

| Size | Winners | Losers | Grand Finals | Total | Formula |
|------|---------|--------|--------------|-------|---------|
| 4    | 3       | 2      | 1            | 6     | 2N-1    |
| 8    | 7       | 6      | 1            | 14    | 2N-1    |
| 16   | 15      | 14     | 1            | 30    | 2N-1    |

## TDD Cycle

| Phase    | Commit  | Tests | Description |
|----------|---------|-------|-------------|
| RED      | a46bc0c | 37 failing | Wrote comprehensive tests for both functions |
| GREEN    | 4a9228d | 37 passing | Implemented engine and seeding functions |
| REFACTOR | a3efafb | 37 passing | Removed unused variable |

## Decisions Made

1. **Iterative LB construction**: Build losers bracket round-by-round tracking field size, rather than pre-computing the full structure. Simpler to reason about and debug.
2. **Null seeds for all LB matchups**: Losers bracket matchups have null entrant seeds because they are filled dynamically during advancement (no pre-known seeding).
3. **LB final links to GF externally**: The LB final's `nextMatchupPosition` is null within the losers array. The DAL layer (07-08) will wire it to grand finals during persistence.
4. **Split-and-reverse for rematch avoidance**: Standard algorithm ensures WB region opponents are separated in LB. Adjacent WB losers end up on opposite sides.

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

- **07-08 (Double-Elim DAL)**: Can now use `generateDoubleElimMatchups` for matchup creation and `seedLosersFromWinnersRound` for losers bracket advancement
- **07-09 (Double-Elim Visualization)**: Matchup structure with round/position/region data is ready for SVG layout
