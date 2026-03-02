# Phase 35: Real-Time Vote Indicators - Research

**Researched:** 2026-03-01
**Domain:** Real-time UI updates, Supabase Broadcast, ParticipationSidebar enhancement
**Confidence:** HIGH

## Summary

Phase 35 adds per-student green dot vote indicators to the existing ParticipationSidebar on the teacher's live dashboard. The sidebar already exists for brackets and already shows connected/voted status with colored dots -- but voter data does NOT update in real-time today. The current `currentVoterIds` in `live-dashboard.tsx` is derived solely from `initialVoterIds` (SSR data) and never refreshes from broadcast events. This is the core gap.

The implementation requires two main changes: (1) augmenting the existing broadcast payloads to include `participantId` so the client can track WHO voted (not just aggregate counts), and (2) extending the sidebar to the poll live dashboard which currently has no sidebar at all. For predictive brackets, the `prediction_submitted` broadcast event already includes `participantId`, so that data path exists -- it just needs to be consumed by the sidebar.

**Primary recommendation:** Extend the existing `vote_update` and `poll_vote_update` broadcast payloads to include `participantId`, accumulate voter IDs in the realtime hooks alongside vote counts, and wire the ParticipationSidebar into the poll live client.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Small solid green dot next to each student's name -- simple status indicator style
- No animation on arrival -- dot appears instantly when vote is recorded
- Indicators live in the existing ParticipationSidebar -- no new UI sections
- Live dashboard only -- detail page stays as-is
- Not-voted students float to the top of the list -- teacher immediately sees who's still missing
- No visual separator between not-voted and voted groups -- sort order + dot presence is enough
- Late joiners appear in the not-voted group immediately without a dot
- Dots reset completely when a bracket advances to a new round -- shows current round status only
- For Round Robin: green dot appears only after student has voted on ALL matchups in the round (not partial)
- For polls: dot appears when student has fully submitted their vote (accounts for poll type differences)
- For predictive brackets: dot appears only after student submits their complete prediction, not during partial fills
- On undo round advancement: dots reset for that round since votes were wiped

### Claude's Discretion
- Whether to show a vote progress summary (e.g., "7 of 12 voted") -- decide based on existing dashboard layout
- Which students to show (activity participants vs all session students) -- decide based on current sidebar data availability
- Vote indicator behavior during paused state -- decide based on current pause visual treatment
- Transition animation when student moves from not-voted to voted group -- decide what works with existing sidebar

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| Supabase Realtime (Broadcast) | Real-time vote event delivery | Extend existing payloads with participantId |
| React (useMemo, useState, useRef) | Client state management | Accumulate voterIds from broadcast events |
| Prisma | Database queries | New DAL functions for poll voter IDs, RR round voter IDs |
| Tailwind CSS | Styling | Green dot indicators and sort order changes |

### Supporting (already in project)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| `@/lib/realtime/broadcast.ts` | Server-side broadcast via REST API | Modify `broadcastVoteUpdate` and `broadcastPollVoteUpdate` signatures |
| `@/hooks/use-realtime-bracket.ts` | Client-side bracket subscription | Add voterIds accumulation |
| `@/hooks/use-realtime-poll.ts` | Client-side poll subscription | Add voterIds accumulation |
| `@/components/teacher/participation-sidebar.tsx` | Sidebar UI | Modify sort order, ensure green dot for active matchup |

### No new dependencies needed
This phase uses only existing libraries. No `npm install` required.

## Architecture Patterns

### Current Data Flow (Brackets)
```
[Student casts vote]
  -> actions/vote.ts: castVote()
    -> DAL: castVoteDAL() (upsert)
    -> DAL: getVoteCountsForMatchup() (aggregate counts)
    -> broadcast: broadcastVoteUpdate(bracketId, matchupId, voteCounts, totalVotes)
      // NOTE: participantId is NOT in the payload today

[Teacher's live dashboard]
  -> hooks/use-realtime-bracket.ts: useRealtimeBracket()
    -> listens for 'vote_update' events
    -> batches voteCounts updates (2s flush interval)
    -> does NOT track voterIds at all

[ParticipationSidebar]
  -> receives voterIds from initialVoterIds[selectedMatchupId]
  -> NEVER updates after SSR -- stale data
```

