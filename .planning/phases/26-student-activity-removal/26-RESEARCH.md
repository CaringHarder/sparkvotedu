# Phase 26: Student Activity Removal - Research

**Researched:** 2026-02-26
**Domain:** Supabase Realtime broadcast, student-side React state management, animation (motion/react)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Removal animation
- Card fades out with a clean opacity fade (100% -> 0%) over ~200ms -- no color tint or decoration changes
- After fade completes, remaining cards slide together smoothly over ~200ms to fill the gap
- When the last activity is removed, show a friendly empty state message (e.g., "No activities right now -- your teacher will add some soon")
- Multiple rapid deletions: each card fades independently as its event arrives -- Claude has discretion on batching/debouncing for performance

#### Mid-activity behavior
- If a student is actively voting on a bracket or poll that gets deleted, show a brief friendly toast (e.g., "Your teacher ended this activity -- heading back!") for ~2 seconds, then redirect to their session dashboard
- Same behavior for both brackets and polls -- consistent experience regardless of activity type
- Tone is friendly/reassuring, not alarming

#### Timing & feedback
- Student dashboard grid: silent removal only -- card fades out with no toast or notification banner
- ~2 seconds latency for removal is acceptable (standard Supabase realtime)
- No teacher-side confirmation of broadcast delivery needed -- teacher deletes and trusts it propagates
- Both delete AND archive trigger student-side removal -- if the teacher doesn't want students seeing it, both paths remove it

#### Edge cases
- Stale tabs: when tab regains focus or reconnects, fetch fresh activity data and remove any deleted/archived items
- Direct URL to deleted activity: redirect student to their session dashboard (no "not found" page)
- Network reconnection: when realtime connection restores after a drop, auto-refetch the full activity list to catch any missed deletions during the outage

### Claude's Discretion
- Subscription scope (session-scoped vs global) -- pick based on existing realtime patterns
- Batching/debouncing strategy for rapid sequential deletions
- Exact empty state illustration/icon choice
- Toast duration fine-tuning
- Reconnection detection mechanism (Supabase channel status vs visibility API)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 26 adds real-time removal of deleted/archived activities from the student dashboard and mid-activity redirect when a student is inside a deleted bracket or poll. The infrastructure for this is **already 90% built**. The existing `broadcastActivityUpdate(sessionId)` function sends a broadcast event on the `activities:{sessionId}` channel, and the existing `useRealtimeActivities` hook subscribes to that channel and refetches from `/api/sessions/{sessionId}/activities`. The activities API already filters to only `active`/`completed` brackets and `active`/`closed` polls -- so deleted or archived items are **automatically excluded** from the refetch response.

The core gap is that the teacher-side `deleteBracket`, `archiveBracket`, `deletePoll`, and `archivePoll` server actions do **not** call `broadcastActivityUpdate(sessionId)` after the mutation. Once those broadcast calls are added, the student `useRealtimeActivities` hook will automatically refetch and the card will disappear. The remaining work is: (1) add fade-out animations to the `ActivityGrid`, (2) add a custom empty state message, (3) handle mid-activity redirect for students inside a deleted bracket/poll, and (4) add reconnection resilience (stale tab refetch).

