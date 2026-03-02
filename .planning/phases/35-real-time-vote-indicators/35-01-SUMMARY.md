---
phase: 35-real-time-vote-indicators
plan: 01
subsystem: api
tags: [supabase, realtime, broadcast, polling-fallback, prisma]

# Dependency graph
requires:
  - phase: 29-live-pause-resume
    provides: "broadcast infrastructure and realtime channel patterns"
provides:
  - "broadcastVoteUpdate and broadcastPollVoteUpdate with participantId in payloads"
  - "getPollVoterParticipantIds DAL function for voter ID retrieval"
  - "voterIds per matchup in bracket state polling API"
  - "voterIds array in poll state polling API"
affects: [35-02, 35-03, 35-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["optional spread for backward-compatible payload extension", "parallel Promise.all for voterIds + voteCounts fetching"]

key-files:
  created: []
  modified:
    - "src/lib/realtime/broadcast.ts"
    - "src/actions/vote.ts"
    - "src/actions/poll.ts"
    - "src/lib/dal/poll.ts"
    - "src/app/api/brackets/[bracketId]/state/route.ts"
    - "src/app/api/polls/[pollId]/state/route.ts"

key-decisions:
  - "Optional spread pattern for participantId keeps broadcast backward-compatible"
  - "Poll voterIds uses rank=1 filter for one-row-per-voter across simple and ranked polls"
  - "Bracket state API fetches voterIds in parallel with voteCounts via Promise.all"
  - "Poll state API starts voterIds fetch early as promise for parallel execution"

patterns-established:
  - "Optional payload extension: ...(field ? { field } : {}) for backward-compatible broadcast payloads"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 35 Plan 01: Vote Data Plumbing Summary

**participantId added to vote broadcast payloads and voterIds exposed through both polling fallback APIs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T04:27:30Z
- **Completed:** 2026-03-02T04:29:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Broadcast payloads for both bracket votes and poll votes now include participantId, enabling clients to identify WHO voted
- New getPollVoterParticipantIds DAL function returns distinct voter IDs for a poll using rank=1 filter
- Bracket state polling API returns voterIds per matchup for polling fallback transport
- Poll state polling API returns voterIds array for polling fallback transport

## Task Commits

Each task was committed atomically:

1. **Task 1: Add participantId to broadcast functions and wire through server actions** - `c4d24ce` (feat)
2. **Task 2: Add voterIds to polling fallback APIs and create poll voter DAL function** - `68a180f` (feat)

## Files Created/Modified
- `src/lib/realtime/broadcast.ts` - Added optional participantId param to broadcastVoteUpdate and broadcastPollVoteUpdate
- `src/actions/vote.ts` - Pass participantId to broadcastVoteUpdate in castVote
- `src/actions/poll.ts` - Pass participantId to broadcastPollVoteUpdate in both simple and ranked vote paths
- `src/lib/dal/poll.ts` - New getPollVoterParticipantIds function using rank=1 distinct query
- `src/app/api/brackets/[bracketId]/state/route.ts` - Added voterIds per matchup via parallel getVoterParticipantIds call
- `src/app/api/polls/[pollId]/state/route.ts` - Added voterIds to response via getPollVoterParticipantIds

## Decisions Made
- Optional spread pattern `...(participantId ? { participantId } : {})` keeps broadcast backward-compatible with existing consumers
- Poll voterIds uses `rank: 1` filter for one-row-per-voter across both simple and ranked polls
- Bracket state API fetches voterIds in parallel with voteCounts via Promise.all for no added latency
- Poll state API starts voterIds fetch early as a promise for parallel execution with vote count computation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 35-02 through 35-04 can now consume participantId from broadcast payloads
- Polling fallback APIs provide voterIds for clients that cannot use WebSocket
- All data plumbing in place for client-side vote indicator hooks and UI components

## Self-Check: PASSED

All 6 modified files exist on disk. Both task commits (c4d24ce, 68a180f) verified in git log.

---
*Phase: 35-real-time-vote-indicators*
*Completed: 2026-03-02*
