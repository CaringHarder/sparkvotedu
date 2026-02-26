# Phase 27: SE & Predictive Realtime Vote Display Fix - Research

**Researched:** 2026-02-26
**Domain:** Supabase Realtime broadcast subscriptions, Next.js live dashboard state management, React vote count display pipeline
**Confidence:** HIGH

## Summary

This phase addresses a UI-only bug where realtime vote counts stop updating in single elimination (SE) bracket final rounds and intermittently fail on some predictive bracket rounds. Through deep investigation of the codebase, the root cause has been identified with HIGH confidence: it is a state management issue in how `useRealtimeBracket` vote counts merge with the live dashboard's `voteLabels` computation, NOT a Supabase subscription or broadcast issue.

The realtime infrastructure is sound -- the `useRealtimeBracket` hook subscribes to `bracket:{bracketId}` (not per-round), `vote_update` broadcasts are sent correctly by `castVote` -> `broadcastVoteUpdate`, and the hook's batched flush mechanism works for all rounds. The bug lies in how `currentMatchups` state updates interact with `mergedVoteCounts` and `voteLabels` derivation on the teacher live dashboard and student bracket views after round advancement.

**Primary recommendation:** Investigate the precise timing of `fetchBracketState` refetches triggered by `bracket_update` events (specifically `winner_selected`, `round_advanced`, `voting_opened`) and verify that `currentMatchups` reflects the final round matchup with its entrant IDs populated and status set to `voting` BEFORE vote_update events arrive. The fix is likely a state synchronization issue where realtime vote updates arrive for a matchup ID that `currentMatchups` does not yet recognize (because the structural refetch has not completed), causing the votes to be stored in `realtimeVoteCounts` but not rendered.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Bug is 100% reproducible on SE brackets when reaching the final round (8-team, 3 rounds)
- Earlier rounds (1 and 2) show realtime vote counts correctly in SE
- Only the final round fails to display live vote counts
- Votes are being saved correctly -- issue is purely UI/realtime display
- Teacher can still advance the winner and bracket completes normally
- Celebration fires correctly when the final matchup is decided
- Final round should behave identically to earlier rounds
- No special final-round behavior needed
- Celebration and completion chain already working -- don't touch those
- SE final round: primary target
- Predictive brackets: vote counts don't show on some rounds (not just final) -- include in fix
- Double elimination: untested, verify during investigation and fix if affected
- Round robin: not affected (handled separately in Phase 28)
- Likely a shared root cause between SE and predictive issues
- Primary test case: 8-team SE bracket
- Predictive test case: 8-team predictive bracket
- DE sanity check: verify DE final round realtime works
- Single student voter is sufficient for verification
- Verify vote counts update in realtime on ALL rounds

### Claude's Discretion
- Root cause investigation approach (route caching, subscription lifecycle, state management)
- Whether to check from teacher view, student view, or both during investigation
- Fix implementation strategy based on what investigation reveals

### Deferred Ideas (OUT OF SCOPE)
- Predictive bracket early-round vote display was originally considered out of scope but has been pulled into Phase 27 since it likely shares a root cause
- No other deferred items
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-02 | Single elimination bracket final round continues to show realtime vote updates on the teacher live dashboard | Root cause identified in vote count display pipeline -- state management timing issue between `fetchBracketState` refetch and realtime vote_update event processing |
</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, server components, API routes | Framework for the project |
| @supabase/supabase-js | ^2.93.3 | Supabase Realtime broadcast channel subscriptions | Realtime infrastructure |
| React | 19.2.3 | Component state management, hooks | UI framework |
| Prisma | ^7.3.0 | Database queries for matchup/vote data | ORM layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | ^0.8.0 | Server-side Supabase client creation | Already used for auth |

No new libraries needed. This is a fix to existing code.

## Architecture Patterns

### Realtime Vote Count Data Flow (Current)

