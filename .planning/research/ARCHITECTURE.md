# Architecture Research: v1.3 Bug Fixes & UX Parity

**Domain:** Integration architecture for 5 targeted fixes to existing classroom voting app
**Researched:** 2026-02-24
**Confidence:** HIGH (direct codebase analysis of all relevant source files)

---

## Current Architecture Snapshot

SparkVotEDU v1.2 established this dual-channel broadcast architecture, which all 5 fixes integrate into:

```
TEACHER BROWSER                        STUDENT BROWSER
  LiveDashboard / PollLive               ActivityGrid / StudentBracketPage
         |                                         |
  useRealtimeBracket()               useRealtimeActivities()
  useRealtimePoll()                  useRealtimeBracket()
         |                                         |
         +------ Supabase Realtime WebSocket ------+
                          |
              +===========+===========+
              |                       |
      bracket:{id}             activities:{sessionId}
      poll:{id}                (session-wide channel)
      (activity-specific       Event: activity_update
       channels)               Event: participant_joined
      Event: vote_update
      Event: bracket_update
      Event: poll_update
              |                       |
              +===========+===========+
                          |
         Server Actions (src/actions/*.ts)
                          |
              broadcastMessage() via REST API
              POST /realtime/v1/api/broadcast
              (service_role key, no WebSocket)
                          |
                        Prisma
                     (bypassrls)
                          |
                     PostgreSQL
```

### Key Facts for v1.3 Fixes

1. **`broadcastActivityUpdate(sessionId)`** sends `{ topic: 'activities:{sessionId}', event: 'activity_update', payload: {} }`. The `useRealtimeActivities` hook listens for this and **refetches from `/api/sessions/{sessionId}/activities`**. The hook does NOT listen for a `participant_removed` event -- it only responds to `activity_update`.

2. **`broadcastBracketUpdate(bracketId, type, payload)`** sends to `bracket:{bracketId}`. The `useRealtimeBracket` hook triggers `fetchBracketState()` on these types: `winner_selected`, `round_advanced`, `voting_opened`, `bracket_completed`, `prediction_status_changed`, `reveal_round`, `reveal_complete`. The final round of SE uses this exact path -- `advanceMatchup` broadcasts `winner_selected` then checks `isBracketComplete` and conditionally broadcasts `bracket_completed`.

3. **`rrAllDecided` in `LiveDashboard`** (line 856-858) checks `currentMatchups.every((m) => m.status === 'decided')`. For an RR bracket with `pacing: 'all_at_once'`, all matchups start as `pending` (not `voting`), so `rrAllDecided` is `false` until every single matchup transitions to `decided`. The bug is in `isRoundRobinComplete()` in the DAL -- it only fires the `bracket_completed` broadcast when the function is called, which only happens inside `recordResult()` in `round-robin.ts`. When all matchups are decided individually, this works, but `rrAllDecided` in `LiveDashboard` relies on `currentMatchups` from real-time data, which requires a preceding `winner_selected` broadcast to trigger `fetchBracketState()`.

4. **`removeStudent` / `banStudent` in `class-session.ts`** calls the DAL but does NOT broadcast anything. The student dashboard's `useRealtimeActivities` never receives a signal that the participant list changed.

5. **`SignOutButton` in `signout-button.tsx`** uses `<form action={signOut}>` -- a form submission. It provides no pending state feedback to the user during the server-side sign-out redirect.

6. **Poll context menu**: `src/app/(dashboard)/polls/page.tsx` renders poll cards as `<Link>` wrapping a `<Card>`. No `SessionCardMenu`-pattern component exists for polls. `SessionCardMenu` lives in `src/components/teacher/session-card-menu.tsx` and is the reference pattern for a three-dot dropdown overlaid on a card.

---

## Fix 1: Poll Context Menu

### Current State

`src/app/(dashboard)/polls/page.tsx` renders each poll card as a plain `<Link>` wrapping a `<Card>`. There is no three-dot context menu. The existing poll actions (delete, duplicate, assign to session) exist only in `PollDetailView` (`src/components/poll/poll-detail-view.tsx`) -- the full detail page.

The reference pattern is `SessionCardMenu` at `src/components/teacher/session-card-menu.tsx`:

