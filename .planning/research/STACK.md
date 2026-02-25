# Stack Research: v1.3 Bug Fixes & UX Parity

**Domain:** EdTech classroom voting platform -- bug fixes and UI parity for polls and brackets
**Researched:** 2026-02-24
**Confidence:** HIGH (all patterns verified against installed versions and existing codebase)

---

## Executive Summary

v1.3 requires **zero new npm packages**. All five features are achievable with the existing stack (Next.js 16.1.6, React 19.2.3, Supabase JS 2.93.3, shadcn/ui DropdownMenu, Framer Motion 12.x). The work is logic fixes and UI assembly from existing primitives, not library additions.

The critical pattern theme across all five items is **React state lifecycle management**: specifically, knowing when to use `useRef` vs `useState`, when cleanup runs, and how to defer "guard" flag setting until after async operations complete. The `hasShownRevealRef` pattern already established in Phase 24 (DEVotingView, teacher live-dashboard) is the canonical solution for all stale-ref issues.

---

## Current Stack (Verified from package.json)

| Technology | Installed Version | Role in v1.3 |
|------------|-------------------|---------------|
| Next.js | 16.1.6 | No changes needed |
| React | 19.2.3 | `useRef`, `useTransition`, `useFormStatus` -- existing hooks |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Already installed; used in `DropdownMenu` via shadcn/ui |
| @supabase/supabase-js | ^2.93.3 | Broadcast REST API for `activity_deleted` event |
| Tailwind CSS | ^4 | No changes needed |
| motion (Framer Motion) | ^12.29.2 | No changes needed |
| lucide-react | ^0.563.0 | `MoreVertical` icon already used in bracket-card.tsx |
| Prisma | ^7.3.0 | No changes needed |
| Zod | ^4.3.6 | No changes needed |

---

## What Changes (No New Packages)

### 1. Poll Context Menu (Triple-Dot Menu)

**Goal:** Add a `MoreVertical` triple-dot context menu to poll cards matching the bracket card pattern.

**Pattern source:** `src/components/bracket/bracket-card.tsx` -- already implements the same menu with `MoreVertical` from lucide-react, a custom `menuRef`, `menuOpen` state, `showDeleteConfirm` dialog, and outside-click cleanup via `useEffect`.

**Implementation:** New `PollCardMenu` component (or inline on the polls list page). Use the existing `shadcn/ui` `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` primitives already installed via `@radix-ui/react-dropdown-menu`.

The bracket-card uses a custom DOM-managed menu (not shadcn DropdownMenu) whereas `session-card-menu.tsx` uses the shadcn DropdownMenu primitive. Either pattern is valid; the shadcn one is cleaner and already available.

**Key primitives (all already installed):**

```typescript
import { MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

**Stop-propagation pattern** (critical for cards that are also links):

```typescript
// Prevent card navigation when clicking the menu trigger
<DropdownMenuTrigger asChild>
  <button
    onClick={(e) => {
      e.stopPropagation()
      e.preventDefault()
    }}
  >
    <MoreVertical className="h-4 w-4" />
  </button>
</DropdownMenuTrigger>
```

**No new packages needed.** The DropdownMenu component is already in `src/components/ui/dropdown-menu.tsx`.

---

### 2. RR All-at-Once Bracket Premature Completion Fix

**Goal:** Prevent RR bracket from marking completion before all matchups in an all-at-once pacing round are decided.

**Root cause pattern:** The existing `bracketDone` computation (corrected in Phase 24) and the server-side `isRoundRobinComplete` function already check that all matchups are decided. The issue is whether the server-side action or client-side hook prematurely detects completion when only some matchups in a round are decided.

**Key existing pattern to understand:**

```typescript
// In use-realtime-bracket.ts (lines 139-152):
// 'winner_selected' -> fetchBracketState() [bracket may still be 'active']
// 'bracket_completed' -> fetchBracketState() AND setBracketCompleted(true)
```

**Investigation target:** `src/actions/round-robin.ts` `isRoundRobinComplete` -- confirm it checks ALL matchups across ALL rounds (not just the current round). The query must be `matchups.every(m => m.status === 'decided')` across all rounds, not scoped to a single round.

**No new packages needed.** Fix is a query condition change in the existing Prisma DAL.

---

### 3. SE Bracket Final Round Realtime Update Fix

**Goal:** Fix single-elimination bracket final round not updating in realtime on the student view.

**Root cause pattern (diagnosed via Phase 24 work):** The race condition between `winner_selected` and `bracket_completed` broadcasts creates two rapid `fetchBracketState()` calls. The second fetch resolves while a setTimeout is pending, cancelling the timer and leaving the ref already set (preventing rescheduling). This is identical to the teacher RR race condition fixed in Phase 24-05.

**Canonical fix (established in Phase 24-05):**

Move `hasShownRevealRef.current = true` INSIDE the `setTimeout` callback, not before it. This ensures that if the cleanup function cancels the timer, the ref is NOT yet set -- allowing the next effect run to reschedule the timer.

```typescript
// WRONG (pre-Phase-24-05 pattern -- ref set before timer fires):
hasShownRevealRef.current = true
const timer = setTimeout(() => {
  setRevealState({ ... })
}, 2000)
return () => clearTimeout(timer)