**Primary recommendation:** Add `broadcastActivityUpdate` calls to the 4 missing teacher actions, wrap `ActivityGrid` cards in AnimatePresence (matching the existing `BracketCardList`/`PollCardList` pattern), and add an `activity_update` listener to the student bracket/poll pages to detect deletion and redirect.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.93.3 | Realtime broadcast channel subscription | Already used for all realtime features |
| `motion` (motion/react) | ^12.29.2 | AnimatePresence fade-out + layout animations | Already used in BracketCardList, PollCardList, SimpleVotingView |
| Next.js | 16.1.6 | App router, server actions | Application framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` | (bundled) | `useRouter` for programmatic redirect on deletion | Mid-activity redirect |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase broadcast for deletion signal | Supabase `postgres_changes` listener | Broadcast is correct -- avoids N per-subscriber DB reads (per 02-RESEARCH.md Pitfall 5). Already established pattern. |
| Custom toast component | sonner or react-hot-toast | Project has NO toast library installed. Building a minimal inline toast is simpler and avoids a new dependency for one use case. |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── use-realtime-activities.ts    # MODIFY: add reconnection resilience
├── components/student/
│   ├── activity-grid.tsx             # MODIFY: add AnimatePresence + custom empty state
│   ├── activity-card.tsx             # No changes needed
│   └── empty-state.tsx              # MODIFY: support configurable message variant
├── actions/
│   ├── bracket.ts                    # MODIFY: add broadcastActivityUpdate to delete/archive
│   └── poll.ts                       # MODIFY: add broadcastActivityUpdate to delete/archive
├── app/(student)/session/[sessionId]/
│   ├── bracket/[bracketId]/page.tsx  # MODIFY: add activity_update listener for redirect
│   └── poll/[pollId]/page.tsx        # MODIFY: add activity_update listener for redirect
└── lib/realtime/
    └── broadcast.ts                  # No changes needed (broadcastActivityUpdate exists)
```

### Pattern 1: Teacher Action -> Broadcast -> Student Refetch (EXISTING)
**What:** Server action mutates DB, then broadcasts to session channel, student hook refetches from API.
**When to use:** All activity lifecycle changes (activate, complete, delete, archive).
**Already implemented for:** `updateBracketStatus` (active/completed), `updatePollStatus` (active/closed/archived).
**Missing from:** `deleteBracket`, `archiveBracket`, `deletePoll`, `archivePoll`.

```typescript
// Source: src/actions/bracket.ts lines 157-166 (existing pattern)
// Dual-channel broadcast: notify session activity channel
if (['active', 'completed'].includes(parsed.data.status)) {
  const bracket = await prisma.bracket.findUnique({
    where: { id: parsed.data.bracketId },
    select: { sessionId: true },
  })
  if (bracket?.sessionId) {
    broadcastActivityUpdate(bracket.sessionId).catch(console.error)
  }
}
```

**Critical detail for delete actions:** The bracket/poll record is deleted before the broadcast call. For `deleteBracket`, `deleteBracketDAL` cascades and removes the row. This means you **must read the sessionId BEFORE calling the DAL delete function**, because after deletion the record no longer exists in the database.

### Pattern 2: AnimatePresence with popLayout (EXISTING)
**What:** Wraps a list of keyed motion.div elements to animate exits.
**When to use:** Card grids where items can be removed.
**Already implemented in:** `BracketCardList` and `PollCardList` (identical pattern).