```
sessions/page.tsx
  <div className="relative">               <- position anchor
    <Link href={...}>
      <Card>...</Card>
    </Link>
    <div className="absolute right-3 top-3 z-10">
      <SessionCardMenu sessionId=... />    <- overlaid menu
    </div>
  </div>
```

`SessionCardMenu` uses Radix `DropdownMenu` with `e.stopPropagation()` on trigger click to prevent the Link navigation from firing when the menu opens.

### What to Build

**NEW component:** `src/components/poll/poll-card-menu.tsx`

Mirror the `SessionCardMenu` pattern exactly:

```typescript
// Component structure
'use client'
export function PollCardMenu({ pollId, pollQuestion, onAction }: {
  pollId: string
  pollQuestion: string
  onAction?: () => void
}) {
  // DropdownMenu with items:
  //   - Duplicate (calls duplicatePoll server action)
  //   - Delete (opens ConfirmDialog, calls deletePoll server action)
  // On success: router.refresh() or onAction() for live list update
}
```

**MODIFY:** `src/app/(dashboard)/polls/page.tsx`

Wrap each poll card in a relative container, add `PollCardMenu` as absolute overlay (identical structure to sessions/page.tsx).

### Integration Points

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/components/poll/poll-card-menu.tsx` | **NEW** | Radix DropdownMenu with duplicate + delete |
| `src/app/(dashboard)/polls/page.tsx` | **MODIFY** | Add relative wrapper + PollCardMenu overlay per card |
| `src/actions/poll.ts` | **No change** | `deletePoll` and `duplicatePoll` already exist |

**No broadcast changes needed.** Deleting or duplicating a poll does not emit a realtime event (only the teacher's page needs to update, and `router.refresh()` handles that).

### Build Notes

- The `e.stopPropagation()` + `e.preventDefault()` on the DropdownMenuTrigger's `onClick` is critical -- without it, clicking the menu trigger navigates to `/polls/{id}`.
- `duplicatePoll` returns `{ poll: { id, question } }` -- no session assignment, so no broadcast needed.
- `deletePoll` calls `revalidatePath('/activities')` internally -- `router.refresh()` after calling it updates the page.

---

## Fix 2: RR All-at-Once Completion

### Current Bug

For round-robin brackets with `roundRobinPacing: 'all_at_once'`, the teacher opens all matchups for voting at once. Results are recorded via `recordResult()` in `src/actions/round-robin.ts`.

After each `recordResult` call, `isRoundRobinComplete()` is called to check if all matchups are decided. When the final matchup is decided, `isRoundRobinComplete()` returns a winnerId and the action:

1. Updates `bracket.status = 'completed'` in Prisma
2. Calls `broadcastBracketUpdate(bracketId, 'bracket_completed', { winnerId })`

The `useRealtimeBracket` hook receives `bracket_completed`, calls `fetchBracketState()`, and sets `setBracketCompleted(true)`.

**The bug is in `LiveDashboard.tsx` `bracketDone` computation** (lines 856-863):

```typescript
const rrAllDecided = isRoundRobin
  ? currentMatchups.length > 0 && currentMatchups.every((m) => m.status === 'decided')
  : false
const bracketDone = isDoubleElim
  ? deBracketDone
  : isRoundRobin
    ? rrAllDecided           // <-- relies on currentMatchups from real-time
    : (currentRound === totalRounds && allRoundDecided)
