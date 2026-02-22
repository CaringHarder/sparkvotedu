# Phase 21: Poll Realtime Bug Fix - Research

**Researched:** 2026-02-21
**Domain:** Supabase Realtime Broadcast, Next.js Server Actions, React animation (Motion library)
**Confidence:** HIGH

## Summary

This phase fixes two bugs in the poll realtime pipeline and enhances the teacher dashboard with animated vote updates, a participation indicator, and proper poll lifecycle broadcasts. The codebase already has a fully working realtime pattern for brackets (server-side broadcast via REST API, client-side subscription via Supabase JS, batched vote updates, transport fallback). The poll system was scaffolded following this same pattern but has two specific wiring bugs plus missing UI features.

**Bug 1 (FIX-01):** The teacher poll live dashboard (`PollResults` component) subscribes to the `poll:{pollId}` channel via `useRealtimePoll` and receives `poll_vote_update` events correctly. However, the `PollResults` component receives `connectedStudents` as a server-rendered prop from `page.tsx` (line 48: `participantCount = session?._count.participants ?? 0`). This is a static count at page load time -- it never updates. The real-time vote counts DO flow through correctly via the broadcast pipeline, but the participation indicator ("X of Y voted") uses this stale denominator. Additionally, the bar chart already animates via Motion spring physics, so the core vote update animation infrastructure is in place.

**Bug 2 (FIX-02):** When a teacher activates a poll (`updatePollStatus` in `actions/poll.ts` line 235-237), only `broadcastActivityUpdate(result.sessionId)` is called. The `broadcastPollUpdate(pollId, 'poll_activated')` call to the `poll:{pollId}` channel is missing. Compare with `poll_closed` (line 239-241) and `poll_archived` (line 243-245) which correctly broadcast to the poll channel. This means students already on the poll page won't detect activation, and the `useRealtimePoll` hook's lifecycle handler (which listens for `poll_activated`) never fires.

**Primary recommendation:** Fix the two bugs by (1) adding `broadcastPollUpdate(pollId, 'poll_activated')` to the activation path and (2) making participation count dynamic via realtime data. Then add the user-requested enhancements: animated bar growth (already exists), participation indicator updates, student notification on poll activation, final results display on poll close, and reconnection resilience.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Poll bars should smoothly animate to new percentages as votes arrive (animated bar growth)
- Show a running participation indicator ("X of Y students voted") that updates in real-time so the teacher knows when everyone has responded
- When a teacher activates a poll, students already in the session should see it via the poll channel (not just activity channel) -- Claude decides whether to auto-navigate or show a notification, based on existing bracket activation patterns for consistency
- Late joiners should land directly on the active poll with minimal friction
- When a teacher closes a poll, students should immediately see the final results (not be sent back to session home)
- Broadcast acknowledgment (e.g., "Poll sent to X students"): Claude's discretion based on feasibility
- Votes are persisted server-side the moment they're submitted -- a student disconnect after voting does not lose their vote
- Teacher dashboard auto-recovers when navigating away and back -- re-subscribes and fetches latest state automatically
- Reconnection strategy and stale-data warning: Claude's discretion on the most reliable approach

### Claude's Discretion
- Count vs percentage display on poll bars
- Leading option visual treatment (bold, color, or neutral)
- Student notification style on poll activation (auto-navigate vs toast/banner)
- Broadcast reach confirmation for teachers
- Reconnection strategy (full refresh vs event replay)
- Connection-lost indicator visibility (banner vs silent reconnect)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.93.3 | Realtime broadcast subscriptions | Already used for bracket/activity realtime |
| `motion` (Motion) | 12.29.2 | Bar chart spring animations | Already used in `bar-chart.tsx`, `donut-chart.tsx`, `ranked-leaderboard.tsx` |
| Next.js | 16.1.6 | Server actions for broadcast, API routes for polling fallback | App framework |
| React | 19.2.3 | Component state management, hooks | UI framework |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `canvas-confetti` | 1.9.4 | Poll reveal celebration | Already used in `poll-reveal.tsx` |
| `lucide-react` | 0.563.0 | UI icons | Already used across dashboard |