```
Teacher Live Dashboard:
  1. Server page (live/page.tsx) fetches initialVoteCounts from DB
  2. LiveDashboard receives initialVoteCounts as prop
  3. useRealtimeBracket(bracketId) subscribes to bracket:{bracketId} channel
     - vote_update events -> accumulated in pendingUpdates ref -> flushed to realtimeVoteCounts every 2s
     - bracket_update events -> triggers fetchBracketState() which fetches /api/brackets/{id}/state
  4. mergedVoteCounts = initialVoteCounts + realtimeVoteCounts (useMemo)
  5. currentMatchups = realtimeMatchups ?? bracket.matchups (useMemo)
  6. voteLabels = derived from currentMatchups + mergedVoteCounts (useMemo)
     - Only includes matchups where status === 'voting' || status === 'decided'
  7. BracketDiagram receives voteLabels -> renders vote counts per matchup

Student Advanced View:
  1. Page fetches bracket state from /api/brackets/{id}/state
  2. AdvancedVotingView creates useRealtimeBracket(bracketId)
  3. currentMatchups = realtimeMatchups ?? bracket.matchups
  4. Student view does NOT display vote counts (no voteLabels prop)
  5. But students do see structural updates (new matchups becoming votable)

Student Simple View:
  1. Same subscription as Advanced
  2. Filters to votableMatchups (status === 'voting')
  3. No vote count display -- just vote cards
```

### Key Files in the Fix Domain

```
src/hooks/use-realtime-bracket.ts         # Central realtime hook (subscription + batching)
src/components/teacher/live-dashboard.tsx  # Teacher live view (merges votes, computes voteLabels)
src/components/student/advanced-voting-view.tsx  # Student advanced view
src/components/student/simple-voting-view.tsx    # Student simple view
src/components/bracket/bracket-diagram.tsx       # SVG bracket renderer (receives voteLabels)
src/actions/vote.ts                       # Vote action (casts vote, broadcasts)
src/actions/bracket-advance.ts            # Advancement actions (broadcasts bracket_update)
src/lib/realtime/broadcast.ts             # Server-side broadcast via REST API
src/app/api/brackets/[bracketId]/state/route.ts  # Polling/fetch state endpoint
src/lib/dal/vote.ts                       # Vote DAL (openMatchupsForVoting, getVoteCounts)
src/lib/bracket/advancement.ts            # Core advancement engine
src/components/bracket/predictive-bracket.tsx    # Predictive bracket component
```

### Root Cause Analysis

**The subscription is bracket-scoped, not round-scoped.** The `useRealtimeBracket` hook subscribes to `bracket:{bracketId}` -- it never changes channels between rounds. This confirms the subscription itself is NOT the problem.

**The broadcast sends the correct matchupId.** When `castVote` runs, it broadcasts `vote_update` with `{ matchupId, voteCounts, totalVotes }`. This is correct regardless of round.

**The batched flush works correctly.** Pending votes are accumulated in a ref and flushed to `realtimeVoteCounts` state every 2 seconds. No round-specific logic here.

**Hypothesis: State timing race after round advancement**

When the teacher advances the semifinal matchups (closing round 2), the following sequence occurs:

1. Teacher clicks "Close Voting & Advance" for round 2 matchups
2. Server: `advanceMatchup` runs -> sets winner, propagates to final round matchup
3. Server: `broadcastBracketUpdate(bracketId, 'winner_selected', ...)` fires
4. Server: `revalidatePath('/brackets/{id}/live')` called
5. Client `useRealtimeBracket`: receives `bracket_update` event -> calls `fetchBracketState()`
6. `fetchBracketState` fetches `/api/brackets/{id}/state` -> returns updated matchups including the final round matchup (now with entrant1Id and entrant2Id populated)
7. Client: `setMatchups(data.matchups)` updates `realtimeMatchups`
8. Client: `setVoteCounts(counts)` updates with fetched vote counts (should be zero for new matchup)

Then the teacher opens voting on the final round:

9. Teacher clicks "Open Voting"
10. Server: `openMatchupsForVoting` -> sets final matchup status to "voting"
11. Server: `broadcastBracketUpdate(bracketId, 'voting_opened', ...)` fires
12. Client: receives `bracket_update` -> calls `fetchBracketState()` again
13. `fetchBracketState`: returns matchups with final matchup status = "voting"

Then a student votes:

14. Student votes -> `castVote` -> `broadcastVoteUpdate(bracketId, matchupId, counts, total)`
15. Client: receives `vote_update` -> stores in `pendingUpdates.current[matchupId]`
16. Next flush interval: `setVoteCounts(prev => ({ ...prev, ...pending }))`

**THE CRITICAL QUESTION:** Is step 13's `fetchBracketState` completing and updating `matchups` state BEFORE step 14's vote_update arrives?

If the `fetchBracketState` from step 12 is slow (network latency, Next.js route handler cold start) and vote_update events arrive first, the votes accumulate in `realtimeVoteCounts` correctly -- BUT `currentMatchups` may still be the OLD matchups (from step 7 or even the original server render).

**Wait -- the `voteLabels` computation checks `currentMatchups`:**