```

`currentMatchups` is populated from `realtimeMatchups` (from `useRealtimeBracket`). The hook only fetches when a `bracket_update` broadcast arrives. When all matchups ARE decided and `bracket_completed` fires, `fetchBracketState()` runs and `realtimeMatchups` is updated. However, `rrAllDecided` is computed from `currentMatchups` BEFORE `fetchBracketState` completes because it runs asynchronously inside the hook.

The additional bug is in `LiveDashboard`'s celebration fallback logic (lines 368-411): for RR brackets, the fallback only fires when `bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim`. `bracketCompleted` comes from `useRealtimeBracket`'s `bracketCompleted` state (set to `true` on `bracket_completed` event). The `rrAllDecided`-based `bracketDone` and the `bracketCompleted` signal are separate -- `bracketCompleted` is the reliable one.

### What the Fix Actually Is

The teacher-side `LiveDashboard` needs to trigger celebration when `bracketCompleted === true`, regardless of whether `rrAllDecided` has resolved. The `bracketCompleted` flag from `useRealtimeBracket` is already correctly set when `bracket_completed` is received.

The `CelebrationScreen` rendering in `LiveDashboard` is gated on `showCelebration` state, which is set by the fallback `useEffect` at lines 368-411. That effect fires when `bracketCompleted` is true -- this is the correct path for RR.

The real issue: `isRoundRobinComplete()` in the DAL (line 249-266 of `src/lib/dal/round-robin.ts`) checks `allDecided` across all matchups. However, for RR `all_at_once`, because all matchups start as `pending` (not `voting`), the `recordResult()` action's `isRoundRobinComplete` query sees `pending` status matchups and returns null -- `pending !== decided`.

**Root cause:** `recordResult` in the round-robin DAL (`src/lib/dal/round-robin.ts` line 137) sets `status: 'decided'` when recording a result regardless of whether the matchup was `pending` or `voting`. So `isRoundRobinComplete` checks all matchups for `status === 'decided'` -- this is correct and should work.

Verify with logs: the `isRoundRobinComplete` query at line 250 fetches `status` and `winnerId`. If all matchups have `status: 'decided'`, it proceeds to `getRoundRobinStandings`. The `getRoundRobinStandings` function only queries `status: 'decided'` matchups -- so if some have `status: 'pending'` (not yet decided), `isRoundRobinComplete` returns null correctly.

**The actual multi-round RR bug:** For `all_at_once` pacing with multiple rounds, the `advanceRoundRobinRound` DAL function opens matchups round-by-round (it sets `roundRobinRound === roundNumber` matchups from `pending` to `voting`). But `all_at_once` never calls `advanceRoundRobinRound` -- it opens all matchups globally. After investigation: the `LiveDashboard` RR controls show a "Next Round" button that calls `advanceRound`. For `all_at_once`, all rounds' matchups need to be opened simultaneously. The bug is that `bracketDone` uses `rrAllDecided` which requires a `fetchBracketState()` call to update `currentMatchups`, but the `winner_selected` broadcast triggers that fetch. The timing issue is that after the final `recordResult`, the `bracket_completed` event fires, the hook fetches state, sets `bracketCompleted = true`, and the `useEffect` fallback fires with a 2-second timeout -- this DOES eventually show the celebration, but there may be a race.

### What to Build

**MODIFY:** `src/actions/round-robin.ts` -- `recordResult` action

Add a `broadcastActivityUpdate` to the session channel when the bracket completes, matching the pattern in `bracket-advance.ts`:

```typescript
if (rrWinnerId) {
  await prisma.bracket.update({ ... })
  broadcastBracketUpdate(bracketId, 'bracket_completed', { winnerId: rrWinnerId }).catch(console.error)

  // Also notify session activity channel (mirrors bracket-advance.ts pattern)
  const bracket = await prisma.bracket.findUnique({
    where: { id: parsed.data.bracketId },
    select: { sessionId: true },
  })
  if (bracket?.sessionId) {
    broadcastActivityUpdate(bracket.sessionId).catch(console.error)
  }
}
```

**VERIFY:** That `isRoundRobinComplete` correctly detects all-at-once completion. Add a debug log path in Phase to confirm the final `recordResult` actually reaches `if (rrWinnerId)`.

### Integration Points

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/actions/round-robin.ts` | **MODIFY** | Add `broadcastActivityUpdate` after `bracket_completed` on RR complete |
| `src/lib/dal/round-robin.ts` | **VERIFY** | Confirm `isRoundRobinComplete` fires for all-at-once RR |
| `src/lib/realtime/broadcast.ts` | **No change** | Existing functions are sufficient |

**No new broadcast events.** The existing `bracket_completed` event is correct. The student side already handles it via `useRealtimeBracket` → `bracketCompleted` → `CelebrationScreen`.

---

## Fix 3: SE Final Round Realtime

### Current State

The `useRealtimeBracket` hook subscribes to `bracket:{bracketId}` and on `bracket_update` events with type `winner_selected`, calls `fetchBracketState()`. The `fetchBracketState` function hits `/api/brackets/{bracketId}/state` and updates `matchups` state.