### Alternatives Considered
None needed. The entire stack is already installed and proven working for the bracket realtime system. This phase only fixes wiring bugs and adds UI enhancements.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Realtime Pipeline (Bracket Pattern -- proven working)

```
┌──────────────┐    ┌──────────────────────┐    ┌───────────────────┐
│ Server Action │    │ Supabase Broadcast   │    │ Client Hook       │
│ (castVote)   │───>│ REST API             │───>│ (useRealtimePoll) │
│              │    │ POST /realtime/v1/   │    │                   │
│ Persists to  │    │ api/broadcast        │    │ Batches updates   │
│ DB first,    │    │                      │    │ every 2s, flushes │
│ then broad-  │    │ topic: poll:{id}     │    │ to React state    │
│ cast (fire   │    │ event: poll_vote_    │    │                   │
│ and forget)  │    │        update        │    │ Transport fallback│
└──────────────┘    └──────────────────────┘    │ to HTTP polling   │
                                                 └───────────────────┘
```

**Source:** Verified from `src/lib/realtime/broadcast.ts`, `src/hooks/use-realtime-poll.ts`, `src/actions/poll.ts`

### Pattern 1: Server-Side Broadcast (fire-and-forget)
**What:** Server actions persist data first, then broadcast non-blocking
**When to use:** Every state change that clients need to know about
**Example:**
```typescript
// Source: src/actions/poll.ts lines 417-421
// After DB write succeeds, broadcast is fire-and-forget
const voteCounts = await getSimplePollVoteCounts(pollId)
const totalVotes = Object.values(voteCounts).reduce((sum, c) => sum + c, 0)
broadcastPollVoteUpdate(pollId, voteCounts, totalVotes).catch(console.error)
```

### Pattern 2: Dual-Channel Broadcast on Lifecycle Events
**What:** Lifecycle events broadcast to BOTH the entity channel AND the activity channel
**When to use:** When a state change affects both the entity subscribers and the activity list
**Example:**
```typescript
// Source: src/actions/bracket-advance.ts lines 61-79
// Bracket broadcasts to bracket channel AND activity channel
broadcastBracketUpdate(bracketId, 'winner_selected', { matchupId, winnerId }).catch(console.error)
if (bracket.sessionId) {
  broadcastActivityUpdate(bracket.sessionId).catch(console.error)
}
```

### Pattern 3: Client-Side Batched Subscription
**What:** Vote update events accumulated in ref, flushed to state on interval
**When to use:** High-frequency events (votes) that would cause render storms
**Example:**
```typescript
// Source: src/hooks/use-realtime-poll.ts lines 73-87
// pendingVoteCounts ref accumulates, setInterval flushes every batchIntervalMs
const flushInterval = setInterval(() => {
  const pending = pendingVoteCounts.current
  if (Object.keys(pending).length === 0) return
  setVoteCounts(pending)
  pendingVoteCounts.current = {}
}, batchIntervalMs)
```

### Pattern 4: Transport Fallback (WebSocket -> HTTP Polling)
**What:** If WebSocket doesn't connect within 5s, switch to HTTP polling every 3s
**When to use:** All realtime hooks (school networks block WebSocket)
**Example:**
```typescript
// Source: src/hooks/use-realtime-poll.ts lines 124-132
const wsTimeout = setTimeout(() => {
  if (!wsConnected) {
    setTransport('polling')
    fetchPollState()
    pollInterval = setInterval(fetchPollState, 3000)
  }
}, 5000)
```

### Pattern 5: Activity Grid Auto-Navigation
**What:** When only one activity is active, auto-navigate student to it
**When to use:** Student session page when activities change
**Example:**
```typescript
// Source: src/components/student/activity-grid.tsx lines 30-39
useEffect(() => {
  if (!loading && activities.length === 1) {
    const activity = activities[0]
    const activityPath = activity.type === 'bracket'
      ? `/session/${sessionId}/bracket/${activity.id}`
      : `/session/${sessionId}/poll/${activity.id}`
    router.push(activityPath)
  }
}, [activities, loading, sessionId, router])
```

