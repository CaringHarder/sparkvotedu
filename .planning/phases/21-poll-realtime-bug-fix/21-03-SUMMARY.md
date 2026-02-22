---
phase: 21-poll-realtime-bug-fix
plan: 03
subsystem: realtime
tags: [supabase, broadcast, websocket, participant-join, react-hooks]

# Dependency graph
requires:
  - phase: 21-poll-realtime-bug-fix
    plan: 01
    provides: "Dual-channel broadcast infrastructure, dynamic participantCount in poll state API"
  - phase: 21-poll-realtime-bug-fix
    plan: 02
    provides: "Teacher dashboard dynamic participation display with SSR fallback"
provides:
  - "broadcastParticipantJoined function for participant_joined events on activities channel"
  - "Fire-and-forget broadcast in joinSession and joinSessionByName after new participant creation"
  - "useRealtimePoll subscribes to activities:{sessionId} for participant_joined events, triggering participantCount refresh"
affects: [teacher-dashboard, poll-live-view, student-join-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Participant-join broadcast pattern: server emits participant_joined on activities channel, client hook re-fetches poll state"

key-files:
  created: []
  modified:
    - src/lib/realtime/broadcast.ts
    - src/actions/student.ts
    - src/hooks/use-realtime-poll.ts
    - src/components/poll/poll-results.tsx

key-decisions:
  - "broadcastParticipantJoined uses activities:{sessionId} channel (same as broadcastActivityUpdate) with distinct event name participant_joined"
  - "Fire-and-forget .catch(() => {}) pattern on broadcast calls ensures join flow never breaks due to broadcast failure"
  - "useRealtimePoll subscribes to activities:{sessionId} channel (not a custom name) so broadcast topic matching works correctly"

patterns-established:
  - "Participant-join broadcast: new participant creation triggers best-effort broadcast, teacher hooks re-fetch on receive"

requirements-completed: [FIX-01]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 21 Plan 03: Participant-Join Broadcast for Stale Denominator Fix Summary

**broadcastParticipantJoined wired into both join flows with useRealtimePoll subscription to participant_joined events for live participantCount updates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T02:50:59Z
- **Completed:** 2026-02-22T02:53:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- UAT Test 3 gap closed: teacher dashboard "X of Y voted" denominator now updates within seconds when a new student joins a session with an active poll
- broadcastParticipantJoined function broadcasts participant_joined event on activities:{sessionId} channel
- Both joinSession (legacy device flow) and joinSessionByName (name-based flow) emit the broadcast after creating a new participant
- useRealtimePoll subscribes to activities:{sessionId} for participant_joined events and re-fetches poll state to update participantCount

## Task Commits

Each task was committed atomically:

1. **Task 1: Add broadcastParticipantJoined and wire into join flows** - `104e7f6` (feat)
2. **Task 2: Subscribe useRealtimePoll to participant_joined events** - `5c0bf12` (feat)

## Files Created/Modified
- `src/lib/realtime/broadcast.ts` - Added broadcastParticipantJoined function (broadcasts participant_joined event on activities:{sessionId} channel)
- `src/actions/student.ts` - Imported broadcastParticipantJoined; added fire-and-forget calls after createParticipant in both joinSession and joinSessionByName
- `src/hooks/use-realtime-poll.ts` - Added optional sessionId parameter; subscribes to activities:{sessionId} for participant_joined events; triggers fetchPollState on receive; cleanup removes activities channel
- `src/components/poll/poll-results.tsx` - Updated useRealtimePoll call to pass poll.sessionId

## Decisions Made
- broadcastParticipantJoined uses the same activities:{sessionId} channel as broadcastActivityUpdate but with a distinct event name (participant_joined vs activity_update) -- Supabase Broadcast requires topic match between sender and receiver
- Fire-and-forget .catch(() => {}) pattern ensures broadcast failure never breaks the student join flow, matching the best-effort broadcast convention used throughout the codebase
- useRealtimePoll subscribes to activities:{sessionId} as the channel name (not a custom client-side name) because Supabase Broadcast channels must match the server-side topic exactly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete participant-join broadcast pipeline: server emit -> client receive -> re-fetch -> UI update
- All three plans in Phase 21 are now complete: broadcast wiring (01), dashboard display (02), and participant-join gap closure (03)
- The full poll realtime system is wired end-to-end: lifecycle broadcasts, dynamic participation counts, and participant join detection
- Ready for Phase 22 or further classroom hardening

## Self-Check: PASSED

All files exist, all commits verified (104e7f6, 5c0bf12).

---
*Phase: 21-poll-realtime-bug-fix*
*Completed: 2026-02-21*