When a teacher advances the final round matchup:
1. `advanceMatchup()` in `bracket-advance.ts` calls `advanceMatchupWinner()`
2. Broadcasts `winner_selected` event to `bracket:{bracketId}`
3. Checks `isBracketComplete()` -- if true, broadcasts `bracket_completed`
4. Both broadcasts go to the same channel

The student's `useRealtimeBracket` receives `winner_selected` → `fetchBracketState()` → updates `matchups`. It also receives `bracket_completed` → `setBracketCompleted(true)`.

**The reported bug** is that the final round does not update in real-time for students on SE brackets. This is counterintuitive because the broadcast path is identical for all rounds.

### Likely Root Cause

The `/api/brackets/{bracketId}/state` endpoint is the source of truth for `fetchBracketState`. If that endpoint has a caching issue or returns stale data after the final winner is set, the student view does not update.

Check `src/app/api/brackets/[bracketId]/state/route.ts` for:
1. Whether Next.js route caching is applied (missing `{ cache: 'no-store' }` in the Prisma query or response)
2. Whether the matchup status fields are correctly included in the response shape

### What to Build

**INVESTIGATE FIRST:** Read `src/app/api/brackets/[bracketId]/state/route.ts`. Look for:
- `revalidatePath` or `next: { revalidate }` settings that could be returning cached data
- Whether `status: 'decided'` and `winnerId` are included in the matchup select

If the route is missing `cache: 'no-store'`, add it:

```typescript
// In the route handler fetch or Prisma query:
export async function GET(request: NextRequest, { params }) {
  // Add this header to prevent Next.js route caching:
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
```

**ALTERNATIVELY:** The bug may be that `fetchBracketState` is called from the hook but the fetch inside is not awaited/race-conditioned. The hook's callback is memoized with `useCallback([bracketId])` -- this is stable.

**FALLBACK investigation path:** Check if the student is hitting the transport fallback (HTTP polling). The `useRealtimeBracket` hook switches to polling every 3 seconds if WebSocket doesn't connect within 5 seconds. If polling is active, the final round WILL update but with up to 3-second delay. Check `transport` state returned by the hook.

### Integration Points

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/app/api/brackets/[bracketId]/state/route.ts` | **INVESTIGATE/MODIFY** | Add `cache: 'no-store'` if Next.js caching is the culprit |
| `src/hooks/use-realtime-bracket.ts` | **No change likely** | Hook logic is correct; issue is upstream |
| `src/actions/bracket-advance.ts` | **No change** | Already broadcasts `winner_selected` + `bracket_completed` |

**No new broadcast events needed.** The existing `winner_selected` broadcast on `advanceMatchup` is the correct trigger.

---

## Fix 4: Student Dynamic Removal

### Current Bug

When a teacher removes a student via `removeStudent(participantId)` in `src/actions/class-session.ts`:

1. `removeParticipantDAL(participantId)` is called (deletes or marks the record)
2. `return { success: true }` -- no broadcast

The student's browser remains at their current page. The `useRealtimeActivities` hook never gets a signal. The student's activity view continues working. Only when they try to vote again does the server return an error (participant not found / banned).

**The UX gap:** Students who are removed should see a message ("You've been removed from this session") rather than getting cryptic errors on vote submission. The teacher's roster needs to refresh automatically too (currently uses `onRefresh` callback which calls `router.refresh()` -- this updates the server component, which is correct for the teacher side).

### What to Build

**New broadcast event:** `participant_removed` on the `activities:{sessionId}` channel.

This channel is already subscribed to by `useRealtimeActivities` in the student browser. Adding a new event type to listen for there is the minimal-impact approach.

**MODIFY:** `src/actions/class-session.ts` -- `removeStudent` and `banStudent`

```typescript
export async function removeStudent(participantId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  try {
    // Look up sessionId before deletion (DAL currently deletes without returning sessionId)
    const participant = await prisma.studentParticipant.findUnique({
      where: { id: participantId },
      select: { sessionId: true },
    })

    await removeParticipantDAL(participantId)

    // NEW: broadcast removal event to session channel
    if (participant?.sessionId) {
      broadcastMessage({
        topic: `activities:${participant.sessionId}`,
        event: 'participant_removed',
        payload: { participantId },
      }).catch(console.error)
    }

    return { success: true }
  } catch {
    return { error: 'Failed to remove student' }
  }
}
```

Apply the same pattern to `banStudent`.

**MODIFY:** `src/hooks/use-realtime-activities.ts`

Add a listener for the `participant_removed` event. When received and `participantId` matches the current student, show a "removed" state rather than refetching:

```typescript
// In useRealtimeActivities, add second event listener:
.on('broadcast', { event: 'participant_removed' }, (message) => {
  const { participantId: removedId } = message.payload as { participantId: string }
  if (removedId === participantId) {
    // Signal to consumer that this student has been removed
    setRemoved(true)
  } else {
    // Another student was removed -- refetch to update participant counts
    fetchActivities()
  }
})
```

This requires `useRealtimeActivities` to accept the student's `participantId` (already passed in: `useRealtimeActivities(sessionId, participantId)`) and return a `removed` boolean.

**MODIFY:** `src/components/student/activity-grid.tsx`

```typescript
const { activities, loading, removed } = useRealtimeActivities(sessionId, participantId)