### Anti-Patterns to Avoid
- **Direct setState on every broadcast event:** Use ref-based batching (Pattern 3) to prevent render storms when 30+ students vote rapidly
- **Throwing on broadcast failure:** Broadcast is best-effort, fire-and-forget. DB persistence is the source of truth.
- **Using Supabase postgres_changes for classrooms:** Broadcast (not DB change listeners) avoids per-subscriber DB reads (see existing codebase comment in `use-realtime-activities.ts` line 59)
- **Subscribing to channels without cleanup:** Always call `supabase.removeChannel(channel)` in useEffect cleanup

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spring animation for bars | Custom CSS transition logic | Motion `<motion.div>` with `type: 'spring'` | Already working in `bar-chart.tsx`; spring physics feel dynamic per user request |
| Transport fallback | Custom WebSocket reconnect | Existing pattern in `use-realtime-poll.ts` | 5s timeout + HTTP polling fallback already handles school networks |
| Broadcast delivery | Custom push notification system | Supabase Broadcast REST API | Already proven in `broadcast.ts`, handles all auth via service role key |
| Vote persistence | Client-side vote tracking | Server-side Prisma upsert | Already implemented -- `castSimplePollVoteDAL` uses upsert with compound unique |

**Key insight:** Everything needed for this phase already exists in the codebase. The bracket realtime system is the blueprint. This is a wiring and enhancement phase, not a greenfield implementation.

## Existing Code Inventory

### Files That Need Modification

| File | What Needs to Change | Why |
|------|---------------------|-----|
| `src/actions/poll.ts` (line 235-237) | Add `broadcastPollUpdate(pollId, 'poll_activated')` alongside `broadcastActivityUpdate` | **BUG FIX (FIX-02):** Missing poll channel broadcast on activation |
| `src/actions/poll.ts` (line 239-241) | Add `broadcastActivityUpdate(result.sessionId)` alongside `broadcastPollUpdate` for close | Activity list should reflect poll closing too |
| `src/components/poll/poll-results.tsx` | Make participation count dynamic, enhance visual treatment | **BUG FIX (FIX-01):** `connectedStudents` is static server-rendered prop |
| `src/hooks/use-realtime-poll.ts` | Return participant count from poll state API | Participation indicator needs dynamic denominator |
| `src/app/api/polls/[pollId]/state/route.ts` | Add participant count to response | Feed dynamic count to the hook |
| `src/app/(dashboard)/polls/[pollId]/live/page.tsx` | Pass sessionId to client for dynamic participant count | Remove static participant count, use realtime |
| `src/app/(dashboard)/polls/[pollId]/live/client.tsx` | Handle dynamic participant count from hook instead of prop | Participation indicator updates in real-time |

### Files That May Need Minor Touches

| File | What Might Change | Why |
|------|------------------|-----|
| `src/components/student/activity-grid.tsx` | Already auto-navigates via Pattern 5 | Late joiners already handled if activity fetch works correctly |
| `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` | Student poll close handling already shows results | `closedDetected` state already shows final results (lines 302-316) |
| `src/components/poll/bar-chart.tsx` | Already has spring animation | May need count animation (CSS `transition` on the number) |
| `src/components/poll/donut-chart.tsx` | Already has spring animation on segments | May need animated total in center |

### Files That Are Already Correct (No Changes Needed)

| File | Why It's Fine |
|------|---------------|
| `src/lib/realtime/broadcast.ts` | `broadcastPollVoteUpdate` and `broadcastPollUpdate` functions already exist and work correctly |
| `src/lib/dal/poll.ts` | All DAL functions work correctly, including vote persistence via upsert |
| `src/hooks/use-poll-vote.ts` | Vote submission hook works, calls server action correctly |
| `src/components/student/simple-poll-vote.tsx` | Vote UI works correctly |
| `src/components/poll/poll-reveal.tsx` | Reveal animation works correctly |

## Bug Analysis

### FIX-01: Teacher Dashboard Stale Vote Data

**Root Cause:** The realtime vote update pipeline actually works. The `useRealtimePoll` hook subscribes to `poll:{pollId}`, receives `poll_vote_update` events, batches them, and flushes to state. The `AnimatedBarChart` already animates with spring physics.

