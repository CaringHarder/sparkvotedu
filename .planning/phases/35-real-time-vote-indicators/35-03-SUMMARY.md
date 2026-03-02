---
phase: 35-real-time-vote-indicators
plan: 03
subsystem: ui
tags: [supabase, realtime, participation-sidebar, poll, presence]

# Dependency graph
requires:
  - phase: 35-real-time-vote-indicators
    plan: 01
    provides: "participantId in broadcast payloads and voterIds in poll state API"
provides:
  - "voterIds tracking in useRealtimePoll hook"
  - "ParticipationSidebar on poll live dashboard with real-time vote indicators"
  - "SSR participant and voterIds loading for poll live page"
affects: [35-04]

# Tech tracking
tech-stack:
  added: []
  patterns: ["dual useRealtimePoll subscription with Supabase channel deduplication", "merged SSR + realtime voterIds via useMemo"]

key-files:
  created: []
  modified:
    - "src/hooks/use-realtime-poll.ts"
    - "src/app/(dashboard)/polls/[pollId]/live/page.tsx"
    - "src/app/(dashboard)/polls/[pollId]/live/client.tsx"

key-decisions:
  - "Dual useRealtimePoll subscription is safe because Supabase deduplicates at the channel/transport level"
  - "Poll voterIds is flat array (not per-matchup) since polls have a single voting context"
  - "Pass poll.id as selectedMatchupId for stable truthy value in ParticipationSidebar"

patterns-established:
  - "Dual hook subscription: safe when Supabase channel name is identical (transport-level dedup)"
  - "Merged SSR + realtime IDs: useMemo combining initialVoterIds with realtime accumulation"

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 35 Plan 03: Poll Live Dashboard ParticipationSidebar Summary

**ParticipationSidebar with real-time green dot vote indicators added to poll live dashboard via dual useRealtimePoll subscription and SSR participant loading**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T04:32:19Z
- **Completed:** 2026-03-02T04:35:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useRealtimePoll hook now tracks voterIds from broadcast events and poll state API, returned alongside existing vote counts
- Poll live page fetches session participants and initial voterIds at SSR time via parallel Promise.all
- PollLiveClient renders ParticipationSidebar with real-time voter tracking, session presence, and merged SSR + realtime voterIds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add voterIds tracking to useRealtimePoll hook** - `6d8bdaa` (feat)
2. **Task 2: Add ParticipationSidebar to poll live dashboard with SSR data** - `1823e82` (feat)

## Files Created/Modified
- `src/hooks/use-realtime-poll.ts` - Added voterIds state, pendingVoterIds ref, participantId extraction from broadcast, voterIds in return value
- `src/app/(dashboard)/polls/[pollId]/live/page.tsx` - Fetch participants and initialVoterIds via Promise.all, pass to PollLiveClient
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` - Import ParticipationSidebar, useRealtimePoll, useSessionPresence; add sidebar with merged voterIds and connected status

## Decisions Made
- Dual useRealtimePoll subscription (one in PollResults, one in PollLiveClient) is safe because Supabase deduplicates at the WebSocket channel/transport level
- Poll voterIds is a flat array (not per-matchup like brackets) since a poll has a single voting context
- Pass poll.id as selectedMatchupId to ParticipationSidebar for a stable truthy value that enables vote summary display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Poll live dashboard now has full ParticipationSidebar matching the bracket live experience
- Plan 35-04 (student-facing vote indicators) can proceed independently
- All poll and bracket live dashboards now have real-time vote indicator sidebars

## Self-Check: PASSED