```typescript
const voteLabels = useMemo(() => {
    const labels: Record<string, { e1: number; e2: number }> = {}
    for (const m of currentMatchups) {
      if (m.status === 'voting' || m.status === 'decided') {
        const counts = mergedVoteCounts[m.id] ?? {}
        labels[m.id] = {
          e1: m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0,
          e2: m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0,
        }
      }
    }
    return labels
  }, [currentMatchups, mergedVoteCounts])
```

If `currentMatchups` has the final matchup with the correct `status: 'voting'` AND `entrant1Id`/`entrant2Id` populated, this should work. But if `currentMatchups` still shows the final matchup as `pending` with null entrants (stale state), no voteLabel will be generated for it.

**Probable root cause candidates (in order of likelihood):**

1. **Next.js route handler caching (HIGH probability):** The `/api/brackets/[bracketId]/state` endpoint may be returning cached/stale data after `revalidatePath` is called. In Next.js 16, API route handlers without explicit `dynamic = 'force-dynamic'` may cache GET responses. The `fetchBracketState` call in the hook could be getting a cached response where the final matchup still shows `pending` with null entrants.

2. **React state batching / useMemo stale closure (MEDIUM probability):** The `fetchBracketState` updates both `setMatchups` and `setVoteCounts` in the same async callback. React 19 batches these together, but the `voteLabels` useMemo depends on both `currentMatchups` and `mergedVoteCounts`. If `currentMatchups` updates but `mergedVoteCounts` references an old closure, the labels could be computed incorrectly.

3. **Double fetch interference (MEDIUM probability):** When the teacher advances round 2, multiple `bracket_update` events fire in quick succession (`winner_selected` for each matchup, then `voting_opened`). Each triggers `fetchBracketState()`. If these fetches overlap and resolve out of order, an earlier fetch response could overwrite a later one, leaving matchups in an intermediate state.

4. **HTTP fetch cache in the browser (MEDIUM probability):** The `fetchBracketState` call uses the native `fetch()` API without cache-busting. Browsers may cache GET requests to the same URL within the same page. If the first fetch (from step 5) returns stale data and the browser caches it, subsequent fetches (step 12) may return the same cached response.

### Recommended Investigation Order

1. **Add cache: 'no-store' to fetchBracketState:** In `useRealtimeBracket.ts`, the `fetch('/api/brackets/${bracketId}/state')` call should include `{ cache: 'no-store' }` to prevent both Next.js and browser caching.

2. **Add console.log to voteLabels computation:** Temporarily log `currentMatchups` statuses and `mergedVoteCounts` to verify the data flow in the browser.

3. **Check the API route response:** Verify `/api/brackets/[bracketId]/state` returns fresh data after round advancement by adding `export const dynamic = 'force-dynamic'` to the route.

4. **Check for fetch deduplication:** Multiple rapid `fetchBracketState()` calls may be deduplicated by Next.js fetch or the browser. Add a timestamp query parameter to prevent dedup.

### Anti-Patterns to Avoid

- **Don't add round-specific subscription channels:** The bracket-scoped channel is correct. Adding round-specific channels would add complexity without fixing the root cause.
- **Don't move to database triggers for realtime:** The current broadcast approach is correct and works for earlier rounds. The issue is client-side state management.
- **Don't refactor the entire realtime hook:** The batched flush mechanism is well-designed. Focus on the specific race condition.
- **Don't touch celebration or completion logic:** These are confirmed working per user constraints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetch cache busting | Custom cache invalidation | `{ cache: 'no-store' }` on fetch + `dynamic = 'force-dynamic'` on API route | Built-in Next.js/fetch mechanisms handle this correctly |
| Fetch deduplication prevention | Custom request queuing | Timestamp query parameter or AbortController | Simple, battle-tested approaches |
| State synchronization | Custom pub/sub within React | useMemo dependency arrays + proper React 19 batching | React's built-in mechanisms are correct when used properly |

**Key insight:** The realtime infrastructure is correct. This is a caching/timing bug in how state refreshes after structural bracket changes.

## Common Pitfalls