if (removed) {
  return <RemovedState />  // "You've been removed from this session"
}
```

### Integration Points

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/actions/class-session.ts` | **MODIFY** | `removeStudent` + `banStudent`: look up `sessionId`, broadcast `participant_removed` |
| `src/lib/realtime/broadcast.ts` | **MODIFY** | Add `broadcastParticipantRemoved(sessionId, participantId)` helper OR use `broadcastMessage` directly |
| `src/hooks/use-realtime-activities.ts` | **MODIFY** | Listen for `participant_removed`, return `removed` boolean |
| `src/components/student/activity-grid.tsx` | **MODIFY** | Consume `removed` flag, render `RemovedState` |

**New broadcast event:** `participant_removed` on `activities:{sessionId}` channel with payload `{ participantId }`.

**Channel choice rationale:** Using `activities:{sessionId}` (the session-wide channel) rather than a new channel avoids WebSocket connection overhead. The student is already subscribed to this channel. The teacher's session page does not subscribe to this channel (it uses `useSessionPresence` for the roster), so the teacher side is not affected.

---

## Fix 5: Sign-Out Button Feedback

### Current State

`src/components/auth/signout-button.tsx`:

```typescript
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

The `signOut` server action calls `supabase.auth.signOut()` then `redirect('/login')`. The redirect involves a full page navigation. During the ~500ms between form submission and the redirect completing, the button gives no visual feedback -- it could appear frozen.

The `form action={signOut}` pattern uses Next.js progressive enhancement (form submission, no JavaScript needed). To add pending state, the component must opt into client-side rendering via `useFormStatus` or `useTransition`.

### What to Build

**Option A (recommended): `useFormStatus`**

```typescript
'use client'
import { useFormStatus } from 'react-dom'

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

`useFormStatus` must be called in a component that is a child of the `<form>`. The outer `SignOutButton` remains a server-compatible shell; only the inner button component is a client component.

**Option B: `useTransition`**

Convert the form to a button with `startTransition(() => signOut())`. This loses the progressive enhancement but gives `isPending` state.

Option A is better because it preserves the `<form action>` pattern and the separation of concerns.

### Integration Points

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/components/auth/signout-button.tsx` | **MODIFY** | Add `useFormStatus` inner component for pending state |

**No broadcast changes. No server action changes.** The `signOut` action is unchanged.

---

## System Overview: How the 5 Fixes Integrate

```
TEACHER BROWSER                                STUDENT BROWSER
  /polls page                                    /session/{id} page
  PollCardMenu (NEW)                             ActivityGrid
      |                                               |
  duplicatePoll()                            useRealtimeActivities()
  deletePoll()                                        |
  router.refresh()                           activities:{sessionId}
  (no broadcast)                             event: activity_update    (existing)
                                             event: participant_removed (NEW Fix 4)
                                                       |
  /brackets/{id}/live                          /session/{id}/bracket/{id}
  LiveDashboard                                StudentBracketPage
      |                                               |
  useRealtimeBracket()                       useRealtimeBracket()
      |                                               |
  bracket:{id}                               bracket:{id}
  event: bracket_completed (Fix 2, Fix 3)    event: bracket_completed
                                             event: winner_selected (Fix 3 verify)

  /sessions/{id}                            Sign-out button (Fix 5)
  StudentRoster                             useFormStatus() pending state
  removeStudent() -> broadcasts (Fix 4)
  banStudent() -> broadcasts (Fix 4)