```typescript
// Source: src/components/bracket/bracket-card-list.tsx (existing pattern)
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <AnimatePresence mode="popLayout">
    {items.map((bracket) => (
      <motion.div
        key={bracket.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <BracketCard ... />
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

For Phase 26, adapt this to ActivityGrid with the user-specified timing: `exit={{ opacity: 0 }}` with `transition={{ duration: 0.2 }}` (200ms fade), and `layout` prop handles the remaining-cards slide-together over ~200ms.

### Pattern 3: Broadcast-Driven Redirect (NEW)
**What:** Student bracket/poll pages subscribe to `activities:{sessionId}` and refetch the activity list. If the current activity is no longer in the list, show a toast and redirect.
**When to use:** Mid-activity deletion detection.
**Implementation approach:** Add a secondary channel subscription in the student bracket/poll pages that listens to `activity_update` events, then checks whether the current bracket/poll still exists via a lightweight fetch. If 404, show toast and redirect.

Alternative (simpler): Listen on the bracket-specific channel (`bracket:{bracketId}`) for a new `bracket_deleted` event. This avoids an extra fetch but requires a new event type. **Recommendation: Use the activity-scoped approach** -- it reuses the existing `activity_update` event and avoids creating new event types. The refetch is cheap (one API call) and already proven.

### Anti-Patterns to Avoid
- **Reading sessionId after deletion:** `deleteBracketDAL` cascades and removes the record. You cannot query `bracket.sessionId` after calling the DAL. Read it first.
- **Multiple Supabase channel subscriptions to same topic:** If the student bracket page is already subscribed to `bracket:{bracketId}`, adding a second subscription to `activities:{sessionId}` creates a second channel. This is fine -- just ensure cleanup (`supabase.removeChannel`) is paired.
- **Using postgres_changes instead of broadcast:** This was explicitly avoided in earlier phases (02-RESEARCH.md Pitfall 5) because each subscribing student triggers a DB read. Stick with broadcast + refetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card exit animation | Manual CSS transitions with `display: none` | motion/react `AnimatePresence` with `layout` prop | Already used everywhere; handles unmount timing correctly |
| Toast notification | Full toast system with portal, queue, stacking | Minimal inline `<div>` with `setTimeout` auto-dismiss | Only one toast message needed in entire phase; no toast library installed |
| Reconnection detection | Custom WebSocket status polling | Supabase channel `subscribe()` status callback + `document.visibilitychange` | Channel status already emits on reconnect; visibility API handles stale tabs |
| Activity existence check | Custom WebSocket "is-alive" ping | Fetch `/api/brackets/{id}/state` and check response status | API already returns 404 for deleted brackets/polls |

**Key insight:** The broadcast infrastructure and activity refetch pattern are already fully built. This phase is about wiring existing pieces together, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: SessionId Lost After Cascade Delete
**What goes wrong:** Calling `deleteBracketDAL` removes the bracket row. Then trying to read `bracket.sessionId` returns null/not-found.
**Why it happens:** Prisma cascade delete removes the record synchronously within the DAL.
**How to avoid:** In the server action, query `bracket.sessionId` BEFORE calling the DAL delete function. Store it in a local variable, then use it for the broadcast call after deletion.
**Warning signs:** `broadcastActivityUpdate` never fires; students never see the card disappear.

```typescript
// CORRECT: Read sessionId before delete
const bracket = await prisma.bracket.findFirst({
  where: { id: parsed.data.bracketId, teacherId: teacher.id },
  select: { sessionId: true },
})
const sessionId = bracket?.sessionId

const result = await deleteBracketDAL(parsed.data.bracketId, teacher.id)
if ('error' in result) return { error: result.error }