### Required Data Flow (Brackets)
```
[Student casts vote]
  -> actions/vote.ts: castVote()
    -> same DAL calls as before
    -> broadcast: broadcastVoteUpdate(bracketId, matchupId, voteCounts, totalVotes, participantId)
      // NEW: include participantId in payload

[Teacher's live dashboard]
  -> hooks/use-realtime-bracket.ts: useRealtimeBracket()
    -> 'vote_update' handler accumulates participantId into voterIds set per matchupId
    -> returns voterIds alongside voteCounts
    -> bracket_update events (round_advanced, round_undone) trigger voterIds reset

[ParticipationSidebar]
  -> receives merged voterIds (initial + realtime accumulated)
  -> sort: NOT-voted first, then voted
```

### Current Data Flow (Polls)
```
[Student casts poll vote]
  -> actions/poll.ts: castPollVote()
    -> broadcastPollVoteUpdate(pollId, voteCounts, totalVotes)
      // participantId NOT in payload

[Teacher's poll live dashboard]
  -> PollLiveClient -> PollResults -> useRealtimePoll()
    -> tracks voteCounts and totalVotes only
    -> NO ParticipationSidebar exists on poll live page
```

### Required Data Flow (Polls)
```
[Student casts poll vote]
  -> actions/poll.ts: castPollVote()
    -> broadcastPollVoteUpdate(pollId, voteCounts, totalVotes, participantId)
      // NEW: include participantId

[Teacher's poll live dashboard]
  -> PollLiveClient renders ParticipationSidebar (new)
  -> useRealtimePoll() returns voterIds
  -> Need to fetch participants list + session presence for poll live page
```

### Current Data Flow (Predictive Brackets)
```
[Student submits prediction]
  -> actions/prediction.ts: submitPrediction()
    -> broadcastBracketUpdate(bracketId, 'prediction_status_changed', {
         type: 'prediction_submitted',
         participantId,   // <-- Already included!
       })

[Teacher's live dashboard]
  -> useRealtimeBracket() handles 'prediction_status_changed' by calling fetchBracketState()
    -> Full state refetch -- does NOT accumulate participant info
```

### Pattern: Augmented Broadcast Payload
**What:** Add `participantId` to existing broadcast payloads for vote events
**Why this works:** The server action already has `participantId` in scope when broadcasting. Adding it is a one-line change per action. Clients can opt into tracking it.
**Risk level:** LOW -- additive change, existing consumers ignore unknown payload fields

### Pattern: Merged State (SSR initial + realtime accumulated)
**What:** Start with `initialVoterIds` from SSR, merge in `participantId` values from broadcast events
**Why this works:** This is exactly how `voteCounts` already works -- `mergedVoteCounts` in live-dashboard.tsx merges `initialVoteCounts` with `realtimeVoteCounts`.
**Example:**
```typescript
// In useRealtimeBracket -- accumulate voterIds per matchup
const pendingVoterUpdates = useRef<Record<string, Set<string>>>({})

// On vote_update event:
const { matchupId, participantId } = message.payload
if (participantId) {
  if (!pendingVoterUpdates.current[matchupId]) {
    pendingVoterUpdates.current[matchupId] = new Set()
  }
  pendingVoterUpdates.current[matchupId].add(participantId)
}

// On flush interval: merge into state
setVoterIds(prev => {
  const next = { ...prev }
  for (const [matchupId, pids] of Object.entries(pendingVoterUpdates.current)) {
    next[matchupId] = [...new Set([...(prev[matchupId] ?? []), ...pids])]
  }
  return next
})
```

### Anti-Patterns to Avoid
- **Refetching voter IDs from server on every vote:** Would defeat the purpose of real-time -- adds latency and DB load. Accumulate from broadcast instead.
- **Creating a separate broadcast channel for voter tracking:** The existing `bracket:{id}` and `poll:{id}` channels already carry vote events. Adding participantId to existing payloads avoids channel proliferation.
- **Polling the API for voter IDs:** The transport fallback already polls `/api/brackets/{id}/state` -- but that endpoint doesn't return voterIds today. If needed, extend it, but prefer broadcast-first.

## Key Findings by Activity Type

### SE/DE Brackets (Single/Double Elimination)
- **How voting works:** One matchup selected at a time. Student votes on one matchup -> one vote per matchup per student.
- **"Voted" definition:** Student has a Vote record for the selected matchup.
- **Current data:** `getVoterParticipantIds(matchupId)` already returns participant IDs who voted on a matchup. Initial data loaded in SSR.
- **Gap:** Real-time updates don't include participantId in broadcast.
- **Round reset:** When `batchAdvanceRound` or `advanceMatchup` is called, matchups advance. The sidebar shows voters for `selectedMatchupId`, and when the teacher selects a new round's matchup, voterIds naturally reset (new matchup = no votes yet).