```

---

## Data Flows

### Fix 1: Poll Context Menu (No Real-Time)

```
Teacher clicks "..." on poll card
  -> DropdownMenu opens (stopPropagation prevents Link nav)
  -> "Duplicate" item clicked
      -> duplicatePoll({ pollId }) server action
      -> Creates new poll in Prisma
      -> revalidatePath('/activities')
      -> router.refresh() from PollCardMenu
      -> Page re-renders with new poll in list
```

### Fix 2: RR All-at-Once Completion

```
Teacher clicks a matchup result (win/tie/loss) -- FINAL matchup
  -> recordResult({ matchupId, bracketId, winnerId }) server action
  -> recordRoundRobinResult(matchupId, winnerId, teacherId) DAL
      -> UPDATE matchup SET status='decided', winnerId=...
      -> broadcastBracketUpdate(bracketId, 'winner_selected', ...) [existing]
  -> isRoundRobinComplete(bracketId) DAL
      -> SELECT all matchups -- all now 'decided'
      -> Returns top-ranked entrantId
  -> UPDATE bracket SET status='completed'
  -> broadcastBracketUpdate(bracketId, 'bracket_completed', ...) [existing]
  -> broadcastActivityUpdate(sessionId) [NEW: add this]

Student browser receives 'bracket_completed' on bracket:{id}:
  -> useRealtimeBracket: setBracketCompleted(true)
  -> fetchBracketState() -> updates currentMatchups
  -> LiveDashboard useEffect fires (bracketCompleted && isRoundRobin)
  -> setTimeout 2000ms -> setRevealState -> WinnerReveal -> CelebrationScreen
```

### Fix 3: SE Final Round Real-Time (Verify Path)

```
Teacher advances final matchup winner
  -> advanceMatchup({ bracketId, matchupId, winnerId }) server action
  -> advanceMatchupWinner() DAL
  -> broadcastBracketUpdate(bracketId, 'winner_selected', ...) [existing]
  -> isBracketComplete(bracketId) -> true (final round)
  -> broadcastBracketUpdate(bracketId, 'bracket_completed', ...) [existing]

Student browser receives 'winner_selected':
  -> useRealtimeBracket: fetchBracketState()
  -> GET /api/brackets/{id}/state
      [VERIFY: no Next.js caching on this route]
  -> setMatchups(data.matchups) -- final matchup now 'decided'
  -> currentMatchups updated -> UI re-renders
```

### Fix 4: Student Dynamic Removal

```
Teacher clicks "Remove" on student row
  -> StudentManagement component -> removeStudent(participantId)
  -> class-session.ts: removeStudent server action
      -> Prisma: find participant -> get sessionId [NEW lookup]
      -> removeParticipantDAL(participantId)
      -> broadcastMessage({
           topic: 'activities:{sessionId}',
           event: 'participant_removed',
           payload: { participantId }
         }) [NEW]
  -> onAction() callback -> router.refresh() [existing -- updates teacher roster]

Student browser receives 'participant_removed':
  -> useRealtimeActivities: payload.participantId === myParticipantId
  -> setRemoved(true)
  -> ActivityGrid renders <RemovedState /> [NEW component/branch]
  -> Student sees: "You've been removed from this session"
```

### Fix 5: Sign-Out Button Feedback

```
Teacher clicks "Sign Out"
  -> <form action={signOut}> submits
  -> useFormStatus() in inner component: pending = true
  -> Button renders "Signing out..." + disabled
  -> signOut() server action: supabase.auth.signOut()
  -> redirect('/login') -- page navigation clears pending state