// Broadcast AFTER delete, using pre-read sessionId
if (sessionId) {
  broadcastActivityUpdate(sessionId).catch(console.error)
}
```

### Pitfall 2: AnimatePresence Key Mismatch
**What goes wrong:** AnimatePresence exit animations don't play because the key changes or the component unmounts before animation completes.
**Why it happens:** When `useRealtimeActivities` refetches, the activities array gets replaced entirely. If the component re-renders with a new array reference, AnimatePresence may not detect the removal.
**How to avoid:** Track activities in local state within the grid component. Compare new activities from the hook against local state to detect removals. Let AnimatePresence handle the exit animation on the local state array.
**Warning signs:** Cards disappear instantly instead of fading out.

### Pitfall 3: Race Condition Between Redirect and Refetch
**What goes wrong:** Student is on bracket page, bracket gets deleted. The `activity_update` event triggers a refetch in the `useRealtimeActivities` hook (if running), AND also triggers the bracket page's deletion check. Both try to navigate at the same time.
**Why it happens:** Two independent listeners react to the same broadcast event.
**How to avoid:** The bracket/poll page listener should handle redirect independently. The `useRealtimeActivities` hook on the dashboard doesn't need to redirect -- it just removes the card. They operate on different pages, so there's no conflict if the student is ON the bracket page (the dashboard grid isn't mounted).
**Warning signs:** Double navigation or navigation to wrong page.

### Pitfall 4: Stale Tab Shows Deleted Activities
**What goes wrong:** Student has two tabs open. One tab is active when the activity is deleted. The background tab still shows the deleted activity card.
**Why it happens:** Background tabs may miss broadcast events (browsers throttle WebSocket keep-alive).
**How to avoid:** Add a `document.visibilitychange` listener that refetches activities when the tab becomes visible again. This is the user's explicit "stale tabs" edge case requirement.
**Warning signs:** Old activities persist until manual page refresh.

### Pitfall 5: Supabase Channel Subscription Leak
**What goes wrong:** Adding new channel subscriptions without paired cleanup creates orphaned subscriptions that accumulate over session lifetime.
**Why it happens:** The success criteria explicitly states "No Supabase channel subscription leaks introduced -- every new channel subscription has a paired removeChannel in cleanup."
**How to avoid:** Every `supabase.channel()` call must have a corresponding `supabase.removeChannel(channel)` in the useEffect cleanup function. Audit all new subscriptions.
**Warning signs:** Browser memory climbs; WebSocket connections multiply in browser DevTools.

### Pitfall 6: Empty State Flash After Last Card Fades
**What goes wrong:** The empty state component renders immediately when activities array length hits 0, before the last card's fade animation completes.
**Why it happens:** The AnimatePresence exit animation runs concurrently with the state update that triggers the empty state.
**How to avoid:** Use AnimatePresence's `onExitComplete` callback to delay showing the empty state until the last card finishes its exit animation. Alternatively, keep track of whether an exit animation is in progress.
**Warning signs:** Empty state text appears overlapping with the fading card.

## Code Examples

Verified patterns from the existing codebase:

### Server-Side Broadcast After Delete (NEW -- pattern to implement)
```typescript
// Source: Adapted from src/actions/bracket.ts updateBracketStatus pattern
// For deleteBracket action:
export async function deleteBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = deleteBracketSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid delete data' }

  // CRITICAL: Read sessionId BEFORE delete (cascade removes the row)
  const bracket = await prisma.bracket.findFirst({
    where: { id: parsed.data.bracketId, teacherId: teacher.id },
    select: { sessionId: true },
  })
  const sessionId = bracket?.sessionId

  try {
    const result = await deleteBracketDAL(parsed.data.bracketId, teacher.id)
    if ('error' in result) return { error: result.error }

    revalidatePath('/brackets')

    // Broadcast removal to students
    if (sessionId) {
      broadcastActivityUpdate(sessionId).catch(console.error)
    }

    return { success: true }
  } catch {
    return { error: 'Failed to delete bracket' }
  }
}
```

### AnimatePresence in ActivityGrid (NEW -- pattern to implement)
```typescript
// Source: Adapted from src/components/bracket/bracket-card-list.tsx
import { motion, AnimatePresence } from 'motion/react'

// Inside ActivityGrid, track activities with local state for exit animations:
const [displayedActivities, setDisplayedActivities] = useState<Activity[]>([])

// Sync from hook, detecting removals:
useEffect(() => {
  setDisplayedActivities(activities)
}, [activities])