### Round Robin (RR) Brackets
- **How voting works:** Multiple matchups per round (roundRobinRound). Students vote on ALL matchups in the round.
- **"Voted" definition (per user decision):** Green dot appears ONLY after student has voted on ALL matchups in the current round. Not partial.
- **Complexity:** Need to know all matchup IDs for the current RR round, then check that a student has voted on every one. Cannot use a single matchup's voterIds.
- **Data needed:** For each RR round, aggregate voter data across all matchups. A student is "complete" when their participantId appears in voterIds for ALL matchups in the round.
- **Round reset:** When RR round advances, new round's matchups have no votes.
- **Pacing modes:** `round_by_round` opens one round at a time; `all_at_once` opens all rounds. For `all_at_once`, the "current round" concept needs definition for indicator purposes.

### Predictive Brackets
- **How "voting" works:** Students submit complete bracket predictions (all matchups at once) before the bracket starts. Not per-matchup voting.
- **"Voted" definition:** Student has submitted their complete prediction (Prediction records exist for all non-bye matchups).
- **Existing broadcast:** `prediction_submitted` event already includes `participantId` -- this path exists.
- **Gap:** The live dashboard doesn't accumulate prediction submitters for sidebar display.
- **No "rounds":** Predictions are submitted once. Dots appear when prediction is submitted. No round-based reset needed (predictions don't change after submission).
- **Lifecycle:** predictionStatus: 'predictions_open' -> 'active'. During 'predictions_open', students submit. During 'active', teacher reveals results. Indicators are relevant during 'predictions_open'.

### Polls
- **How voting works:** Student selects an option (simple) or ranks options (ranked). One complete vote per student.
- **"Voted" definition:** Student has a PollVote record for the poll.
- **Current state:** Poll live page (`PollLiveClient`) has NO ParticipationSidebar at all.
- **Gap:** Need to (1) add sidebar to poll live page, (2) load participants for poll session, (3) add voterIds tracking to `useRealtimePoll`.
- **Data needed:** New DAL function `getPollVoterParticipantIds(pollId)` to get distinct participantIds from PollVote table.
- **Simple polls:** One PollVote per student (rank=1). Student voted = has any PollVote for that poll.
- **Ranked polls:** Multiple PollVote per student (one per rank). Student voted = has at least one PollVote for that poll (the ranked submission is atomic via transaction).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vote event batching | Custom batching logic | Existing `pendingUpdates.current` pattern in `useRealtimeBracket` | Already handles batching + flushing with `setInterval` |
| Participant presence tracking | Custom WebSocket presence | Existing `useSessionPresence` hook | Already uses Supabase Presence for connected/disconnected state |
| Transport fallback | Custom polling | Existing WebSocket -> HTTP polling fallback in realtime hooks | Already handles school networks that block WebSocket |

**Key insight:** The infrastructure for real-time updates is already built. This phase augments payloads and adds client-side accumulation -- no new real-time infrastructure needed.

## Common Pitfalls

### Pitfall 1: VoterIds Not Resetting on Round Change
**What goes wrong:** Teacher advances to next round, but sidebar still shows previous round's vote indicators.
**Why it happens:** Accumulated voterIds persist in state across round changes.
**How to avoid:** On `bracket_update` events with type `round_advanced` or `round_undone`, clear the accumulated voterIds state. The `fetchBracketState()` refetch that follows will provide fresh initial data.
**Warning signs:** Green dots persisting after the teacher advances the round.

### Pitfall 2: RR "All Matchups Voted" Logic Is Per-Round
**What goes wrong:** For RR, showing green dot when student voted on ANY matchup instead of ALL matchups in the round.
**Why it happens:** Using single-matchup voterIds logic for a multi-matchup activity type.
**How to avoid:** For RR, compute voted status as: "participantId appears in voterIds for EVERY matchup with `roundRobinRound === currentRound` and status `voting` or `decided`."
**Warning signs:** Premature green dots in RR brackets.

### Pitfall 3: Poll Live Page Missing Session Data
**What goes wrong:** Poll live page can't show sidebar because it doesn't load participants or session presence data.
**Why it happens:** The current `PollLiveClient` only receives poll data, vote counts, and session code -- no participant list.
**How to avoid:** Extend the poll live server page to fetch participants (like the bracket live page does), and pass them to the client. Also wire up `useSessionPresence` for connected state.
**Warning signs:** No sidebar rendering on poll live page.

### Pitfall 4: Broadcast Payload Change Breaking Existing Consumers
**What goes wrong:** Adding `participantId` to broadcast payload causes errors in existing event handlers.
**Why it happens:** If consumers destructure with strict typing.
**How to avoid:** The existing consumers use `as { ... }` type assertions that only destructure known fields. Additional fields are ignored. This is safe because JavaScript destructuring ignores extra keys.
**Warning signs:** TypeScript compilation errors in existing hooks.

### Pitfall 5: Sort Order Flip Causing Visual Jank
**What goes wrong:** Students rapidly jumping between top and bottom of the list as they vote, causing the list to feel unstable.
**Why it happens:** Each vote triggers a re-sort of the participant list.
**How to avoid:** The 2-second batching interval in the realtime hooks already provides natural debouncing. Multiple votes within a 2-second window batch together, so the re-sort happens once per flush, not per-vote.
**Warning signs:** List items visually jumping around rapidly during heavy voting.

### Pitfall 6: Stale VoterIds from Polling Fallback
**What goes wrong:** When transport falls back to HTTP polling, voterIds data may be stale because the `/api/brackets/{id}/state` endpoint doesn't return voterIds.
**Why it happens:** The state API returns matchup voteCounts but not per-matchup voter participant IDs.
**How to avoid:** Option A: Add a `voterIds` field to the state API response. Option B: Add a lightweight `/api/brackets/{id}/voters` endpoint for polling fallback. Option A is preferred -- consistent with the existing pattern.
**Warning signs:** Vote indicators not appearing for teachers on school networks (polling fallback).

## Discretion Area Recommendations

### Vote Progress Summary ("7 of 12 voted")
**Recommendation:** YES, show it. The ParticipationSidebar ALREADY shows this (`{votedCount}/{participants.length} voted` on line 91 of participation-sidebar.tsx) when a matchup is selected. This existing feature should continue working. For polls, add the same summary. No new UI needed -- it's already there.
**Confidence:** HIGH -- verified in existing code.

### Which Students to Show
**Recommendation:** Show activity participants (session students). The current bracket live page already fetches `StudentParticipant` records for the session (`prisma.studentParticipant.findMany({ where: { sessionId, banned: false } })`). For polls, fetch the same data. Do NOT show all session students if they haven't joined -- the sidebar already filters to non-banned participants.
**Confidence:** HIGH -- verified in existing SSR data loading.

### Vote Indicator During Paused State
**Recommendation:** Keep existing vote indicators visible during paused state. Students cannot cast new votes while paused (enforced server-side), but the teacher should still see who voted before the pause. The paused state already has an amber banner ("Activity Paused -- Students cannot vote"). No change needed to dot visibility.
**Confidence:** HIGH -- matches the existing pause visual treatment (amber banner + no new votes accepted).

### Transition Animation When Student Moves Between Groups
**Recommendation:** No animation. The user explicitly decided "No animation on arrival -- dot appears instantly." This extends to the sort reorder too. When a student votes, they move from the not-voted group to the voted group without transition. The existing Tailwind `transition-colors` on the tile handles the color change smoothly enough. Adding `transition-all` or layout animations would contradict the "no animation" decision and add complexity for little benefit.
**Confidence:** HIGH -- user decision explicitly says no animation.

## Code Examples

### Extending broadcastVoteUpdate to include participantId
```typescript
// src/lib/realtime/broadcast.ts
export async function broadcastVoteUpdate(
  bracketId: string,
  matchupId: string,
  voteCounts: Record<string, number>,
  totalVotes: number,
  participantId?: string  // NEW: optional for backward compat
): Promise<void> {
  await broadcastMessage({
    topic: `bracket:${bracketId}`,
    event: 'vote_update',
    payload: { matchupId, voteCounts, totalVotes, ...(participantId ? { participantId } : {}) },
  })
}
```

### Extending useRealtimeBracket to track voterIds
```typescript
// In useRealtimeBracket hook -- add voterIds state
const [voterIds, setVoterIds] = useState<Record<string, string[]>>({})
const pendingVoterUpdates = useRef<Record<string, Set<string>>>({})

// In vote_update handler:
.on('broadcast', { event: 'vote_update' }, (message) => {
  const { matchupId, voteCounts: counts, totalVotes, participantId } = message.payload as {
    matchupId: string
    voteCounts: Record<string, number>
    totalVotes: number
    participantId?: string
  }
  // Existing: accumulate vote counts
  pendingUpdates.current[matchupId] = { ...counts, total: totalVotes }

  // NEW: accumulate voter ID
  if (participantId) {
    if (!pendingVoterUpdates.current[matchupId]) {
      pendingVoterUpdates.current[matchupId] = new Set()
    }
    pendingVoterUpdates.current[matchupId].add(participantId)
  }
})

// In flush interval: merge voterIds
const voterUpdates = pendingVoterUpdates.current
if (Object.keys(voterUpdates).length > 0) {
  setVoterIds(prev => {
    const next = { ...prev }
    for (const [mid, pids] of Object.entries(voterUpdates)) {
      const existing = new Set(prev[mid] ?? [])
      for (const pid of pids) existing.add(pid)
      next[mid] = [...existing]
    }
    return next
  })
  pendingVoterUpdates.current = {}
}
```

### Reversing Sort Order (not-voted first)
```typescript
// src/components/teacher/participation-sidebar.tsx
const sortedParticipants = useMemo(() => {
  return [...participants].sort((a, b) => {
    const aVoted = voterIdSet.has(a.id) ? 1 : 0
    const bVoted = voterIdSet.has(b.id) ? 1 : 0
    // NOT-voted first (was: bVoted - aVoted for voted-first)
    if (aVoted !== bVoted) return aVoted - bVoted

    const aConnected = connectedIds.has(a.id) ? 1 : 0
    const bConnected = connectedIds.has(b.id) ? 1 : 0
    if (aConnected !== bConnected) return bConnected - aConnected

    return a.funName.localeCompare(b.funName)
  })
}, [participants, voterIdSet, connectedIds])
```

### New DAL function: getPollVoterParticipantIds
```typescript
// src/lib/dal/poll.ts
export async function getPollVoterParticipantIds(
  pollId: string
): Promise<string[]> {
  const votes = await prisma.pollVote.findMany({
    where: { pollId, rank: 1 },  // rank=1 ensures one entry per voter
    select: { participantId: true },
    distinct: ['participantId'],
  })
  return votes.map((v) => v.participantId)
}
```

### RR Per-Round Complete Voter Computation
```typescript
// In live-dashboard.tsx -- compute RR "fully voted" participants
const rrVoterIds = useMemo(() => {
  if (!isRoundRobin) return []
  const roundMatchups = currentMatchups.filter(
    (m) => m.roundRobinRound === currentRoundRobinRound &&
           (m.status === 'voting' || m.status === 'decided')
  )
  if (roundMatchups.length === 0) return []

  // Get voterIds for each matchup in the current round
  const matchupVoterSets = roundMatchups.map(m => {
    const ids = mergedVoterIds[m.id] ?? []
    return new Set(ids)
  })

  // Intersect: student must appear in ALL matchup voter sets
  const allParticipantIds = new Set(participants.map(p => p.id))
  return [...allParticipantIds].filter(pid =>
    matchupVoterSets.every(set => set.has(pid))
  )
}, [isRoundRobin, currentMatchups, currentRoundRobinRound, mergedVoterIds, participants])
```

## Files That Need Changes

### Server-Side (Broadcast + DAL)
| File | Change |
|------|--------|
| `src/lib/realtime/broadcast.ts` | Add `participantId` param to `broadcastVoteUpdate` and `broadcastPollVoteUpdate` |
| `src/actions/vote.ts` | Pass `participantId` to `broadcastVoteUpdate` call |
| `src/actions/poll.ts` | Pass `participantId` to `broadcastPollVoteUpdate` call |
| `src/lib/dal/poll.ts` | Add `getPollVoterParticipantIds(pollId)` function |
| `src/app/api/brackets/[bracketId]/state/route.ts` | Add `voterIds` per matchup for polling fallback |
| `src/app/api/polls/[pollId]/state/route.ts` | Add `voterIds` (distinct participant IDs) for polling fallback |

### Client-Side (Hooks)
| File | Change |
|------|--------|
| `src/hooks/use-realtime-bracket.ts` | Track voterIds per matchup from vote_update events; return voterIds; clear on structural events |
| `src/hooks/use-realtime-poll.ts` | Track voterIds from poll_vote_update events; return voterIds |

### Client-Side (UI)
| File | Change |
|------|--------|
| `src/components/teacher/participation-sidebar.tsx` | Reverse sort order (not-voted first); remove `selectedMatchupId` dependency for showing dots (always show if voterIds provided) |
| `src/components/teacher/live-dashboard.tsx` | Wire realtime voterIds into sidebar; compute RR all-matchups-voted logic; compute predictive prediction-submitted logic |
| `src/app/(dashboard)/polls/[pollId]/live/page.tsx` | Fetch participants and initial voter IDs for poll |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Add ParticipationSidebar; wire session presence and voter tracking |

## State of the Art

| Old Approach (current) | New Approach (phase 35) | Impact |
|------------------------|------------------------|--------|
| VoterIds loaded at SSR only | VoterIds accumulated from real-time broadcast events | Live updating without refresh |
| ParticipationSidebar bracket-only | ParticipationSidebar on bracket + poll live pages | Consistent teacher experience |
| Voted students sorted first | Not-voted students sorted first | Teacher immediately sees who's missing |
| Vote broadcast: counts only | Vote broadcast: counts + participantId | Enables per-student tracking |

## Open Questions

1. **Polling fallback completeness for RR**
   - What we know: The `/api/brackets/{id}/state` endpoint returns matchups with voteCounts. Adding voterIds per matchup to this response enables the fallback.
   - What's unclear: For RR "all matchups voted" logic, the polling fallback needs voter IDs for ALL round matchups, not just one. The state endpoint already returns all matchups, so adding voterIds per matchup should work.
   - Recommendation: Add `voterIds: string[]` to each matchup in the state API response. This is consistent with how voteCounts are already included per matchup.

2. **Predictive bracket sidebar during "active" phase**
   - What we know: During `predictions_open`, students submit predictions. During `active`, teacher reveals results (no more student interaction).
   - What's unclear: Should the sidebar show prediction submitters during `active` phase, or only during `predictions_open`?
   - Recommendation: Show prediction submitters during `predictions_open` phase only. During `active` (reveal phase), the sidebar could show all students as "complete" or hide the indicator. This aligns with the user decision that indicators show "current round status."

3. **RR "all_at_once" pacing: what is "current round"?**
   - What we know: In `all_at_once` mode, all RR rounds are opened simultaneously.
   - What's unclear: If all rounds are open at once, which round defines the "current round" for vote indicators?
   - Recommendation: For `all_at_once`, treat ALL open rounds as "current." A student gets a green dot when they've voted on ALL open matchups across ALL rounds. This is the most honest representation -- the teacher can see who has finished voting entirely.

## Sources

### Primary (HIGH confidence)
- `src/components/teacher/participation-sidebar.tsx` -- Current sidebar implementation, sort logic, dot rendering
- `src/components/teacher/live-dashboard.tsx` -- How voterIds are derived (line 505: only from initialVoterIds)
- `src/lib/realtime/broadcast.ts` -- Broadcast payload structures (no participantId in vote events)
- `src/hooks/use-realtime-bracket.ts` -- Vote count batching pattern, transport fallback
- `src/hooks/use-realtime-poll.ts` -- Poll vote count batching pattern
- `src/actions/vote.ts` -- Bracket vote action, has participantId in scope
- `src/actions/poll.ts` -- Poll vote action, has participantId in scope
- `src/actions/prediction.ts` -- Prediction submit already broadcasts participantId
- `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` -- SSR data loading pattern for participants + voterIds
- `src/app/(dashboard)/polls/[pollId]/live/page.tsx` -- Poll SSR (no participants loaded)
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` -- Poll live client (no sidebar)
- `src/app/api/brackets/[bracketId]/state/route.ts` -- Bracket state API (no voterIds)
- `src/app/api/polls/[pollId]/state/route.ts` -- Poll state API (no voterIds)
- `prisma/schema.prisma` -- Vote, PollVote, Prediction data models

### Secondary (MEDIUM confidence)
- `src/hooks/use-student-session.ts` -- Supabase Presence for student connection tracking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all existing libraries, no new deps
- Architecture: HIGH -- augmenting existing patterns (broadcast payload + batched state accumulation)
- Pitfalls: HIGH -- verified from actual code behavior (stale voterIds, missing poll sidebar, RR multi-matchup logic)
- RR all-at-once behavior: MEDIUM -- recommendation is logical but needs validation during implementation

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable codebase patterns, no external dependency changes)