```

---

## Component Map: Modified vs New

| Component | Status | Fix | Change Summary |
|-----------|--------|-----|----------------|
| `src/components/poll/poll-card-menu.tsx` | **NEW** | Fix 1 | Three-dot dropdown with duplicate + delete |
| `src/app/(dashboard)/polls/page.tsx` | **MODIFY** | Fix 1 | Add relative wrapper + PollCardMenu overlay |
| `src/actions/round-robin.ts` | **MODIFY** | Fix 2 | Add `broadcastActivityUpdate` after RR completion |
| `src/app/api/brackets/[bracketId]/state/route.ts` | **INVESTIGATE** | Fix 3 | Add `cache: 'no-store'` if needed |
| `src/actions/class-session.ts` | **MODIFY** | Fix 4 | `removeStudent` + `banStudent` broadcast `participant_removed` |
| `src/lib/realtime/broadcast.ts` | **MODIFY** | Fix 4 | Add `broadcastParticipantRemoved()` helper |
| `src/hooks/use-realtime-activities.ts` | **MODIFY** | Fix 4 | Listen for `participant_removed`, return `removed` state |
| `src/components/student/activity-grid.tsx` | **MODIFY** | Fix 4 | Render removed state when `removed === true` |
| `src/components/auth/signout-button.tsx` | **MODIFY** | Fix 5 | Add `useFormStatus` inner component for pending state |

**Total new files:** 1 (`poll-card-menu.tsx`)
**Total modified files:** 7-8 depending on Fix 3 investigation

---

## New Broadcast Events

| Event Name | Channel | Direction | Payload | When Sent |
|------------|---------|-----------|---------|-----------|
| `participant_removed` | `activities:{sessionId}` | Server -> Client | `{ participantId: string }` | Teacher removes or bans a student |

All other existing events (`bracket_completed`, `winner_selected`, `activity_update`) are reused without change.

---

## Architectural Patterns to Follow

### Pattern 1: Context Menu Overlay on Card

**What:** Absolute-positioned three-dot button overlaid on a linked card. `e.stopPropagation()` on trigger click prevents card navigation.

**When:** Any list page where cards navigate on click but also need secondary actions.

**Example:**
```tsx
<div className="relative">
  <Link href={href}>
    <Card>...</Card>
  </Link>
  <div className="absolute right-3 top-3 z-10">
    <PollCardMenu pollId={...} />
  </div>
</div>
```

### Pattern 2: Session-Wide Channel for Non-Activity Events

**What:** Use `activities:{sessionId}` for student-affecting events beyond activity list changes. The student is already subscribed; no new connection needed.

**When:** An action by the teacher should immediately change the student's view (removal, session end, etc.).

**Example:**
```typescript
// Server action:
broadcastMessage({
  topic: `activities:${sessionId}`,
  event: 'participant_removed',
  payload: { participantId },
})

// Client hook (use-realtime-activities.ts):
.on('broadcast', { event: 'participant_removed' }, (msg) => {
  if (msg.payload.participantId === myParticipantId) setRemoved(true)
})
```

### Pattern 3: useFormStatus for Server Action Pending State

**What:** Use `useFormStatus` from `react-dom` in a child component of `<form action={serverAction}>` to get the `pending` boolean without converting to client-only imperative code.

**When:** Any form that uses `<form action={serverAction}>` but needs loading/disabled state.

**Example:**
```tsx
function InnerButton() {
  const { pending } = useFormStatus()
  return <Button disabled={pending}>{pending ? 'Loading...' : 'Submit'}</Button>
}
export function MyForm() {
  return <form action={myAction}><InnerButton /></form>
}
```

---

## Build Order

Dependencies between fixes are minimal. The recommended order:

```
Step 1: Fix 5 (Sign-out feedback) -- 15 min, zero risk, no dependencies
  Files: signout-button.tsx only

Step 2: Fix 1 (Poll context menu) -- 45 min, zero realtime impact
  Files: poll-card-menu.tsx (new), polls/page.tsx

Step 3: Fix 4 (Student dynamic removal) -- 60 min, new broadcast event
  Files: class-session.ts, broadcast.ts, use-realtime-activities.ts, activity-grid.tsx
  Note: Do Fix 4 before Fix 2/3 so the broadcast infrastructure is well-exercised

Step 4: Fix 3 (SE final round realtime) -- 30 min investigation + fix
  Files: api/brackets/[bracketId]/state/route.ts (if needed)
  Note: Read the route file first; fix may be trivially adding cache: 'no-store'

