---
phase: 04-voting-and-real-time
plan: 03
subsystem: voting-actions-and-hooks
tags: [server-actions, real-time, optimistic-ui, websocket, polling-fallback, react-19]
requires: ["04-01", "04-02"]
provides:
  - "Vote casting server action with status/banned validation"
  - "Bracket advancement server actions (advance, undo, batch, open voting, settings)"
  - "Real-time bracket hook with 2s batched vote updates"
  - "Optimistic vote hook using React 19 useOptimistic"
  - "Transport fallback hook (WebSocket -> HTTP polling)"
  - "Bracket state polling API endpoint"
affects: ["04-04", "04-05", "04-06"]
tech-stack:
  added: []
  patterns:
    - "useOptimistic + startTransition for optimistic server action feedback"
    - "useRef accumulator + setInterval flush for batched real-time updates"
    - "5-second WebSocket timeout with automatic HTTP polling fallback"
    - "Non-blocking broadcast (.catch(console.error)) in server actions"
key-files:
  created:
    - src/actions/vote.ts
    - src/actions/bracket-advance.ts
    - src/hooks/use-realtime-bracket.ts
    - src/hooks/use-vote.ts
    - src/hooks/use-transport-fallback.ts
    - src/app/api/brackets/[bracketId]/state/route.ts
  modified:
    - src/app/proxy.ts
key-decisions:
  - "castVote is unauthenticated (student action) -- validates matchup status and banned flag instead of teacher auth"
  - "All bracket-advance actions verify teacher ownership via findFirst with teacherId filter"
  - "Vote broadcasts are non-blocking to prevent broadcast failures from breaking the vote flow"
  - "useRef accumulator batches vote_update events; bracket_update events trigger immediate full refetch"
  - "Transport fallback uses 5s timeout for WebSocket, 3s interval for polling -- balances responsiveness with server load"
  - "/api/brackets/ routes added as public pages in proxy for student polling access"
duration: "3m 46s"
completed: 2026-01-31
---

# Phase 4 Plan 3: Server Actions and Real-Time Hooks Summary

**Server actions bridge DAL to frontend: castVote with status/banned checks, 5 bracket-advance actions with teacher ownership, real-time hooks with 2s batched vote updates, React 19 useOptimistic instant feedback, and 5s WebSocket fallback to HTTP polling for school networks.**

## Performance

- **Duration:** 3m 46s
- **Tasks:** 2/2 completed
- **TypeScript:** Zero errors on all checks
- **Deviations:** None

## Accomplishments

### Task 1: Vote Casting and Bracket Advancement Server Actions
- `castVote` validates matchup is in "voting" status, checks participant is not banned, upserts via DAL, broadcasts updated vote counts non-blocking
- `advanceMatchup` verifies teacher ownership, calls advancement engine, broadcasts winner_selected, detects bracket completion
- `undoAdvancement` clears winner with engine undo, broadcasts undo event, preserves error messages from engine
- `openMatchupsForVoting` batch opens pending matchups to voting status via DAL updateMany
- `batchAdvanceRound` finds matchups with winnerId+voting status, advances each, checks completion
- `updateBracketVotingSettings` updates viewingMode, showVoteCounts, votingTimerSeconds with ownership check

### Task 2: Real-Time Hooks, Optimistic Vote, Transport Fallback, and Bracket State API
- `useRealtimeBracket` subscribes to Supabase Broadcast channel, accumulates vote_update events in useRef, flushes to state every 2 seconds to prevent re-render storms in 30+ student classrooms
- `useVote` uses React 19 useOptimistic with startTransition for instant vote feedback; auto-reverts on server error
- `useTransportFallback` attempts WebSocket connection, switches to 3s HTTP polling after 5s timeout for school networks blocking WebSocket
- `GET /api/brackets/[bracketId]/state` returns bracket with matchups, vote counts per matchup, and entrants
- Proxy updated with `/api/brackets/` public route for unauthenticated student polling access

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Vote casting and bracket advancement server actions | 13d8c5a | src/actions/vote.ts, src/actions/bracket-advance.ts |
| 2 | Real-time hooks, optimistic vote, transport fallback, and bracket state API | dedfce2 | src/hooks/use-realtime-bracket.ts, src/hooks/use-vote.ts, src/hooks/use-transport-fallback.ts, src/app/api/brackets/[bracketId]/state/route.ts, src/app/proxy.ts |

## Files Created

| File | Purpose | Exports |
|------|---------|---------|
| src/actions/vote.ts | Vote casting server action | castVote |
| src/actions/bracket-advance.ts | Bracket advancement server actions | advanceMatchup, undoAdvancement, openMatchupsForVoting, batchAdvanceRound, updateBracketVotingSettings |
| src/hooks/use-realtime-bracket.ts | Real-time bracket subscription with batched updates | useRealtimeBracket |
| src/hooks/use-vote.ts | Optimistic vote hook | useVote |
| src/hooks/use-transport-fallback.ts | WebSocket fallback detection | useTransportFallback |
| src/app/api/brackets/[bracketId]/state/route.ts | Bracket state API for polling | GET |

## Files Modified

| File | Change |
|------|--------|
| src/app/proxy.ts | Added /api/brackets/ as public route for student polling fallback |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| castVote is unauthenticated (student action) | Students don't have teacher accounts; validation via matchup status + banned flag provides security |
| All bracket-advance actions verify teacher ownership | findFirst with teacherId filter ensures teachers can only modify their own brackets |
| Non-blocking broadcast in server actions | .catch(console.error) prevents broadcast failures from breaking the vote flow (04-01 pattern) |
| useRef accumulator for vote batching | Direct setState on each vote_update event would cause re-render storms with 30+ students |
| bracket_update events trigger immediate refetch | Structural changes (winner, round advance) need instant UI feedback unlike incremental vote counts |
| 5s WebSocket timeout, 3s poll interval | Balances fast failure detection with reasonable server load for polling fallback |
| /api/brackets/ routes public in proxy | Students access polling endpoint without authentication |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Plan 04-03 provides all the server actions and client hooks needed for the voting UI (Plan 04-04) and live bracket view (Plan 04-05):

- **Actions ready:** castVote, advanceMatchup, undoAdvancement, openMatchupsForVoting, batchAdvanceRound, updateBracketVotingSettings
- **Hooks ready:** useRealtimeBracket (real-time state), useVote (optimistic voting), useTransportFallback (WebSocket fallback)
- **API ready:** GET /api/brackets/[bracketId]/state for polling
- **No blockers** for Plans 04-04, 04-05, or 04-06