**What's actually stale:** The participation denominator. `PollResults` receives `connectedStudents` as a prop (line 86 of `poll-results.tsx`), which is set once at page load from `session._count.participants` (line 48 of `live/page.tsx`). This number never updates. The participation display says "3 of 5 voted (60%)" but the "5" is frozen at page load.

**Additional gap:** When the teacher navigates away and back, the page SSR re-fetches initial counts (which is correct), but the realtime hook starts fresh. The `useRealtimePoll` hook does fetch on SUBSCRIBED (line 118), so auto-recovery already works. The only risk is if WebSocket reconnection fails silently -- the transport fallback handles this.

**Fix approach:**
1. Add `participantCount` to the `/api/polls/[pollId]/state` response
2. Expose `participantCount` from `useRealtimePoll` hook state
3. Use the hook's dynamic count instead of the static prop
4. Alternatively, use a lightweight participant count endpoint or session presence

**Confidence:** HIGH -- verified by reading all relevant source files

### FIX-02: Poll Activation Missing Broadcast

**Root Cause:** In `src/actions/poll.ts` line 234-237:
```typescript
if (status === 'active' && result.sessionId) {
  broadcastActivityUpdate(result.sessionId).catch(console.error)
}
```

This broadcasts to `activities:{sessionId}` but NOT to `poll:{pollId}`. The `broadcastPollUpdate(pollId, 'poll_activated')` call is missing.

Compare with `closed` (line 239-241) which correctly calls `broadcastPollUpdate(pollId, 'poll_closed')`.

Compare with bracket pattern (`bracket-advance.ts` lines 61-79) which broadcasts to BOTH the entity channel AND the activity channel.

**Impact:** Students on the session page DO see the poll appear (via `useRealtimeActivities` -> `activity_update`), but:
1. Students already subscribed to the poll-specific channel don't get notified
2. The `useRealtimePoll` hook's lifecycle handler for `poll_activated` never fires
3. Any teacher client watching the poll channel misses the activation event

**Fix:** Add one line after the `broadcastActivityUpdate` call:
```typescript
if (status === 'active') {
  broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)
  if (result.sessionId) {
    broadcastActivityUpdate(result.sessionId).catch(console.error)
  }
}
```

**Confidence:** HIGH -- verified by comparing bracket and poll broadcast patterns

## Discretion Recommendations

### Count vs Percentage Display on Poll Bars
**Recommendation:** Show BOTH count and percentage, as already implemented in `bar-chart.tsx` line 59: `{d.count} vote{d.count !== 1 ? 's' : ''} ({pct}%)`. No change needed.
**Rationale:** The existing display is clear and informative.

### Leading Option Visual Treatment
**Recommendation:** Bold the count text and add a subtle left-border accent color on the leading option's bar row. Keep it neutral otherwise -- teachers may not want to signal the winner to projector-watching students.
**Rationale:** Subtle enough to help the teacher identify the leader at a glance, not distracting enough to bias late voters who can see the projector.

### Student Notification on Poll Activation
**Recommendation:** Auto-navigate, consistent with the existing bracket activation pattern. The `ActivityGrid` already auto-navigates when only one activity is active (Pattern 5 above). If multiple activities are active, the poll appears in the grid and students tap to enter.
**Rationale:** This is exactly how brackets work today. The `useRealtimeActivities` hook refetches on `activity_update`, the `ActivityGrid` auto-navigates if it's the only activity. Adding the `poll_activated` broadcast to the poll channel (FIX-02) enables students already ON the poll page to detect activation. For students on the session home, the activity grid auto-navigation handles it.

### Broadcast Reach Confirmation for Teachers
**Recommendation:** Show "Poll sent to X students" based on the participant count from the session (number of joined participants), not connected presence count. This is already partially available -- the `participantCount` is queried in `live/page.tsx`.
**Rationale:** Participant count (DB-backed) is reliable. Connected presence count requires the presence channel which adds complexity and may not match the classroom situation (student devices in sleep mode but still "joined").

### Reconnection Strategy
**Recommendation:** Full refresh on reconnect (the current pattern). The `useRealtimePoll` hook already calls `fetchPollState()` on SUBSCRIBED (line 118), which fetches the full state from the API. This is the simplest, most reliable approach.
**Rationale:** Event replay requires server-side event history, which Supabase Broadcast does not provide. Full refresh is what the bracket system uses and it works well.

