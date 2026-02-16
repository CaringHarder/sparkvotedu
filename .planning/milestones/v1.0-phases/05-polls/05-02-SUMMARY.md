---
phase: 05-polls
plan: 02
subsystem: poll-backend
tags: [dal, server-actions, broadcast, feature-gates, api, voting, borda-count]
requires:
  - 05-01 (Poll/PollOption/PollVote Prisma models, types, Zod schemas, Borda functions)
  - 01-02 (getAuthenticatedTeacher, proxy auth pattern)
  - 04-01 (Broadcast REST API pattern)
  - 01-05 (Feature gate pure function pattern)
provides:
  - Complete poll DAL with CRUD, voting, aggregation functions
  - 7 server actions covering poll lifecycle (create, update, delete, status, assign, duplicate, vote)
  - broadcastPollVoteUpdate and broadcastPollUpdate broadcast functions
  - canUsePollType and canUsePollOptionCount feature gate functions
  - maxPollOptions in TIER_LIMITS (free=6, pro=12, pro_plus=32)
  - GET /api/polls/[pollId]/state polling fallback endpoint
  - /api/polls/* whitelisted in proxy for student access
affects:
  - 05-03 (Teacher poll UI calls createPoll, updatePoll, deletePoll, updatePollStatus actions)
  - 05-04 (Live results dashboard uses broadcastPollVoteUpdate channel and poll state API)
  - 05-05 (Student voting calls castPollVote action)
  - 05-06 (Results display uses poll state API with Borda scores)
tech-stack:
  added: []
  patterns:
    - "Poll DAL follows bracket DAL ownership pattern (findFirst with teacherId filter)"
    - "castPollVote is unauthenticated student action, matching castVote pattern from 04-03"
    - "Non-blocking broadcast (.catch(console.error)) prevents broadcast failures from breaking vote flow"
    - "Forward-only poll status transitions with closed->draft reopen path"
key-files:
  created:
    - src/lib/dal/poll.ts
    - src/actions/poll.ts
    - src/app/api/polls/[pollId]/state/route.ts
  modified:
    - src/lib/realtime/broadcast.ts
    - src/lib/gates/features.ts
    - src/lib/gates/tiers.ts
    - src/app/proxy.ts
key-decisions:
  - "Poll DAL uses same ownership verification pattern as bracket DAL (findFirst with teacherId)"
  - "castPollVote is unauthenticated (student action) with poll status + banned flag checks"
  - "Ranked poll broadcasts Borda scores as voteCounts for real-time leaderboard updates"
  - "Poll state API returns both voteCounts and bordaScores for ranked polls"
  - "maxPollOptions added to TIER_LIMITS: free=6, pro=12, pro_plus=32"
duration: ~3.1m
completed: 2026-01-31
---

# Phase 5 Plan 2: Poll Backend Summary

**Complete poll backend: DAL with 14 functions covering CRUD/voting/aggregation, 7 server actions with auth/validation/broadcast, feature gates for poll type and option count, broadcast extensions for real-time vote updates, and polling fallback API endpoint.**

## Performance

- **Duration:** ~3.1 minutes
- **Start:** 2026-01-31T22:17:25Z
- **End:** 2026-01-31T22:20:33Z
- **Tasks:** 2/2 completed
- **Type checks:** Zero new errors introduced

## Accomplishments

1. **Poll DAL (src/lib/dal/poll.ts, 281 lines)** -- 14 functions covering complete poll lifecycle:
   - CRUD: createPollDAL, getPollByIdDAL, getPollsByTeacherDAL, getPollsBySessionDAL, updatePollDAL, deletePollDAL
   - Lifecycle: updatePollStatusDAL with forward-only transitions (draft->active, active->closed, closed->archived, closed->draft)
   - Session: assignPollToSessionDAL, duplicatePollDAL (copies poll + options, resets to draft)
   - Voting: castSimplePollVoteDAL (upsert with compound unique), castRankedPollVoteDAL (delete+insert transaction)
   - Aggregation: getSimplePollVoteCounts (groupBy), getRankedPollVotes (raw data for Borda), getPollParticipantVote (vote restoration)

2. **Server Actions (src/actions/poll.ts, 283 lines)** -- 7 server actions:
   - Teacher actions: createPoll, updatePoll, deletePoll, updatePollStatus, assignPollToSession, duplicatePoll
   - Student action: castPollVote (unauthenticated, validates poll status + participant not banned + vote changeability)
   - Feature gates enforced on createPoll: canUsePollType and canUsePollOptionCount
   - Non-blocking broadcast after vote cast and status changes

3. **Broadcast Extensions** -- Two new functions added to broadcast.ts:
   - broadcastPollVoteUpdate: sends vote counts to poll:${pollId} channel
   - broadcastPollUpdate: sends lifecycle events (poll_activated, poll_closed, poll_archived)

4. **Feature Gates** -- Two new pure functions added to features.ts:
   - canUsePollType: free=simple only, pro/pro_plus=simple+ranked
   - canUsePollOptionCount: free=6, pro=12, pro_plus=32

5. **Tier Limits Update** -- maxPollOptions added to all three tiers in TIER_LIMITS

6. **Proxy Update** -- /api/polls/* routes whitelisted as public pages for student access

7. **Poll State API (GET /api/polls/[pollId]/state)** -- Returns poll data with:
   - Options (ordered by position)
   - Vote counts per option
   - Borda scores for ranked polls (computed from raw votes)
   - Total votes count

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Poll DAL with CRUD, voting, aggregation | 76fdd43 | src/lib/dal/poll.ts |
| 2 | Server actions, broadcast, gates, proxy, API | f39e8ed | src/actions/poll.ts, src/lib/realtime/broadcast.ts, src/lib/gates/features.ts, src/lib/gates/tiers.ts, src/app/proxy.ts, src/app/api/polls/[pollId]/state/route.ts |

## Files Created

- `src/lib/dal/poll.ts` -- 14 DAL functions for poll CRUD, voting, and aggregation
- `src/actions/poll.ts` -- 7 server actions for poll operations
- `src/app/api/polls/[pollId]/state/route.ts` -- GET endpoint for polling fallback

## Files Modified

- `src/lib/realtime/broadcast.ts` -- Added broadcastPollVoteUpdate and broadcastPollUpdate
- `src/lib/gates/features.ts` -- Added canUsePollType and canUsePollOptionCount
- `src/lib/gates/tiers.ts` -- Added maxPollOptions to each tier
- `src/app/proxy.ts` -- Whitelisted /api/polls/* as public pages

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Poll DAL ownership via findFirst with teacherId | Matches bracket DAL pattern from 04-03; prevents cross-teacher access |
| castPollVote is unauthenticated student action | Matches castVote pattern from 04-03; validates poll status + banned flag instead |
| Ranked poll broadcasts Borda scores as voteCounts | Allows real-time leaderboard updates without client-side Borda computation |
| Poll state API returns both voteCounts and bordaScores | Simple polls use voteCounts directly; ranked polls get Borda scores for leaderboard display |
| maxPollOptions: free=6, pro=12, pro_plus=32 | CONTEXT.md specification for option count tiers |
| Forward-only transitions with closed->draft reopen | Teachers can reopen closed polls to collect more votes |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None -- all files compiled cleanly, no type errors.

## Next Phase Readiness

- **05-03 (Teacher Poll UI):** All 7 server actions are ready for form submissions and lifecycle management.
- **05-04 (Live Results):** Broadcast functions and poll state API provide real-time data channels.
- **05-05 (Student Voting):** castPollVote action handles both simple and ranked polls.
- **05-06 (Results/Charts):** Poll state API returns Borda scores for ranked result display.

No blockers for any subsequent Phase 5 plan.
