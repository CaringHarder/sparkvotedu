---
phase: 05-polls
plan: 01
subsystem: poll-data-foundation
tags: [prisma, poll-model, types, zod, validation, borda-count]
requires:
  - 01-01 (Prisma client setup)
  - 01-02 (Teacher model and auth)
  - 02-01 (StudentParticipant model)
  - 02-05 (ClassSession model and relations)
provides:
  - Poll, PollOption, PollVote Prisma models with relations and constraints
  - PollData, PollOptionData, PollVoteData, PollWithOptions, PollWithResults TypeScript types
  - Zod schemas for poll creation, options, voting (simple + ranked), status update, delete
  - computeBordaScores and computeBordaLeaderboard pure functions for ranked poll aggregation
affects:
  - 05-02 (Poll DAL uses Poll/PollOption/PollVote models and types)
  - 05-03 (Server actions use Zod schemas for validation)
  - 05-04 (Teacher poll UI uses PollWithOptions, PollWithResults types)
  - 05-05 (Student voting uses castPollVoteSchema, castRankedPollVoteSchema)
  - 05-06 (Results display uses computeBordaScores/computeBordaLeaderboard)
tech-stack:
  added: []
  patterns:
    - "Compound unique @@unique([pollId, participantId, rank]) for per-rank vote deduplication"
    - "Single PollVote table with rank field handles both simple (rank=1) and ranked (rank=1..N) polls"
    - "Partial ranking Borda uses rankingDepth as base, not totalOptions, to avoid inflated scores"
key-files:
  created:
    - src/lib/poll/types.ts
    - src/lib/poll/borda.ts
    - src/lib/poll/__tests__/borda.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/utils/validation.ts
key-decisions:
  - "@@unique([pollId, participantId, rank]) enables both simple (rank=1) and ranked (rank=1..N) vote deduplication in a single table"
  - "pollType as string (not DB enum) for flexibility, matching bracket status pattern"
  - "Borda scoring uses pointBase - rank formula; partial rankings use rankingDepth as base to avoid score inflation (RESEARCH.md Pitfall 2)"
  - "Cascade delete on PollOption and PollVote from Poll, matching Bracket cascade pattern"
duration: ~2.9m
completed: 2026-01-31
---

# Phase 5 Plan 1: Poll Data Foundation Summary

**Poll/PollOption/PollVote Prisma models, TypeScript types for all poll interfaces, Zod validation schemas for creation/voting/lifecycle, and Borda count scoring with partial ranking support.**

## Performance

- **Duration:** ~2.9 minutes
- **Start:** 2026-01-31T22:10:55Z
- **End:** 2026-01-31T22:13:48Z
- **Tasks:** 2/2 completed
- **Type checks:** Zero new errors introduced
- **Tests:** 9/9 passing (Borda count)

## Accomplishments

1. **Poll Model** -- Added to Prisma schema with question, description, pollType (simple/ranked), status (draft/active/closed/archived), allowVoteChange, showLiveResults, rankingDepth fields. Indexes on teacherId, sessionId, status. Relations to Teacher and ClassSession.

2. **PollOption Model** -- Text, imageUrl, position fields. Cascade delete from Poll. Compound unique on (pollId, position) for ordered option lists.

3. **PollVote Model** -- Supports both simple and ranked polls via rank field (default 1). Compound unique on (pollId, participantId, rank) prevents duplicate votes per rank slot. Cascade delete from Poll, PollOption, and StudentParticipant.

4. **Existing Model Relations** -- Added polls array to Teacher, ClassSession. Added pollVotes array to StudentParticipant.

5. **TypeScript Types** -- PollType, PollStatus literal unions. PollData, PollOptionData, PollVoteData interfaces. PollWithOptions and PollWithResults composite types for display and results.

6. **Zod Validation Schemas** -- Six schemas: createPollSchema (question, description, pollType, settings), pollOptionSchema (text, imageUrl, position), castPollVoteSchema (simple vote), castRankedPollVoteSchema (ranked vote with rankings array), updatePollStatusSchema, deletePollSchema. All with inferred TypeScript types.

7. **Borda Count Functions** -- Two pure functions: computeBordaScores (basic scoring, returns sorted optionId/points) and computeBordaLeaderboard (extended with maxPossiblePoints and voterCount). Both correctly use rankingDepth as base for partial rankings. 9 test cases covering full rankings, partial rankings, empty votes, and edge cases.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Prisma models + db push | 5c5d9d2 | prisma/schema.prisma |
| 2 | Types, schemas, Borda count | 91ec8a4 | src/lib/poll/types.ts, src/lib/poll/borda.ts, src/lib/utils/validation.ts, src/lib/poll/__tests__/borda.test.ts |

## Files Created

- `src/lib/poll/types.ts` -- PollType, PollStatus, PollData, PollOptionData, PollVoteData, PollWithOptions, PollWithResults
- `src/lib/poll/borda.ts` -- computeBordaScores, computeBordaLeaderboard with JSDoc documentation
- `src/lib/poll/__tests__/borda.test.ts` -- 9 test cases for Borda count scoring

## Files Modified

- `prisma/schema.prisma` -- Poll, PollOption, PollVote models; polls relation on Teacher and ClassSession; pollVotes relation on StudentParticipant
- `src/lib/utils/validation.ts` -- 6 poll validation schemas (createPollSchema, pollOptionSchema, castPollVoteSchema, castRankedPollVoteSchema, updatePollStatusSchema, deletePollSchema) with 6 inferred types

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Compound unique on (pollId, participantId, rank) | Single constraint handles both simple polls (rank always 1, effectively unique on pollId+participantId) and ranked polls (one entry per rank per participant) |
| String pollType/status fields (not DB enums) | Matches existing bracket/matchup status pattern; allows flexible validation in application code |
| rankingDepth as Borda base for partial rankings | Prevents inflated scores when only top N are ranked (RESEARCH.md Pitfall 2); rank 1 gets depth-1 points, not totalOptions-1 |
| Cascade delete on all poll relations | Consistent with Bracket cascade pattern; deleting a poll removes all options and votes atomically |
| Single PollVote table for both poll types | Rank=1 for simple, rank=1..N for ranked; avoids separate vote tables and simplifies queries |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None -- schema push, client generation, type checking, and tests all passed cleanly.

## Next Phase Readiness

- **05-02 (Poll DAL):** Poll/PollOption/PollVote models and types are ready for DAL function creation.
- **05-03 (Server Actions):** Zod schemas are ready for server action validation.
- **05-04 (Teacher Poll UI):** PollWithOptions type defines the data contract for creation/edit forms.
- **05-05 (Student Voting):** castPollVoteSchema and castRankedPollVoteSchema define the voting input contracts.
- **05-06 (Results/Charts):** computeBordaScores and computeBordaLeaderboard are ready for ranked result aggregation.

No blockers for any subsequent Phase 5 plan.