Step 5: Fix 2 (RR all-at-once completion) -- 30 min
  Files: actions/round-robin.ts
  Note: Add broadcastActivityUpdate after bracket_completed; then manually test
        with an RR bracket in all_at_once mode to confirm celebration fires
```

**Rationale:**
- Fix 5 is lowest risk, builds confidence.
- Fix 1 has no realtime surface area.
- Fix 4 introduces the only new broadcast event -- do it in isolation so any issues are attributable to it alone.
- Fix 3 requires investigation before code change -- read the route first.
- Fix 2 adds a one-liner to an existing broadcast pattern -- lowest risk final step.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: New Channel for Student Removal

**What:** Creating a new `session:{sessionId}` or `participant:{participantId}` channel for removal events.

**Why bad:** Requires students to subscribe to an additional channel (more WebSocket overhead). The `activities:{sessionId}` channel is already open; adding an event type is O(0) overhead.

### Anti-Pattern 2: Polling for Removal Detection

**What:** Student page polls `/api/participant/status` every few seconds to check if still active.

**Why bad:** O(n*t) server load (n students, t poll frequency). The broadcast pattern is O(1) regardless of class size.

### Anti-Pattern 3: `router.refresh()` Instead of Broadcast for Student Removal

**What:** After `removeStudent`, calling `broadcastActivityUpdate` with the existing `activity_update` event.

**Why bad:** `activity_update` triggers `fetchActivities()` which re-fetches the activity list. It does NOT tell the student they were removed -- they just see the same activity list (the removed participant is no longer tracked server-side, but the UI doesn't know it's the current student). The targeted `participant_removed` event with `participantId` in the payload is necessary for the student-self-detection logic.

### Anti-Pattern 4: Modifying `useRealtimeBracket` for SE Final Round Fix

**What:** Adding special-case logic to the hook for the final round of SE brackets.

**Why bad:** The broadcast path is already correct for all rounds. The bug is likely in the API route (caching) or in the student bracket page's initial fetch (stale data on navigation). The hook should not need modification.

---

## Verification Checklist

For each fix, what to verify manually:

| Fix | Verification |
|-----|-------------|
| Fix 1 (Poll menu) | Click "..." on a poll card -- menu opens without navigating. Duplicate creates a copy. Delete with confirm removes the poll. Card click still navigates to poll detail. |
| Fix 2 (RR all-at-once) | Create an RR bracket with `all_at_once` pacing. Start it. Record all results. Verify `CelebrationScreen` appears on teacher view. Verify student view also shows celebration. |
| Fix 3 (SE final round) | Create SE bracket. Open student view in a second browser. Teacher advances all rounds. Verify final matchup status update appears in student view without manual refresh. |
| Fix 4 (Student removal) | Open student session in one browser. Teacher removes student from roster. Verify student browser shows removal message without manual refresh. Verify other students are unaffected. |
| Fix 5 (Sign-out) | Click sign out. Verify button shows "Signing out..." and is disabled during server action. Verify redirect to /login completes normally. |

---

## Sources

- **Codebase analysis:** Direct examination of all referenced source files -- HIGH confidence
  - `src/actions/class-session.ts`, `src/actions/round-robin.ts`, `src/actions/bracket-advance.ts`
  - `src/lib/realtime/broadcast.ts`
  - `src/hooks/use-realtime-activities.ts`, `src/hooks/use-realtime-bracket.ts`, `src/hooks/use-realtime-poll.ts`
  - `src/components/teacher/live-dashboard.tsx` (lines 97-870)
  - `src/components/teacher/session-card-menu.tsx`
  - `src/components/teacher/student-management.tsx`
  - `src/components/auth/signout-button.tsx`
  - `src/app/(dashboard)/polls/page.tsx`
  - `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx`
  - `src/lib/dal/round-robin.ts`
- **React docs:** `useFormStatus` for form pending state -- HIGH confidence
- **Pattern reference:** `SessionCardMenu` component -- HIGH confidence (direct codebase)

---
*Architecture research for: SparkVotEDU v1.3 Bug Fixes & UX Parity*
*Researched: 2026-02-24*
