---
phase: 04-voting-and-real-time
plan: 01
subsystem: voting-data-layer
tags: [prisma, vote-model, dal, realtime, broadcast, zod, validation]
requires:
  - 03-01 (Bracket/Matchup/BracketEntrant Prisma models)
  - 01-01 (Prisma client setup)
  - 02-05 (Supabase Realtime broadcast channel pattern)
provides:
  - Vote model with compound unique constraint for deduplication
  - Matchup.status field for per-matchup voting lifecycle
  - Bracket voting preference fields (viewingMode, showVoteCounts, votingTimerSeconds)
  - Vote DAL (cast, count, check, summary, status management, batch open)
  - Server-side Broadcast helper (vote updates, bracket state, activity refresh)
  - Vote TypeScript types (MatchupStatus, VoteData, VoteCounts, MatchupVoteState, ViewingMode)
  - Vote validation schemas (castVote, advanceMatchup, openVoting, updateBracketVotingSettings)
affects:
  - 04-02 (bracket advancement engine uses Matchup.status)
  - 04-03 (cast-vote server action uses castVoteDAL + broadcastVoteUpdate)
  - 04-04 (teacher voting controls use updateMatchupStatus + openMatchupsForVoting)
  - 04-05 (student voting UI uses MatchupVoteState + VoteCounts types)
  - 04-06 (real-time subscriptions consume broadcast events)
tech-stack:
  added: []
  patterns:
    - "Compound unique constraint for idempotent upsert voting"
    - "REST API broadcast via raw fetch (no WebSocket in server actions)"
    - "Forward-only status transitions with VALID_TRANSITIONS lookup"
    - "Best-effort broadcast (log errors, never throw)"
key-files:
  created:
    - src/types/vote.ts
    - src/lib/dal/vote.ts
    - src/lib/realtime/broadcast.ts
  modified:
    - prisma/schema.prisma
    - src/lib/bracket/types.ts
    - src/lib/utils/validation.ts
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
key-decisions:
  - "Compound unique @@unique([matchupId, participantId]) enables race-safe upsert for vote deduplication"
  - "Matchup status uses string field with application-level transition validation (not database enum) for flexibility"
  - "Broadcast helper uses raw fetch to Supabase REST API -- server actions are stateless, no persistent WebSocket"
  - "Broadcast errors logged but never thrown -- real-time is best-effort, must not break the vote flow"
  - "openMatchupsForVoting uses updateMany with status filter for atomic batch state change"
duration: ~4.8m
completed: 2026-01-31
---

# Phase 4 Plan 1: Vote Data Foundation Summary

**Vote model with compound unique constraint, matchup status lifecycle, bracket voting preferences, vote DAL with idempotent upsert, and server-side Supabase Broadcast via REST API.**

## Performance

- **Duration:** ~4.8 minutes
- **Start:** 2026-01-31T13:23:34Z
- **End:** 2026-01-31T13:28:21Z
- **Tasks:** 2/2 completed
- **Type checks:** Zero new errors introduced

## Accomplishments

1. **Vote Model** -- Added to Prisma schema with `@@unique([matchupId, participantId])` compound constraint, cascade deletes from Matchup and StudentParticipant, indexes on matchupId and participantId. Database synced via `prisma db push`.

2. **Matchup Status Field** -- Added `status` field defaulting to "pending" with application-level transition validation (pending -> voting -> decided). Enables per-matchup voting lifecycle control independent of bracket status.

3. **Bracket Voting Preferences** -- Added `viewingMode` (simple/advanced), `showVoteCounts` (boolean), and `votingTimerSeconds` (nullable int) to Bracket model. Teachers control how students experience voting.

4. **Vote Types** -- Created TypeScript types: MatchupStatus, ViewingMode, VoteData, VoteCounts, MatchupVoteState. These are the contracts for all Phase 4 UI components.