### Connection-Lost Indicator
**Recommendation:** Show a small banner at the top of the results container when transport falls back to polling mode. Already partially implemented -- `poll-results.tsx` line 136-139 shows a "Polling mode" badge. Enhance with a more visible connection status indicator.
**Rationale:** Teachers should know if they're getting real-time or near-real-time (3s polling) updates, but it shouldn't be alarming since polling mode still works correctly.

## Common Pitfalls

### Pitfall 1: Race Condition Between Broadcast and DB Write
**What goes wrong:** Broadcasting BEFORE the DB write completes, causing clients to fetch stale state
**Why it happens:** Async fire-and-forget broadcast happening before the await
**How to avoid:** Always `await` the DB write (DAL call), THEN broadcast. The current codebase does this correctly.
**Warning signs:** Client refetch returns old data intermittently

### Pitfall 2: Stale Closure in useEffect Cleanup
**What goes wrong:** The channel cleanup references a stale `channel` variable after dependencies change
**Why it happens:** React re-runs the effect, but the old cleanup captures the old channel instance
**How to avoid:** Use the channel variable from the effect scope (the current pattern does this correctly)
**Warning signs:** "Channel already joined" errors in console, duplicate event handlers

### Pitfall 3: Participation Count Double-Counting Ranked Votes
**What goes wrong:** Using `poll._count.votes` as participation count gives total vote ROWS, not unique voters, for ranked polls (each voter creates N rows)
**Why it happens:** Ranked poll votes are stored as one row per rank per voter
**How to avoid:** Use `SELECT COUNT(DISTINCT participant_id)` or equivalent Prisma query for participation count
**Warning signs:** "15 of 5 voted (300%)" display on ranked polls

### Pitfall 4: Motion Animation Memory in AnimatePresence
**What goes wrong:** Motion stores the previous state for exit animations, causing stale data on rapid updates
**Why it happens:** `AnimatePresence mode="popLayout"` preserves exiting elements
**How to avoid:** Use stable `key` props (optionId, not array index) -- already done correctly in `bar-chart.tsx`
**Warning signs:** Flickering or duplicate bars during rapid vote updates

### Pitfall 5: Missing `broadcastActivityUpdate` on Poll Close
**What goes wrong:** Students on the session home page don't see the poll status change to "closed"
**Why it happens:** The close action broadcasts `poll_closed` to the poll channel but not `activity_update` to the activity channel
**How to avoid:** Broadcast to BOTH channels on close (same as activation should broadcast to both)
**Warning signs:** Student activity grid still shows poll as "active" after teacher closes it

## Code Examples

### Fix for FIX-02: Poll Activation Broadcast (exact code change)
```typescript
// Source: src/actions/poll.ts, updatePollStatus function
// BEFORE (buggy):
if (status === 'active' && result.sessionId) {
  broadcastActivityUpdate(result.sessionId).catch(console.error)
}

// AFTER (fixed):
if (status === 'active') {
  broadcastPollUpdate(pollId, 'poll_activated').catch(console.error)
  if (result.sessionId) {
    broadcastActivityUpdate(result.sessionId).catch(console.error)
  }
}
```

### Fix for Poll Close: Add Activity Channel Broadcast
```typescript
// Source: src/actions/poll.ts, updatePollStatus function
// BEFORE (missing activity broadcast):
if (status === 'closed') {
  broadcastPollUpdate(pollId, 'poll_closed').catch(console.error)
}

// AFTER (broadcasts to both channels):
if (status === 'closed') {
  broadcastPollUpdate(pollId, 'poll_closed').catch(console.error)
  if (result.sessionId) {
    broadcastActivityUpdate(result.sessionId).catch(console.error)
  }
}
```

### Dynamic Participation Count in Poll State API
```typescript
// Source: src/app/api/polls/[pollId]/state/route.ts
// Add to the response object:
let participantCount = 0
if (poll.sessionId) {
  participantCount = await prisma.studentParticipant.count({
    where: { sessionId: poll.sessionId, banned: false },
  })
}

return NextResponse.json({
  // ...existing fields...
  participantCount,
})
```

