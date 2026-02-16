---
status: diagnosed
trigger: "Investigate why the poll winner reveal animation is not showing when a poll is closed."
created: 2026-01-31T00:00:00Z
updated: 2026-01-31T00:50:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Status change from 'active' to 'closed' is being detected but prevStatusRef.current is already 'closed' on initial mount
test: Analyzing the status change detection logic in poll-results.tsx and how initial status vs real-time status interact
expecting: Find that prevStatusRef initialization doesn't match the pattern needed to catch the transition
next_action: Document findings and trace vote retabulation issue

## Symptoms

expected: When teacher closes poll from /polls/[pollId]/live, dark overlay appears, winning option scales up with "Winner!" label, confetti bursts, auto-dismiss on both teacher and student pages
actual: No reveal animation appears on either teacher or student page when poll is closed
errors: None reported
reproduction: Close a poll from the live results page
started: Unknown - implemented in plan 05-05 but not working

## Additional Symptom

expected: When student changes vote, previous vote is removed from count
actual: Vote is added but previous vote not removed (live view only, presentation view shows correct counts)
errors: None reported
reproduction: Student changes vote while teacher views live results
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-01-31T00:15:00Z
  checked: src/components/poll/poll-results.tsx lines 46-59
  found: prevStatusRef initialized to poll.status (from server), liveStatus computed from pollStatus hook, useEffect detects transition from prevStatusRef.current === 'active' to liveStatus === 'closed'
  implication: If poll is already closed when component mounts, prevStatusRef.current starts as 'closed', so the transition never triggers

- timestamp: 2026-01-31T00:18:00Z
  checked: src/hooks/use-realtime-poll.ts lines 41-119
  found: pollStatus state initialized to 'draft', then updated via fetchPollState or broadcast events. When poll_closed broadcast received, fetchPollState is called immediately (line 111)
  implication: The hook fetches fresh state after poll_closed event, but this happens BEFORE prevStatusRef can capture the 'active' state

- timestamp: 2026-01-31T00:22:00Z
  checked: src/actions/poll.ts lines 159-199 and src/lib/realtime/broadcast.ts lines 152-162
  found: updatePollStatus action calls broadcastPollUpdate(pollId, 'poll_closed') when status changed to 'closed' (line 185)
  implication: Broadcast is sent, but the issue is in the consumer (poll-results.tsx) not properly catching the transition

- timestamp: 2026-01-31T00:25:00Z
  checked: src/components/poll/poll-reveal.tsx lines 1-133
  found: PollReveal component exists and is properly implemented with confetti, auto-dismiss, proper animations
  implication: The reveal component itself is correct - the problem is it's never shown because showReveal never becomes true

- timestamp: 2026-01-31T00:28:00Z
  checked: Vote retabulation - src/hooks/use-realtime-poll.ts lines 73-86 and 92-101
  found: Batching logic uses spread operator {...prev, ...pending} to merge vote counts. When a vote changes from option A to option B, broadcast sends { B: newCount }, which gets merged with prev containing { A: oldCount, B: oldCount }. Result: { A: oldCount (NOT decremented), B: newCount }
  implication: The batch merge doesn't replace all vote counts - it only updates the keys present in the broadcast payload. Missing full replacement of voteCounts.

- timestamp: 2026-01-31T00:32:00Z
  checked: src/actions/poll.ts lines 363-366
  found: After castSimplePollVoteDAL (which uses upsert, correctly replacing old vote), the broadcast calls getSimplePollVoteCounts which returns ALL option counts. Total object with all keys is sent.
  implication: Broadcast actually sends complete vote counts, so the batching merge should work. Need to verify broadcast payload structure.

- timestamp: 2026-01-31T00:35:00Z
  checked: src/lib/dal/poll.ts line 280-292 (castSimplePollVoteDAL)
  found: Uses prisma.pollVote.upsert with where clause pollId_participantId_rank, updating optionId. This correctly changes the vote from old option to new option in a single row.
  implication: Database is correctly updated - only one vote per participant. The retabulation issue must be in the broadcast/subscription layer.

- timestamp: 2026-01-31T00:40:00Z
  checked: src/app/api/polls/[pollId]/state/route.ts line 40-42
  found: API endpoint also calls getSimplePollVoteCounts, returning sparse object
  implication: Polling transport (HTTP fallback) has the same issue as WebSocket. Both return incomplete vote counts.