return (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <AnimatePresence mode="popLayout">
      {displayedActivities.map((activity) => (
        <motion.div
          key={activity.id}
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ActivityCard activity={activity} onClick={...} />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
)
```

### Mid-Activity Deletion Detection (NEW -- pattern to implement)
```typescript
// Source: Pattern adapted from src/hooks/use-realtime-activities.ts subscription
// Inside student bracket page, add a second channel listener:

useEffect(() => {
  const supabase = createClient()
  const channel = supabase
    .channel(`activities:${sessionId}:deletion-check`)
    .on('broadcast', { event: 'activity_update' }, async () => {
      // Check if this bracket still exists
      const res = await fetch(`/api/brackets/${bracketId}/state`)
      if (!res.ok) {
        // Bracket was deleted -- show toast and redirect
        setShowDeletionToast(true)
        setTimeout(() => {
          router.push(`/session/${sessionId}`)
        }, 2000)
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [sessionId, bracketId, router])
```

### Reconnection Resilience (NEW -- pattern to implement)
```typescript
// Source: Supabase channel status + Web Visibility API
// Inside useRealtimeActivities, enhance subscription:

useEffect(() => {
  fetchActivities()

  const channel = supabase
    .channel(`activities:${sessionId}`)
    .on('broadcast', { event: 'activity_update' }, () => {
      fetchActivities()
    })
    .subscribe((status) => {
      // Re-fetch on reconnection to catch missed events
      if (status === 'SUBSCRIBED') {
        fetchActivities()
      }
    })

  // Stale tab: refetch when tab becomes visible again
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      fetchActivities()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    supabase.removeChannel(channel)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}, [sessionId, supabase, fetchActivities])
```

### Inline Toast for Mid-Activity Redirect (NEW -- no library needed)
```typescript
// No toast library installed. Build minimal inline component:
{showDeletionToast && (
  <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg animate-in fade-in slide-in-from-bottom-4">
    Your teacher ended this activity — heading back!
  </div>
)}
```

## Discretion Recommendations

### Subscription Scope: Session-Scoped (RECOMMENDED)
**Recommendation:** Use session-scoped channels (`activities:{sessionId}`), matching the existing pattern.

**Rationale:** The codebase already uses `activities:{sessionId}` as the channel topic for activity updates. The `useRealtimeActivities` hook subscribes to this channel. All broadcast calls use `broadcastActivityUpdate(sessionId)`. Changing to a different scope would break the established convention.

For mid-activity redirect (student bracket/poll pages), subscribe to the same `activities:{sessionId}` channel with a unique channel name suffix (e.g., `activities:${sessionId}:deletion-check-${bracketId}`) to avoid Supabase channel name collisions. This leverages the same broadcast event without needing new event types.

### Batching/Debouncing: None Needed (RECOMMENDED)
**Recommendation:** No batching or debouncing for rapid sequential deletions.

**Rationale:** Each `activity_update` broadcast triggers a refetch of the full activity list from `/api/sessions/{sessionId}/activities`. This is already idempotent -- multiple rapid refetches just return the same (increasingly smaller) list. The AnimatePresence `popLayout` mode handles overlapping exit animations gracefully. Each card fades independently as requested. The HTTP overhead of rapid refetches is negligible (single DB query, JSON response of a few activities).

If a teacher deletes 5 activities in 2 seconds, the student will see 5 refetches, each returning a list with one fewer item. AnimatePresence will animate each removal independently. This matches the user's decision: "each card fades independently as its event arrives."

### Empty State: Reuse Existing with Message Variant (RECOMMENDED)
**Recommendation:** Add a `message` prop to the existing `EmptyState` component to support the "No activities right now -- your teacher will add some soon" text variant while keeping the current "Hang tight!" default.

**Rationale:** The existing `EmptyState` component at `src/components/student/empty-state.tsx` has the spark/lightning icon and styling. Adding a prop for alternate messaging is simpler than creating a new component.

### Toast Duration: 2 Seconds (LOCKED)
**Recommendation:** Use exactly 2 seconds as specified in the user's decision. The redirect happens after the toast auto-dismisses.

### Reconnection Detection: Combined Approach (RECOMMENDED)
**Recommendation:** Use both Supabase channel `subscribe()` status callback AND `document.visibilitychange` event.

**Rationale:**
1. **Supabase channel status:** When the WebSocket reconnects after a drop, the channel emits `SUBSCRIBED` status again. Adding a refetch in the status callback catches missed events during the outage. This is already partially implemented -- `useRealtimeBracket` and `useRealtimePoll` both fetch on `SUBSCRIBED` status.
2. **Visibility API:** Handles the "stale tab" edge case where the browser may have throttled or dropped the WebSocket entirely. When the user switches back to the tab, `visibilitychange` fires and triggers a refetch. This is a well-supported browser API.

The combination covers both scenarios: network drops (Supabase status) and tab backgrounding (visibility API).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package (import from `motion/react`) | 2024 rebrand | Codebase already uses `motion/react` -- no change needed |
| Supabase Realtime v1 | Supabase Realtime v2 (broadcast) | Supabase JS v2.x | Already using v2 broadcast pattern |

**Deprecated/outdated:**
- `framer-motion` is now `motion` -- codebase already migrated (imports from `motion/react`)
- Using `postgres_changes` for multi-subscriber scenarios was deprecated in favor of broadcast (per project's own 02-RESEARCH.md)

## Open Questions

1. **Channel name uniqueness for mid-activity listener**
   - What we know: Supabase requires unique channel names per subscription. The dashboard's `useRealtimeActivities` already subscribes to `activities:{sessionId}`. If the student bracket page also subscribes to the same topic, it needs a different channel name.
   - What's unclear: Whether Supabase allows multiple subscriptions to the same topic with different channel names, or if the same client-side channel name can be reused across components.
   - Recommendation: Use a unique suffix like `activities:${sessionId}:bracket-${bracketId}` for the bracket page's listener. This is a common Supabase pattern for multiple subscriptions to the same topic.

2. **archiveBracket returns updateBracketStatusDAL result**
   - What we know: `archiveBracketDAL` delegates to `updateBracketStatusDAL` which returns the updated bracket (including `sessionId`). But `archiveBracket` in `actions/bracket.ts` does NOT broadcast. Similarly, the `updateBracketStatus` action only broadcasts for `active` and `completed` statuses, not `archived`.
   - What's unclear: Nothing -- this is the gap to fix.
   - Recommendation: Add broadcast to `archiveBracket` action using the same pre-read pattern. For `updateBracketStatus`, expand the status list to include `archived`.

3. **deletePoll DAL returns boolean, not sessionId**
   - What we know: `deletePollDAL` returns `true`/`false`, not the poll object. The `deletePoll` action needs the `sessionId` for broadcast but doesn't have it after the DAL call.
   - What's unclear: Nothing -- same pre-read pattern as bracket.
   - Recommendation: Query `poll.sessionId` before calling `deletePollDAL`, same as the bracket pattern.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `src/hooks/use-realtime-activities.ts` -- existing broadcast subscription pattern
- Codebase analysis of `src/lib/realtime/broadcast.ts` -- existing `broadcastActivityUpdate` function
- Codebase analysis of `src/actions/bracket.ts` and `src/actions/poll.ts` -- existing dual-channel broadcast pattern in `updateBracketStatus` and `updatePollStatus`
- Codebase analysis of `src/components/bracket/bracket-card-list.tsx` and `src/components/poll/poll-card-list.tsx` -- existing AnimatePresence exit animation pattern
- Codebase analysis of `src/app/api/sessions/[sessionId]/activities/route.ts` -- existing activity filtering (only active/completed brackets, active/closed polls)
- Codebase analysis of `src/lib/dal/bracket.ts` -- `deleteBracketDAL` cascade behavior and `VALID_TRANSITIONS` map
- Codebase analysis of `src/lib/dal/poll.ts` -- `deletePollDAL` return type and `VALID_POLL_TRANSITIONS` map

### Secondary (MEDIUM confidence)
- `motion` v12 AnimatePresence API with `popLayout` mode -- verified via existing codebase usage
- Supabase Realtime broadcast channel status callbacks (`SUBSCRIBED`) -- verified via existing hooks
- Web Visibility API (`document.visibilitychange`) -- standard browser API, no codebase precedent but well-documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all patterns exist in codebase
- Architecture: HIGH - extending existing broadcast + refetch pattern to 4 additional actions
- Pitfalls: HIGH - all identified from direct codebase analysis (cascade delete, channel cleanup)
- Animation: HIGH - exact pattern exists in BracketCardList/PollCardList
- Mid-activity redirect: MEDIUM - new pattern but built from existing primitives

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable -- no external dependencies changing)