5. **Vote DAL** -- Eight functions covering the full vote lifecycle: castVoteDAL (upsert), getVoteCountsForMatchup (groupBy), hasVoted (findUnique), getMatchupVoteSummary (parallel fetch), getVoterParticipantIds (participation grid), getMatchupStatus, updateMatchupStatus (with transition validation), openMatchupsForVoting (batch updateMany).

6. **Broadcast Helper** -- Four functions for server-side real-time messaging via Supabase REST API: broadcastMessage (low-level), broadcastVoteUpdate (vote counts), broadcastBracketUpdate (lifecycle events), broadcastActivityUpdate (session activity refresh). Uses raw fetch, never the Supabase client library.

7. **Validation Schemas** -- Four Zod schemas added: castVoteSchema, advanceMatchupSchema, openVotingSchema, updateBracketVotingSettingsSchema. All with inferred TypeScript types.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Prisma schema + types + validation | d490aad | prisma/schema.prisma, src/types/vote.ts, src/lib/bracket/types.ts, src/lib/utils/validation.ts |
| 2 | Vote DAL + Broadcast helper | bfd350a | src/lib/dal/vote.ts, src/lib/realtime/broadcast.ts |

## Files Created

- `src/types/vote.ts` -- MatchupStatus, ViewingMode, VoteData, VoteCounts, MatchupVoteState types
- `src/lib/dal/vote.ts` -- 8 exported DAL functions for vote operations and matchup status management
- `src/lib/realtime/broadcast.ts` -- 4 exported functions for server-side Supabase Realtime broadcast

## Files Modified

- `prisma/schema.prisma` -- Vote model, Matchup.status, Bracket voting fields, relation fields on StudentParticipant/Matchup/BracketEntrant
- `src/lib/bracket/types.ts` -- Added status to MatchupData, viewingMode/showVoteCounts/votingTimerSeconds to BracketData
- `src/lib/utils/validation.ts` -- 4 vote validation schemas with inferred types
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` -- Updated serialization to include new Bracket and Matchup fields

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Compound unique on (matchupId, participantId) | Enables upsert pattern -- one vote per student per matchup, race-safe at database level |
| String status field (not enum) | Matches existing Bracket.status pattern, allows flexible transition rules in application code |
| REST API broadcast (not Supabase client) | Server actions are stateless -- no persistent WebSocket connection possible |
| Best-effort broadcast (never throws) | Real-time is UX enhancement, not correctness requirement -- vote must succeed even if broadcast fails |
| updateMany for batch open | Single query for opening multiple matchups, only affects "pending" status for safety |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated bracket detail page serialization for new fields**

- **Found during:** Task 1
- **Issue:** Adding `status` to MatchupData and voting fields to BracketData caused type errors in the bracket detail page, which manually maps Prisma model fields to serialized interfaces
- **Fix:** Added `status: m.status` to matchup serialization, `viewingMode`, `showVoteCounts`, `votingTimerSeconds` to bracket serialization in `src/app/(dashboard)/brackets/[bracketId]/page.tsx`
- **Files modified:** src/app/(dashboard)/brackets/[bracketId]/page.tsx
- **Commit:** d490aad

## Issues Encountered

None -- schema push and type checking both passed cleanly.

## Next Phase Readiness

- **04-02 (Bracket Advancement):** Matchup.status field is available for advancement logic. Vote model exists for undo-blocked-by-votes checks.
- **04-03 (Cast Vote Action):** castVoteDAL and broadcastVoteUpdate are ready to be composed into a server action.
- **04-04 (Teacher Voting Controls):** updateMatchupStatus, openMatchupsForVoting, and broadcastBracketUpdate provide the full control layer.
- **04-05 (Student Voting UI):** MatchupVoteState and VoteCounts types define the data contract for components.
- **04-06 (Real-time Subscriptions):** Broadcast events are defined and ready for client-side channel subscription.

No blockers for any subsequent Phase 4 plan.