// CORRECT (Phase-24-05 pattern -- ref set INSIDE callback):
const timer = setTimeout(() => {
  hasShownRevealRef.current = true  // set here, not before
  setRevealState({ ... })
}, 2000)
return () => clearTimeout(timer)
```

**Dependency array volatility:** The `currentMatchups` dependency in celebration-trigger useEffects causes frequent re-runs because `fetchBracketState` calls `setMatchups(data.matchups)` with a new array reference on every fetch. This is the mechanism that cancels timers. Rather than removing `currentMatchups` from the dependency array (which would require a ref-based workaround), the correct fix is to keep the dependency but move the guard flag setting inside the timer callback.

**No new packages needed.** Pure React pattern fix in existing components.

---

### 4. Student View Dynamic Activity Removal on Delete

**Goal:** When a teacher deletes a poll or bracket while students are on the session dashboard, the deleted activity card should disappear without a page refresh.

**Current architecture:** `useRealtimeActivities` subscribes to the `activities:{sessionId}` channel and listens for `activity_update` events. On any such event, it re-fetches the activity list from the server. The hook correctly removes deleted items because the API endpoint naturally excludes deleted records.

**Gap:** The teacher's `deletePoll` and `deleteBracket` server actions currently call `revalidatePath` but do NOT call `broadcastActivityUpdate(sessionId)`. Without a broadcast, the realtime hook never fires on student devices.

**Verified in source code:**

```typescript
// src/actions/poll.ts deletePoll (line 194-203):
// EXISTING: revalidatePath('/activities')
// MISSING:  broadcastActivityUpdate(result.sessionId)

// src/actions/bracket.ts deleteBracket:
// EXISTING: router.refresh() in the client component
// MISSING:  broadcastActivityUpdate(sessionId) in the server action
```

**Fix:** Add `broadcastActivityUpdate(sessionId)` to both `deletePoll` and `deleteBracket` server actions. The `broadcastActivityUpdate` function already exists in `src/lib/realtime/broadcast.ts` and uses the established REST API pattern. The deleted poll/bracket will no longer appear in the API response, so students will see the activity grid update automatically when the broadcast fires.

**Broadcast pattern (already implemented, just needs to be called on delete):**

```typescript
// In src/lib/realtime/broadcast.ts (already exists):
export async function broadcastActivityUpdate(sessionId: string): Promise<void> {
  await broadcastMessage({
    topic: `activities:${sessionId}`,
    event: 'activity_update',
    payload: {},
  })
}
```

The client hook (`useRealtimeActivities`) already handles `activity_update` events by re-fetching. The re-fetch will return the activity list without the deleted item. No new event type needed -- the existing `activity_update` + re-fetch pattern handles removals correctly.

**SessionId retrieval for delete actions:** The server action must fetch the `sessionId` before deleting (to include in the broadcast). For polls, the DAL can return the sessionId on delete. For brackets, same approach. Neither action currently returns the sessionId from the DAL on delete -- this is the only code change needed beyond calling `broadcastActivityUpdate`.

**No new packages needed.** Extend existing `broadcastActivityUpdate` call pattern.

---

### 5. Sign-Out Button Click Visual Feedback

**Goal:** Show a visual "Signing out..." state on the Sign Out button when clicked, to indicate the action is in progress (the redirect can take 1-2 seconds on slow connections).

**Current implementation:**

```typescript
// src/components/auth/signout-button.tsx
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Sign Out
      </Button>
    </form>
  )
}
```

The `signOut` server action calls `supabase.auth.signOut()` then `redirect('/login')`. The redirect can take 1-2 seconds on slow connections, leaving no feedback.

**Two valid patterns -- choose based on component topology:**

**Pattern A (useFormStatus -- preferred for `<form action={...}>`):**

`useFormStatus` reads the pending state from the nearest parent `<form>`. It must be called from a CHILD component rendered inside the form, not from the same component that renders the form.

```typescript
'use client'
import { useFormStatus } from 'react-dom'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