- timestamp: 2026-01-31T00:42:00Z
  checked: src/hooks/use-realtime-poll.ts lines 50-66 (fetchPollState function)
  found: fetchPollState calls API and does setVoteCounts(data.voteCounts) - full replacement, not merge
  implication: When polling transport refetches every 3 seconds, it REPLACES voteCounts entirely (line 56), not merging. This would show correct counts! The issue only affects WebSocket batched updates.

- timestamp: 2026-01-31T00:45:00Z
  checked: Comparison of WebSocket vs polling vote count updates
  found:
    - WebSocket path: broadcast -> batch accumulate (line 99) -> merge with spread (line 80)
    - Polling path: fetch API -> full replace (line 56)
  implication: Presentation mode likely used polling transport (slow network or WebSocket blocked), which explains why it shows correct counts. The bug only manifests with WebSocket transport's batched merge.

- timestamp: 2026-01-31T00:48:00Z
  checked: Student poll page - src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
  found: Student page shows "This poll has been closed" message when status=closed (lines 203-219). No PollResults component, no reveal animation.
  implication: Student page was never intended to show winner reveal animation. The reveal is only for teacher live view and presentation mode. User expectation may be wrong, or student reveal was planned but not implemented.

## Resolution

root_cause: |
  **Issue 1: Winner reveal animation not triggered**

  Location: src/components/poll/poll-results.tsx lines 46-59

  The reveal animation depends on detecting a status transition from 'active' to 'closed'.
  The detection logic uses prevStatusRef initialized to poll.status (server prop).

  Flow when teacher closes poll:
  1. Teacher clicks "Close Poll" in client.tsx (line 122)
  2. handleStatusChange calls updatePollStatus action (line 67)
  3. Action updates DB, broadcasts poll_closed, calls router.refresh() (client.tsx line 72)
  4. Page re-renders with poll.status = 'closed' from server
  5. PollResults mounts with poll.status = 'closed'
  6. prevStatusRef.current is initialized to 'closed' (line 46)
  7. Real-time hook receives poll_closed broadcast, fetches state (already 'closed')
  8. useEffect checks: prevStatusRef.current === 'active' (FALSE - it's 'closed') && liveStatus === 'closed' (TRUE)
  9. Condition fails, setShowReveal(true) never called

  Root cause: prevStatusRef is initialized AFTER the status change has occurred on the server.
  The page refresh happens before the real-time broadcast can update the client state,
  so the component never "sees" the transition from active to closed.

  **Issue 2: Vote retabulation (previous vote not decremented on live view)**

  Location: src/lib/dal/poll.ts lines 332-345 (getSimplePollVoteCounts)
           src/hooks/use-realtime-poll.ts lines 73-86 (batching merge)

  When a student changes their vote from option A to option B:
  1. Database correctly updates (upsert replaces optionId) - only one vote per participant
  2. castPollVote action calls getSimplePollVoteCounts (actions/poll.ts line 364)
  3. getSimplePollVoteCounts groups votes by optionId - returns { B: 5, C: 3 } (option A now has 0, omitted)
  4. Broadcast sends { voteCounts: { B: 5, C: 3 }, totalVotes: 8 }
  5. Real-time hook's batch merge: setVoteCounts(prev => ({...prev, ...pending}))
  6. If prev = { A: 1, B: 4, C: 3 } and pending = { B: 5, C: 3 }, result = { A: 1, B: 5, C: 3 }
  7. Option A's old count (1) persists because it's not in the pending update

  Root cause: getSimplePollVoteCounts only returns options with votes > 0 (sparse object).
  The batch merge logic doesn't replace the entire voteCounts object - it spreads/merges.
  Options that drop to 0 votes are omitted from broadcast, so their old counts persist in state.

  Additional observation: Presentation mode uses the same PollResults component with the same
  real-time hook, so it should have the same issue. However, the user reports presentation view
  shows correct counts. This could mean:
  - User tested presentation mode with polling transport (HTTP fallback), which calls full API every 3s
  - Or presentation mode was opened AFTER the vote change, seeing fresh initial state
  - The polling fallback (fetchPollState) uses /api/polls/[pollId]/state which also calls
    getSimplePollVoteCounts (line 41), so it has the same sparse object issue
  - Need to verify if polling transport actually shows correct counts or if this was a timing artifact

fix:
verification:
files_changed: []