### Enhanced useRealtimePoll Hook (participation tracking)
```typescript
// Source: src/hooks/use-realtime-poll.ts
// Add participantCount to state and return value:
const [participantCount, setParticipantCount] = useState(0)

// In fetchPollState callback:
if (data.participantCount !== undefined) {
  setParticipantCount(data.participantCount)
}

return { voteCounts, totalVotes, pollStatus, bordaScores, transport, participantCount, refetch: fetchPollState }
```

### Animated Vote Count (CSS-based number transition)
```typescript
// Smooth number transitions via CSS -- no extra library needed
// Add to existing bar-chart.tsx label row:
<span className="shrink-0 text-sm text-muted-foreground tabular-nums transition-all duration-300">
  {d.count} vote{d.count !== 1 ? 's' : ''} ({pct}%)
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase postgres_changes | Supabase Broadcast REST API | Phase 2 research | Avoids per-subscriber DB reads in classrooms (30+ students) |
| framer-motion package | motion package (renamed) | motion v12 | Import from `motion/react` not `framer-motion` |
| Prisma `db push` | Prisma `migrate` with baseline | Phase 19 | Proper migration tracking |

**Deprecated/outdated:**
- `framer-motion`: Renamed to `motion` starting v12. This codebase uses `motion/react` imports correctly.

## Open Questions

1. **Participant count accuracy for late joiners**
   - What we know: `studentParticipant.count()` gives total joined participants, but some may have left
   - What's unclear: Should the denominator be "total joined" or "currently connected" (presence)?
   - Recommendation: Use "total joined" (DB count) as the denominator. It's reliable, doesn't require presence tracking, and matches the classroom mental model ("25 students are in my class"). Presence is unreliable (phone sleep, tab switch).

2. **Poll close results display for students**
   - What we know: Student page already handles `closedDetected` state (lines 302-316 of student poll page) and shows winner text
   - What's unclear: Should final results show vote counts/percentages to students, or just the winner?
   - Recommendation: Show just the winner text (current behavior) since the `showLiveResults` setting controls whether students see detailed results. The current `PollReveal` animation + winner text is sufficient and matches the user's request ("immediately see the final results").

## Sources

### Primary (HIGH confidence)
- `src/actions/poll.ts` -- Direct reading of the buggy broadcast code
- `src/actions/bracket-advance.ts` -- Reference pattern for correct dual-channel broadcasting
- `src/hooks/use-realtime-poll.ts` -- Complete realtime subscription hook implementation
- `src/lib/realtime/broadcast.ts` -- Server-side broadcast utility functions
- `src/components/poll/poll-results.tsx` -- Teacher live results dashboard
- `src/components/poll/bar-chart.tsx` -- Existing Motion spring animation
- `src/app/api/polls/[pollId]/state/route.ts` -- Poll state API endpoint
- `src/app/(dashboard)/polls/[pollId]/live/client.tsx` -- Teacher live dashboard client component
- `src/app/(dashboard)/polls/[pollId]/live/page.tsx` -- Teacher live dashboard server component
- `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx` -- Student poll voting page
- `src/components/student/activity-grid.tsx` -- Auto-navigation pattern
- `src/hooks/use-realtime-activities.ts` -- Activity channel subscription
- `src/lib/dal/poll.ts` -- Poll DAL with vote persistence (upsert)
- `prisma/schema.prisma` -- Poll, PollOption, PollVote models

### Secondary (MEDIUM confidence)
- Phase 19 verification report -- Confirms RLS is in place and Prisma bypasses it
- Bracket realtime system (multiple files) -- Proven working pattern this phase mirrors

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH -- Both bugs confirmed by direct code reading with clear root causes
- Fix approach: HIGH -- Fixes follow exact patterns already proven in bracket system
- Enhancement approach: HIGH -- All components (Motion animation, transport fallback, batch updates) already exist in codebase
- Discretion recommendations: HIGH -- Based on existing codebase patterns, not speculation

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain -- Supabase Broadcast API and Motion library are mature)