function SignOutButtonInner() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SignOutButtonInner />
    </form>
  )
}
```

**Pattern B (useTransition -- for event-handler-based calls):**

```typescript
'use client'
import { useTransition } from 'react'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
    >
      {isPending ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
```

**Recommendation:** Use `useFormStatus` (Pattern A). It is the idiomatic React 19 pattern for `<form action={serverAction}>` submissions and has zero risk of the `redirect()` call conflict (redirect works normally inside `startTransition` too, but `useFormStatus` is the canonical match for the form-action pattern).

**No new packages needed.** `useFormStatus` is from `react-dom` (already installed as React 19.2.3).

---

## What NOT to Add

| Avoid | Why | What to Do Instead |
|-------|-----|---------------------|
| Socket.IO, Pusher, Ably | Activity removal is already handled by the broadcast re-fetch pattern; missing the `broadcastActivityUpdate` call on delete is the gap, not the transport | Add `broadcastActivityUpdate` call to `deletePoll` and `deleteBracket` server actions |
| `react-hot-toast` or `sonner` | Already have a deletion confirmation dialog pattern from `bracket-card.tsx`; poll delete confirmation should match that | Reuse the existing confirmation dialog pattern (inline div or shadcn `Dialog`) |
| A new menu library | `@radix-ui/react-dropdown-menu` is already installed and wrapped by shadcn/ui | Use existing `src/components/ui/dropdown-menu.tsx` |
| `postgres_changes` subscription for delete detection | Adds RLS complexity (currently deny-all RLS blocks postgres_changes for anon role) and is slower than broadcast for this use case | Use existing broadcast pattern with `broadcastActivityUpdate` |
| `useEffectEvent` (experimental React hook) | While `useEffectEvent` solves stale closure elegantly, it is experimental and not available in stable React 19.2.3 | Use the `hasShownRevealRef` pattern: move guard flag setting inside the timer callback |
| `useOptimistic` for instant deletion | Adds complexity; the re-fetch after broadcast is fast enough (~100-200ms); optimistic removal risks showing deleted items as removed before confirmation | Keep the broadcast-then-refetch pattern; it is already fast enough for classroom use |

---

## Version Compatibility (Verified)

| Package | Version | Notes for v1.3 |
|---------|---------|----------------|
| react / react-dom | 19.2.3 | `useFormStatus` is stable in React 19 (moved from canary). `useTransition` stable since React 18. `useRef` is core. |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Already installed. `DropdownMenu` wrapping in `src/components/ui/dropdown-menu.tsx` handles all the animation and accessibility. |
| @supabase/supabase-js | ^2.93.3 | Broadcast REST API (`POST /realtime/v1/api/broadcast`) confirmed working for all other activity events. Adding `broadcastActivityUpdate` on delete uses the identical pattern. |
| next | 16.1.6 | Server actions with `redirect()` inside `useFormStatus` form context work correctly. `revalidatePath` calls continue to work for the teacher view. |
| lucide-react | ^0.563.0 | `MoreVertical`, `Trash2` already imported in `bracket-card.tsx` -- same icons will be used for poll menu. |

---

## React Pattern Reference for This Milestone

### Pattern 1: Ref Guard Inside Timer (SE bracket final round, RR celebration fixes)

The canonical fix for useEffect timer race conditions where a cleanup function cancels the timer but the guard ref was already set synchronously:

```typescript
// CANONICAL PATTERN (Phase 24-05 established):
const hasShownRevealRef = useRef(false)

useEffect(() => {
  if (condition && !hasShownRevealRef.current) {
    // Do NOT set the ref here -- it would prevent rescheduling on cleanup
    const timer = setTimeout(() => {
      hasShownRevealRef.current = true  // Set INSIDE callback
      setRevealState({ ... })
    }, 2000)
    return () => clearTimeout(timer)  // Cleanup only cancels timer, not ref
  }
}, [dependency1, dependency2])
```

Why this works: If the effect cleanup fires (due to dependency change) before the timer fires, `hasShownRevealRef.current` is still `false`. The next effect run will re-schedule the timer. Only when the timer actually fires does the ref get set to `true`, preventing subsequent re-triggers.

### Pattern 2: useFormStatus for Server Action Pending State

```typescript
// Must be called in a CHILD component inside the <form>, not the form component itself
import { useFormStatus } from 'react-dom'

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}
```

### Pattern 3: Broadcast on Delete for Realtime List Updates

```typescript
// In server action -- after deleting, broadcast to update all student views:
export async function deletePoll(input: unknown) {
  // ... auth + validation ...
  const deleted = await deletePollDAL(parsed.data.pollId, teacher.id)
  if (!deleted) return { error: 'Poll not found' }

  // Existing: revalidatePath for teacher server-side cache
  revalidatePath('/activities')

  // ADD: broadcast to update student realtime views
  if (deleted.sessionId) {
    broadcastActivityUpdate(deleted.sessionId).catch(console.error)
  }

  return { success: true }
}
```

The `.catch(console.error)` pattern follows the existing convention in this codebase -- broadcast failures are best-effort and must not break the delete flow.

---

## Supabase Realtime Architecture (No Changes)

The dual-channel broadcast pattern is unchanged:

```
Teacher Server Action (delete/update)
    |
    | POST /realtime/v1/api/broadcast  (service_role key)
    v