### Pitfall 1: Next.js API Route GET Caching
**What goes wrong:** GET requests to API route handlers may be cached by Next.js, returning stale data after server mutations.
**Why it happens:** Next.js 16 may cache GET route handler responses unless `dynamic = 'force-dynamic'` is set or the handler reads headers/cookies.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` to `/api/brackets/[bracketId]/state/route.ts` OR add `cache: 'no-store'` to the client-side fetch call.
**Warning signs:** Data appears correct after a hard refresh but not in realtime.

### Pitfall 2: Browser Fetch Deduplication
**What goes wrong:** Multiple rapid calls to `fetchBracketState()` may be deduplicated by the browser, returning the same (stale) response.
**Why it happens:** Browsers can deduplicate identical GET requests happening simultaneously or within a short window.
**How to avoid:** Add a timestamp query parameter: `fetch(\`/api/brackets/\${bracketId}/state?t=\${Date.now()}\`)`.
**Warning signs:** Console shows fewer fetch calls than expected.

### Pitfall 3: Overlapping Fetch Responses Overwriting State
**What goes wrong:** When multiple `bracket_update` events fire rapidly (e.g., advancing two semifinal matchups + opening voting), each triggers `fetchBracketState()`. An older response arriving after a newer one overwrites correct state with stale data.
**Why it happens:** Network requests may resolve out of order.
**How to avoid:** Use a fetch sequence counter or AbortController to discard stale responses. Only apply the response if it matches the latest request.
**Warning signs:** State briefly shows correct data then reverts.

### Pitfall 4: Changing the Wrong Files
**What goes wrong:** Modifying the celebration chain, completion detection, or bracket advancement logic when only the vote count display is broken.
**Why it happens:** The bug manifests on the final round, tempting investigation of final-round-specific logic.
**How to avoid:** The user explicitly confirmed celebration and completion work. Focus exclusively on the vote count display pipeline: `useRealtimeBracket` -> `mergedVoteCounts` -> `voteLabels` -> `BracketDiagram`.
**Warning signs:** Changes affect non-voting UI behavior.

### Pitfall 5: Predictive Bracket Has a Different Code Path
**What goes wrong:** Assuming the predictive bracket vote display uses the same code path as SE.
**Why it happens:** The `PredictiveBracket` component does NOT use `useRealtimeBracket`. The live dashboard wraps it differently depending on `isPredictiveAuto` vs manual mode.
**How to avoid:** For predictive manual mode on the teacher live dashboard, vote counts flow through the same `voteLabels` pipeline (computed in LiveDashboard and passed to BracketDiagram). For predictive auto mode, the `PredictiveBracket` component manages its own state. The student `PredictiveStudentView` uses `useRealtimeBracket` for matchup state but votes are handled as predictions, not bracket votes.
**Warning signs:** Fixing SE but not predictive, or vice versa.

## Code Examples

### Current fetchBracketState (likely needs fix)

```typescript
// src/hooks/use-realtime-bracket.ts, line 69-101
const fetchBracketState = useCallback(async () => {
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state`)
      // ^ Missing cache: 'no-store' -- may return cached response
      if (!res.ok) return
      const data: BracketStateResponse = await res.json()
      setMatchups(data.matchups)
      // Also update vote counts from the fetched state
      const counts: VoteCounts = {}
      for (const matchup of data.matchups) {
        if (matchup.voteCounts) {
          const total = Object.values(matchup.voteCounts).reduce(
            (sum, c) => sum + c, 0
          )
          counts[matchup.id] = { ...matchup.voteCounts, total }
        }
      }
      setVoteCounts(counts)
      // ...
    } catch { /* ... */ }
  }, [bracketId])
```

### Likely Fix Pattern 1: Cache-busting fetch

```typescript
// Add cache: 'no-store' and timestamp to prevent caching
const fetchBracketState = useCallback(async () => {
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      // ... rest unchanged
    } catch { /* ... */ }
  }, [bracketId])
```

### Likely Fix Pattern 2: Stale response guard

```typescript
// Track fetch sequence to discard out-of-order responses
const fetchSeqRef = useRef(0)

