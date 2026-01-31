---
phase: 04-voting-and-real-time
plan: 02
subsystem: bracket-advancement
tags: [bracket, advancement, tdd, prisma-transactions, winner-propagation]
requires: []
provides:
  - Bracket advancement engine with winner propagation
  - Undo advancement with vote safety checks
  - Batch round advancement
  - Round and bracket completion queries
affects:
  - 04-03 (voting UI will call advanceMatchupWinner)
  - 04-04 (real-time bracket updates rely on advancement state)
  - 04-05 (teacher bracket control dashboard)
tech-stack:
  added: []
  patterns:
    - Prisma interactive transactions for atomic multi-table mutations
    - Odd/even position parity for slot assignment (entrant1 vs entrant2)
    - vi.mock for Prisma client mocking in unit tests
key-files:
  created:
    - src/lib/bracket/advancement.ts
    - src/lib/bracket/__tests__/advancement.test.ts
  modified: []
key-decisions:
  - id: 04-02-01
    decision: "Position parity determines next-round slot: odd positions (1,3,5,7) feed entrant1Id, even positions (2,4,6,8) feed entrant2Id"
    rationale: "Matches bracket engine's Math.ceil(position/2) calculation from Phase 3"
  - id: 04-02-02
    decision: "Undo blocked by vote count check on next matchup, not by status check"
    rationale: "More precise safety gate -- status could be reset without votes, but votes represent real student participation that would be lost"
  - id: 04-02-03
    decision: "Read-only queries (checkRoundComplete, isBracketComplete) skip transactions"
    rationale: "Transactions add overhead for single-table reads; snapshot isolation from Postgres is sufficient"
duration: ~4min
completed: 2026-01-31
---

# Phase 4 Plan 2: Bracket Advancement Engine Summary

TDD-driven bracket advancement engine with winner propagation, undo safety, batch operations, and completion queries using Prisma transactions.

## Performance

- **Start:** 2026-01-31T13:23:32Z
- **End:** 2026-01-31T13:27:43Z
- **Duration:** ~4 minutes
- **TDD cycle:** RED (19 failing) -> GREEN (19 passing) -> REFACTOR (skipped, code clean)

## Accomplishments

1. **advanceMatchupWinner** -- Sets winner on matchup, updates status to "decided", propagates winner to correct slot of next matchup via position parity
2. **undoMatchupAdvancement** -- Clears winner, restores "voting" status, removes propagated entrant from next matchup; blocked if next matchup has votes
3. **batchAdvanceRound** -- Advances all decided matchups in a round atomically, propagating all winners to next-round matchups
4. **checkRoundComplete** -- Returns true when every matchup in a round has status "decided"
5. **isBracketComplete** -- Returns winner ID from final matchup, or null if bracket is ongoing
6. **getSlotForPosition** -- Internal helper mapping odd positions to entrant1Id and even to entrant2Id

## Task Commits

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| RED | test | 98559c8 | 19 failing tests for all 5 advancement functions |
| GREEN | feat | c7a30a0 | Full implementation, 19/19 tests passing, zero TS errors |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| src/lib/bracket/advancement.ts | 219 | Bracket advancement engine with 5 exported functions |
| src/lib/bracket/__tests__/advancement.test.ts | 501 | 19 test cases with mocked Prisma client |

## Files Modified

None.

## Decisions Made

1. **Position parity slot assignment** (04-02-01): Odd positions feed entrant1Id, even positions feed entrant2Id in next matchup. Mirrors Phase 3 bracket engine's `Math.ceil(position / 2)` calculation.

2. **Vote count for undo safety** (04-02-02): Undo checks `vote.count` on the next matchup rather than matchup status. This is more precise -- votes represent actual student participation that cannot be silently discarded.

3. **Transactions only for mutations** (04-02-03): `checkRoundComplete` and `isBracketComplete` are read-only queries and skip `$transaction` wrapper. Postgres snapshot isolation provides sufficient consistency for single-table reads.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

1. **TypeScript null-to-Record cast** -- Test file had `(null as Record<string, unknown>)` patterns that TS rejected. Fixed with double cast `(null as unknown as Record<string, unknown>)`. Minor test typing issue, not architectural.

2. **Matchup status field not yet in Prisma schema** -- The `status` field referenced in the plan (added by 04-01) was not initially present when RED phase started. Used `Record<string, unknown>` type assertions in implementation to handle the gap. These casts will naturally resolve once the Prisma types regenerate with the status field.

## Next Phase Readiness

- **Ready for 04-03**: Voting UI can import `advanceMatchupWinner` and `undoMatchupAdvancement`
- **Ready for 04-04**: Real-time updates can check `checkRoundComplete` and `isBracketComplete`
- **Ready for 04-05**: Teacher dashboard can use `batchAdvanceRound` for round-level control
- **No blockers**: All 5 functions tested and exported
