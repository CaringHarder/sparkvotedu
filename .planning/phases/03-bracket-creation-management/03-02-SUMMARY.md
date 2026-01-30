---
phase: 03-bracket-creation-management
plan: 02
subsystem: bracket-engine
tags: [bracket, engine, seeding, single-elimination, pure-functions, tdd]
depends_on:
  requires: ["03-01"]
  provides: ["bracket-engine-functions"]
  affects: ["03-03", "03-04", "03-05"]
tech-stack:
  added: []
  patterns: ["recursive-doubling-seeding", "pure-function-engine", "tdd-red-green-refactor"]
key-files:
  created:
    - src/lib/bracket/engine.ts
    - src/lib/bracket/__tests__/engine.test.ts
  modified: []
decisions:
  - id: "03-02-seed-algorithm"
    decision: "Recursive doubling algorithm for standard tournament seeding"
    rationale: "Produces correct NCAA-style bracket seeding (1v16, 8v9, etc.) deterministically"
metrics:
  duration: "~2 min"
  completed: "2026-01-30"
---

# Phase 3 Plan 02: Single-Elimination Bracket Engine Summary

**One-liner:** Pure bracket engine with recursive-doubling seeding algorithm, generating single-elimination tournament structures for sizes 4/8/16 -- 31 tests, all passing.

## What Was Built

Three pure functions forming the core algorithmic piece of the bracket system:

1. **calculateRounds(entrantCount)** -- Returns number of rounds via `Math.log2`. Handles sizes 4 (2 rounds), 8 (3 rounds), 16 (4 rounds).

2. **getStandardSeed(position, bracketSize, slot)** -- Uses recursive doubling to build standard tournament seed order (e.g., [1,8,4,5,2,7,3,6] for size 8), then indexes into it for any matchup position and slot.

3. **generateMatchups(bracketSize)** -- Produces the full `MatchupSeed[]` array with correct round structure, first-round seed assignments, null seeds for later rounds, and `nextMatchupPosition` chaining every non-final matchup to the next round.

## TDD Execution

| Phase    | Commit  | Tests | Description                                    |
|----------|---------|-------|------------------------------------------------|
| RED      | a6cbc81 | 31    | All tests written, all failing (module missing)|
| GREEN    | 8fd253c | 31    | Engine implemented, all 31 tests pass          |
| REFACTOR | --      | --    | No refactoring needed; code already clean with JSDoc |

## Key Implementation Details

**Seeding algorithm (buildSeedOrder):**
- Start with `[1]`
- Each iteration: for each seed, append `(roundSize + 1 - seed)`
- Size 4: `[1] -> [1,2] -> [1,4,2,3]`
- Size 8: `[1,4,2,3] -> [1,8,4,5,2,7,3,6]`
- Pairs adjacent seeds for first-round matchups

**Next matchup linking:**
- Position `p` in round `r` feeds into position `ceil(p/2)` in round `r+1`
- Final round matchup has `nextMatchupPosition = null`

## Test Coverage

31 tests across 6 describe blocks:
- `calculateRounds`: 3 tests (sizes 4, 8, 16)
- `getStandardSeed size 4`: 2 tests (2 matchups)
- `getStandardSeed size 8`: 4 tests (4 matchups)
- `getStandardSeed size 16`: 8 tests (8 matchups)
- `generateMatchups total count`: 3 tests
- `generateMatchups round structure`: 3 tests
- `generateMatchups seed assignments`: 2 tests (sizes 4, 8)
- `generateMatchups null seeds`: 2 tests
- `generateMatchups nextMatchupPosition`: 4 tests (non-final, final, R1->R2, R2->R3)

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run engine.test.ts` | 31/31 pass |
| `npx tsc --noEmit` | Zero type errors |
| generateMatchups(4) = 3 matchups | Confirmed |
| generateMatchups(8) = 7 matchups | Confirmed |
| generateMatchups(16) = 15 matchups | Confirmed |
| key_link pattern (import MatchupSeed from types) | Confirmed |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 03-02-seed-algorithm | Recursive doubling for standard tournament seeding | Deterministic, produces correct NCAA-style bracket ordering for all supported sizes |

## Next Phase Readiness

The bracket engine is ready to be consumed by:
- **03-03 (Bracket DAL):** Will call `generateMatchups()` and `calculateRounds()` when creating bracket database records
- **03-04 (Bracket UI):** Will use engine output to render bracket diagram
- **03-05 (Entrant management):** Seed positions map directly to engine output

No blockers or concerns for downstream plans.