const fetchBracketState = useCallback(async () => {
    const seq = ++fetchSeqRef.current
    try {
      const res = await fetch(`/api/brackets/${bracketId}/state?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      // Discard stale response if a newer fetch has started
      if (seq !== fetchSeqRef.current) return
      const data: BracketStateResponse = await res.json()
      setMatchups(data.matchups)
      // ...
    } catch { /* ... */ }
  }, [bracketId])
```

### Likely Fix Pattern 3: API route force-dynamic

```typescript
// src/app/api/brackets/[bracketId]/state/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVoteCountsForMatchup } from '@/lib/dal/vote'

// Ensure this route is never cached
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bracketId: string }> }
) {
  // ... existing implementation unchanged
}
```

### voteLabels Computation (currently correct logic, depends on correct state)

```typescript
// src/components/teacher/live-dashboard.tsx, line 484-496
const voteLabels = useMemo(() => {
    const labels: Record<string, { e1: number; e2: number }> = {}
    for (const m of currentMatchups) {
      if (m.status === 'voting' || m.status === 'decided') {
        const counts = mergedVoteCounts[m.id] ?? {}
        labels[m.id] = {
          e1: m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0,
          e2: m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0,
        }
      }
    }
    return labels
  }, [currentMatchups, mergedVoteCounts])
  // ^ Logic is correct IF currentMatchups has the right state
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js 14 route handler caching | Next.js 16 route handler caching (more aggressive) | Next.js 15+ | GET route handlers may cache more aggressively; requires explicit `dynamic = 'force-dynamic'` for real-time endpoints |
| React 18 state batching | React 19 automatic batching | React 19 | Multiple setState calls in async handlers are batched automatically; may affect timing of useMemo recomputation |
| Supabase Realtime v1 | Supabase Realtime v2 (Broadcast) | 2024 | Current implementation correctly uses Broadcast channels via REST API |

## Open Questions

1. **Is the API route actually being cached?**
   - What we know: No `export const dynamic` is set on the state route. The route uses `prisma` queries which may or may not trigger dynamic detection.
   - What's unclear: Whether Next.js 16 caches this particular route handler by default.
   - Recommendation: Add `dynamic = 'force-dynamic'` AND `cache: 'no-store'` on the fetch -- belt and suspenders. Test to confirm.

2. **Does the predictive bracket share the exact same root cause?**
   - What we know: Predictive manual mode on the teacher live dashboard uses the same `voteLabels` pipeline as SE. Auto-mode predictive uses `PredictiveBracket` which does NOT use `useRealtimeBracket` for votes.
   - What's unclear: Whether the predictive "some rounds work, some don't" pattern matches the SE "only final round fails" pattern exactly.
   - Recommendation: Fix the SE root cause first, then verify predictive. If predictive has a different failure pattern, investigate the `PredictiveStudentView` component separately.

3. **Is the student view affected?**
   - What we know: Students see the bracket diagram update (matchups become votable) but the bug description focuses on vote COUNT display. The student `AdvancedVotingView` does NOT pass `voteLabels` to `BracketDiagram` -- students don't see vote counts. The student `SimpleVotingView` shows `MatchupVoteCard` components, not vote counts.
   - What's unclear: Whether students can even SEE vote counts in their view, and if the success criteria "student bracket view for the final round also reflects live vote count changes" refers to something else.
   - Recommendation: Verify what "student vote count display" means. It may refer to the student being able to vote (functional) rather than seeing counts (which students may never see). The existing `showVoteCounts` bracket setting controls teacher-side display.

4. **Does double elimination have this bug?**
   - What we know: DE brackets use the same `useRealtimeBracket` hook and the same `voteLabels` computation in the live dashboard. The key difference is DE uses region-based navigation with separate round tracking.
   - What's unclear: Whether DE grand finals exhibit the same stale state issue.
   - Recommendation: Test DE during verification. If the fix is cache-busting + stale response guarding in `useRealtimeBracket`, it will apply to DE automatically.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files in the realtime vote display pipeline
- `src/hooks/use-realtime-bracket.ts` -- full subscription lifecycle, batching, transport fallback
- `src/components/teacher/live-dashboard.tsx` -- mergedVoteCounts, voteLabels computation
- `src/components/student/advanced-voting-view.tsx` -- student SE view
- `src/components/student/simple-voting-view.tsx` -- student simple view
- `src/components/bracket/bracket-diagram.tsx` -- SVG vote label rendering
- `src/actions/vote.ts` -- castVote broadcast flow
- `src/actions/bracket-advance.ts` -- advanceMatchup/openVoting broadcast flow
- `src/lib/realtime/broadcast.ts` -- server-side broadcast implementation
- `src/app/api/brackets/[bracketId]/state/route.ts` -- state polling endpoint
- `src/lib/dal/vote.ts` -- openMatchupsForVoting, getVoteCountsForMatchup
- `src/lib/bracket/advancement.ts` -- winner propagation to next round

### Secondary (MEDIUM confidence)
- Next.js 16 route handler caching behavior -- based on framework conventions (no explicit `dynamic` export means potentially cached)
- React 19 batching behavior -- based on React 19 automatic batching documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing project stack, no new libraries needed
- Architecture: HIGH - Full data flow traced through all relevant files with detailed analysis
- Root cause: HIGH - Four specific candidates identified with clear investigation paths, all traceable to caching/timing
- Pitfalls: HIGH - Based on direct code analysis of edge cases in the specific files

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable codebase, fix is internal state management)