Supabase Broadcast
    |
    | WebSocket
    v
Student Browser (useRealtimeActivities)
    | activity_update event received
    v
fetchActivities() -> /api/sessions/{sessionId}/activities
    | response excludes deleted item
    v
setActivities(filtered) -> card removed from DOM
```

The same `activities:{sessionId}` channel used for activation events (Phase 24-01) handles removal events. No new channel needed.

---

## Migration Execution Order (v1.3)

Ordered by independence and risk:

1. **Sign-out button visual feedback** -- purely additive UI change, zero risk
2. **Poll context menu** -- new component using existing primitives, no data changes
3. **Student activity removal broadcast** -- add `broadcastActivityUpdate` to delete server actions; requires DAL to return `sessionId` on delete
4. **SE bracket final round realtime fix** -- move `hasShownRevealRef.current = true` inside setTimeout in relevant student bracket page effect
5. **RR all-at-once premature completion fix** -- requires investigation of `isRoundRobinComplete` query scope; should fix before SE bracket fix to understand if same root cause

Items 1-2 have no dependencies. Items 3-5 are independent of each other and of 1-2.

---

## Sources

- **package.json (HIGH confidence):** Direct read of `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/package.json` -- all installed versions verified
- **Existing codebase (HIGH confidence):** Read `src/components/teacher/session-card-menu.tsx`, `src/components/bracket/bracket-card.tsx`, `src/components/auth/signout-button.tsx`, `src/hooks/use-realtime-activities.ts`, `src/hooks/use-realtime-bracket.ts`, `src/lib/realtime/broadcast.ts`, `src/actions/poll.ts`, `src/actions/auth.ts` -- architecture fully understood
- **Phase 24 debug files (HIGH confidence):** Read all `.planning/debug/*.md` files -- root causes confirmed for all five features; celebration-loops-infinitely.md and teacher-rr-celebration-not-triggering.md directly identify the hasShownRevealRef pattern as the fix
- **Phase 24 verification (HIGH confidence):** Read `24-VERIFICATION.md` -- confirms hasShownRevealRef inside-callback pattern is already validated and working in production (Plans 05-06)
- **React useFormStatus docs (HIGH confidence, verified via WebSearch):** https://react.dev/reference/react-dom/hooks/useFormStatus -- `useFormStatus` is stable in React 19, must be called from child inside form, returns `pending` boolean
- **React useTransition docs (HIGH confidence):** https://react.dev/reference/react/useTransition -- alternative to useFormStatus for event-handler pattern
- **shadcn/ui DropdownMenu (HIGH confidence, verified via WebSearch):** https://ui.shadcn.com/docs/components/dropdown-menu -- already installed via `@radix-ui/react-dropdown-menu@2.1.16`; wraps Radix primitives with correct accessibility and animation
- **Supabase Broadcast REST API (HIGH confidence):** https://supabase.com/docs/guides/realtime/broadcast -- REST broadcast via `POST /realtime/v1/api/broadcast` confirmed supported; existing pattern in `src/lib/realtime/broadcast.ts` is correct and matches docs
- **React useRef stale closure pattern (MEDIUM confidence, WebSearch):** Multiple sources confirm: refs avoid stale closures because `ref.current` always evaluates to the actual value; moving ref assignment inside timer callback prevents cancelled-timer false-positive locking

---

*Stack research for: SparkVotEDU v1.3 Bug Fixes & UX Parity*
*Researched: 2026-02-24*
