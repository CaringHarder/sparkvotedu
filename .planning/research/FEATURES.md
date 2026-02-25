# Feature Research

**Domain:** Classroom voting platform — bug fixes and UX parity (v1.3)
**Researched:** 2026-02-24
**Confidence:** HIGH (based on direct codebase reading, existing debug diagnoses, and UAT records)

---

## Feature Landscape

This research covers the five scoped features for v1.3. Each maps to a pending todo in STATE.md.
The existing codebase is the authoritative source; all findings are from direct code reading,
verified debug files, and UAT results from Phase 24.

---

### Feature 1: Poll Context Menu (Triple-Dot) — UX Parity with Bracket Cards

**What users expect:** Any card-based management UI with per-item actions uses a single overflow
menu button (triple-dot / MoreVertical). Teachers use bracket cards daily with context menus;
poll cards currently expose actions as visible icon-buttons (Edit, Duplicate, Delete), which
diverges from the established bracket-card pattern.

**Existing pattern in codebase:**

Bracket card (`src/components/bracket/bracket-card.tsx`) implements its own custom context menu:
- `MoreVertical` icon from lucide-react triggers a positioned `<div>` dropdown
- Click-outside detection via `useRef` + `mousedown` listener
- Menu closes on action and contains: Complete Bracket, Copy Join Code, Delete Bracket
- Delete uses a full-screen confirmation modal (`fixed inset-0 z-50`)

Session card (`src/components/teacher/session-card-menu.tsx`) uses Radix-based `DropdownMenu`
from the shadcn/ui component library already in the project.

Poll card (`src/components/poll/poll-card.tsx`) currently shows three separate icon-button ghosts
in a flex row: `Pencil` (Edit), `Copy` (Duplicate), `Trash2` (Delete). No overflow menu. The
Delete action already has a confirmation modal.

**Expected user behaviors:**
1. Teacher scans poll list — only the poll name and status badges are prominent, no action clutter
2. Teacher hovers or taps the triple-dot button — a positioned dropdown appears anchored to the button
3. Menu contains: Edit, Duplicate, Delete (matching existing icon-button actions)
4. Clicking Delete opens the existing confirmation modal (pattern already implemented)
5. Clicking anywhere outside the menu closes it
6. Menu does not overlap adjacent cards awkwardly

**Edge cases:**
- Menu trigger and the card itself may both be clickable — `e.stopPropagation()` required on trigger
- The card body is not a link (unlike bracket cards), so propagation is less critical but should be handled
- Scroll containers can clip absolutely-positioned dropdowns — use `z-40` or higher with `overflow: visible` on parent
- Polls page renders a list of cards; `position: relative` on the card wrapper is needed for dropdown anchoring
- Keyboard accessibility: menu should be dismissible via Escape key (Radix DropdownMenu handles this automatically)

**Two valid implementation paths:**

Path A — Use existing Radix `DropdownMenu` (same as `session-card-menu.tsx`):
- Pros: Keyboard navigation, focus management, Escape-to-close handled by Radix
- Pros: Already in project as shadcn/ui component
- Cons: Slightly heavier abstraction than the raw bracket-card approach

Path B — Use raw positioning approach (same as `bracket-card.tsx`):
- Pros: Exact visual parity with bracket-card implementation
- Cons: Manual click-outside handling, no built-in keyboard management

Recommendation: Path A (Radix DropdownMenu) because it is already used by `session-card-menu.tsx`,
provides accessibility defaults, and the shadcn/ui component is already in the project. The visual
output is identical to Path B.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Poll card triple-dot menu | Brackets have it; users expect consistency across card types | LOW | Radix DropdownMenu already in project; adapt session-card-menu.tsx pattern |
| Keyboard-accessible menu | Standard for dropdown menus; Radix provides this automatically | LOW | No extra work if using DropdownMenu |
| Click-outside dismissal | Universal pattern for overlay menus | LOW | Radix handles; or replicate bracket-card mousedown listener |
| Confirmation dialog before delete | Destructive action safety; already implemented in poll-card.tsx | NONE | Reuse existing showDeleteConfirm modal pattern |
| Menu actions: Edit, Duplicate, Delete | Match existing icon-button actions exactly | LOW | Actions already in handleEdit, handleDuplicate, handleDelete |

**Dependencies on existing architecture:**
- `src/components/poll/poll-card.tsx` — direct modification target
- `src/components/ui/dropdown-menu.tsx` — Radix DropdownMenu already present
- `@/actions/poll` — `deletePoll`, `duplicatePoll` already imported in poll-card
- Poll list page (`src/app/(dashboard)/polls/page.tsx`) — verify card wrapper has `position: relative`

---

### Feature 2: RR All-At-Once Bracket — Fix Premature Completion After First Round

**What users expect:** In "all-at-once" RR pacing, all rounds are visible and open simultaneously.
Teachers record results round by round at their own pace. The bracket should only complete after
the last matchup across ALL rounds is decided — not after the first round ends.

**Existing pacing context:**

The RR bracket has two pacing modes stored in `bracket.roundRobinPacing`:
- `round_by_round`: Teacher explicitly opens one round at a time via "Open Round N" button
- `all_at_once`: All rounds opened immediately when bracket is activated; teacher records results freely

The completion signal is emitted by `recordResult` in `src/actions/round-robin.ts` (lines 50-63):
```
const rrWinnerId = await isRoundRobinComplete(parsed.data.bracketId)
if (rrWinnerId) {
  await prisma.bracket.update({ data: { status: 'completed' } })
  broadcastBracketUpdate(bracketId, 'bracket_completed', { winnerId })
}
```

`isRoundRobinComplete` in `src/lib/dal/round-robin.ts` (lines 249-266) checks ALL matchups:
```
const allDecided = matchups.every((m) => m.status === 'decided')
if (!allDecided) return null
return standings[0].entrantId
```

This function is correct. The bug is in how rounds are opened at activation time.

**Identified bug path:** When a bracket activates, `updateBracketStatus` in `bracket.ts` changes
`draft -> active`. For round-robin all-at-once mode, all matchup rounds need to be opened
(status changed from `pending` to `voting`) at activation time. If the activation code only
opens Round 1 or opens no rounds, the teacher records Round 1 results but cannot proceed.
After Round 1 decisions are recorded, `isRoundRobinComplete` finds Rounds 2+ as `pending`
(not `decided`) and correctly does NOT declare completion — yet STATE.md reports premature
completion. This suggests the bug is in the round-opening sequence: either Round 1 is the
only round being opened AND `isRoundRobinComplete` has a filtering issue, or matchups are
being opened/closed incorrectly. Investigation of the activation DAL path is required.

**Expected user behaviors:**
1. Teacher activates an all-at-once RR bracket — all matchup cards across all rounds become available
2. Teacher records results in any order across any round
3. After recording the final matchup in the final round, celebration triggers
4. Recording matchups in Round 1 should not trigger completion if Rounds 2+ remain undecided

**Edge cases:**
- Teacher records all Round 1 results before touching Round 2: should not complete
- Teacher records results in non-sequential order (Round 3 before Round 1): should work
- Tie detection must still work after this fix (Plan 06 calculateRoundRobinStandings logic must be preserved)
- The `canAdvanceRoundRobin` button remains hidden for all-at-once pacing (already correct in code)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All-at-once: no premature completion | Core correctness of the pacing mode | MEDIUM | Bug is in activation/opening sequence; isRoundRobinComplete itself is correct |
| All-at-once: all rounds visible from start | User expectation from "all at once" label | LOW | Opening all rounds at activation via advanceRoundRobinRound loop or bulk updateMany |
| Completion triggers only when last matchup decided | Same semantics as round-by-round | LOW | isRoundRobinComplete DAL logic is already correct |
| Celebration fires correctly after fix | Post-fix, the race-condition fix from Plan 05 must still hold | NONE | Already fixed in Phase 24; non-regression |

**Dependencies on existing architecture:**
- `src/actions/round-robin.ts` — `recordResult` calls `isRoundRobinComplete`
- `src/lib/dal/round-robin.ts` — `advanceRoundRobinRound`, `isRoundRobinComplete`
- `src/actions/bracket.ts` — `updateBracketStatus` activates the bracket (draft -> active)
- `src/lib/dal/bracket.ts` — `updateBracketStatusDAL`; look for round-opening code on activation for RR

---

### Feature 3: SE Bracket Final Round — Fix Realtime Updates Stopping

**What users expect:** The teacher live dashboard should show vote counts updating in real time
throughout all rounds, including the final round, without requiring a manual refresh.

**Known architecture:**

`useRealtimeBracket` in `src/hooks/use-realtime-bracket.ts` subscribes to `bracket:{bracketId}`
channel and listens for `vote_update` and `bracket_update` broadcasts. This subscription is set
up once on mount and persists via the `useEffect` return cleanup.

The `vote_update` handler accumulates vote counts in `pendingUpdates.current` and flushes every
`batchIntervalMs` (2 seconds). The `bracket_update` handler for `winner_selected` or
`round_advanced` triggers `fetchBracketState()`.

`fetchBracketState` in the hook (lines 94-99):
```
if (data.status === 'completed') {
  setBracketCompleted(true)
}
```

**Likely bug:** When the teacher advances to the final round, `fetchBracketState` is called. If the
API response for the bracket returns `status: 'completed'` prematurely (e.g., the advance action
marks the bracket complete before students have voted), then `bracketCompleted = true` is set, which
causes the `LiveDashboard` to render the celebration overlay and hide the vote-count view. The teacher
sees a static overlay instead of live vote counts.

Alternatively, the final round advance may emit a broadcast type that the hook interprets incorrectly,
or the `currentRound` computation in `LiveDashboard` (lines 420-428) returns `totalRounds` before all
votes are in, causing the dashboard to hide the voting UI in favor of completion state.

Root cause requires tracing: `advanceMatchup` server action -> what does it write to DB and broadcast ->
does API `/api/brackets/[bracketId]/state` return `completed` prematurely.

**Expected user behaviors:**
1. Teacher advances SE bracket to final round — vote dashboard updates to show final matchup
2. Students vote on final matchup — vote counts update in teacher view in real time (2-second batches)
3. Teacher clicks "Advance" or votes are decided — champion is declared, celebration fires
4. No manual refresh required at any point during final round

**Edge cases:**
- 4-team bracket has 2 rounds; final round is round 2 — the smallest and most exposed SE case
- 8-team bracket has 3 rounds; same issue should be observable but may require more steps
- Transport fallback (polling mode): if WebSocket fails and polling is active, does the 3-second
  poll interval continue fetching vote counts after round advancement?
- Race condition: `bracket_update(round_advanced)` + `bracket_update(winner_selected)` arriving
  in quick succession — could the second broadcast set bracketCompleted before votes are in?

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Vote counts update during final round | Live vote watching is the core teacher UX | MEDIUM | Root cause unknown until code traced; likely premature bracketCompleted or subscription gap |
| No manual refresh needed | Expected in any realtime dashboard | LOW | Fix is upstream in hook or advance action |
| Transport fallback continues in final round | School networks block WebSockets | LOW | Polling interval is independent of channel state |

**Dependencies on existing architecture:**
- `src/hooks/use-realtime-bracket.ts` — `fetchBracketState`, `setBracketCompleted`
- `src/app/api/brackets/[bracketId]/state/route.ts` — what status does the API return between rounds?
- `src/actions/bracket-advance.ts` — the `advanceMatchup` server action; what does it broadcast?
- `src/components/teacher/live-dashboard.tsx` — `bracketCompleted` gate on what gets rendered

---

### Feature 4: Student Dashboard — Dynamically Remove Deleted Activities

**What users expect:** When a teacher deletes a bracket or poll, students currently viewing the
session dashboard should see it disappear within the same window (2-3 seconds), matching how
activities appear when activated.

**Existing realtime architecture:**

`useRealtimeActivities` in `src/hooks/use-realtime-activities.ts` (lines 54-71):
```
const channel = supabase
  .channel(`activities:${sessionId}`)
  .on('broadcast', { event: 'activity_update' }, () => {
    fetchActivities()
  })
  .subscribe()
```

`fetchActivities` calls `/api/sessions/${sessionId}/activities` which returns only active
(non-deleted, non-completed) activities. If an activity is deleted and a broadcast fires,
the hook refetches and the deleted activity disappears.

The gap: `deleteBracket` in `src/actions/bracket.ts` (lines 269-296) does NOT call
`broadcastActivityUpdate`. It calls `deleteBracketDAL` and then `revalidatePath('/brackets')`.
No broadcast is sent to the `activities:{sessionId}` channel. Similarly for `deletePoll`.

The fix is straightforward: after deleting a bracket or poll that belongs to an active session,
call `broadcastActivityUpdate(sessionId)`. The existing hook already handles this — the refetch
will return the updated list without the deleted activity.

**Expected user behaviors:**
1. Teacher deletes a bracket from the /brackets page — students see the activity card vanish within ~2 seconds
2. Teacher deletes a poll — same behavior
3. If the student is currently viewing the deleted bracket or poll page (navigated into it), no crash;
   that page still renders since it loaded before deletion
4. Students on the session dashboard see the same live-list update they see for activations

**Edge cases:**
- Bracket with `sessionId: null` (not assigned to a session) — no broadcast needed; `deleteBracket`
  must look up the sessionId before deleting (record is gone after deletion)
- Poll similarly needs its `sessionId` looked up before the delete call
- Race: student is on the session dashboard when the last activity is deleted — `ActivityGrid`
  renders `<EmptyState />` ("Hang tight!") when `activities.length === 0`; this already works correctly
- Student auto-navigating to the only activity when it gets deleted — navigator pushes them to a route
  that returns 404 or notFound; acceptable edge case, not a crash

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Deleted activity vanishes from student dashboard | UX parity with activation broadcasts | LOW | Single broadcastActivityUpdate call added to deleteBracket and deletePoll |
| Bracket deletion broadcasts only when has sessionId | Avoid unnecessary broadcasts | LOW | Check bracket.sessionId before calling broadcast; same pattern as updateBracketStatus |
| Poll deletion broadcast similarly conditional | Same reasoning | LOW | Same pattern |
| Student on deleted item page gracefully handles | Student navigates to bracket/poll that no longer exists | LOW | Existing 404/notFound behavior is acceptable; no new code needed |
| EmptyState renders if all activities deleted | Correct empty list behavior | NONE | Already works; ActivityGrid renders EmptyState when activities.length === 0 |

**Dependencies on existing architecture:**
- `src/actions/bracket.ts` — `deleteBracket` needs to fetch `sessionId` then broadcast
- `src/actions/poll.ts` — `deletePoll` needs the same treatment
- `src/lib/realtime/broadcast.ts` — `broadcastActivityUpdate` already exists and works
- `src/hooks/use-realtime-activities.ts` — no changes needed; already handles `activity_update` events

---

### Feature 5: Sign-Out Button — Visual Click Feedback

**What users expect:** Any button that triggers a network or server action should provide
immediate visual feedback that the click registered. A sign-out action that takes 0.5-2
seconds with no feedback looks broken, leading to double-clicks or confusion.

**Existing implementation:**

`SignOutButton` in `src/components/auth/signout-button.tsx`:
```tsx
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

`signOut` in `src/actions/auth.ts` calls `supabase.auth.signOut()` then `redirect('/login')`.
During this time (typically 200-800ms, up to 2s on slow school networks), the button shows
no change. The `form action={signOut}` pattern uses Next.js Server Actions form binding.

**Standard pattern in this codebase:**

All other interactive buttons in the project use `useTransition` + `startTransition`:
- `session-detail.tsx`: `const [isPending, startTransition] = useTransition()` with disabled state
- `bracket-card.tsx`: Same pattern with `{isPending ? 'Deleting...' : 'Delete'}` label change
- `poll-card.tsx`: Same pattern

The established convention is: text label changes to present-participle form ("Deleting...",
"Ending...", "Signing out...") and the button becomes `disabled={isPending}`.

**Recommendation:** Replace the `<form>` element with a direct `onClick` handler using
`useTransition`. This matches every other action button in the codebase. The form element
is unnecessary since there are no other form fields.

```tsx
'use client'
import { useTransition } from 'react'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()
  function handleSignOut() {
    startTransition(() => { signOut() })
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isPending}>
      {isPending ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
```

**Expected user behaviors:**
1. Teacher clicks "Sign Out" — button immediately changes to "Signing out..." and becomes disabled
2. Server action completes (~200-800ms) — redirect to /login fires automatically
3. No double-submit possible while pending
4. Mobile nav sign-out entry receives the same treatment

**Edge cases:**
- Mobile nav (`src/components/dashboard/mobile-nav.tsx`) also contains a sign-out trigger — verify
  it also gets the pending state treatment for consistency
- The button exists in the teacher dashboard header (desktop) and mobile nav drawer (mobile)
- Teachers on slow school Wi-Fi may wait 1-2 seconds — "Signing out..." label is important feedback
- If supabase.auth.signOut() throws (rare), the redirect never fires; button stays disabled
  indefinitely unless error handling added; acceptable for MVP (sign-out failures are extremely rare)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sign-out button pending state | Universal UX for server actions taking >200ms | LOW | useTransition + isPending label/disabled toggle |
| Disabled during pending | Prevents double-submit | LOW | disabled={isPending} on Button |
| Label change to "Signing out..." | Communicates what is happening | LOW | Conditional text in Button children |
| Mobile nav sign-out also updated | Consistency between nav surfaces | LOW | Check mobile-nav.tsx for sign-out entry |

**Dependencies on existing architecture:**
- `src/components/auth/signout-button.tsx` — primary modification target
- `src/components/dashboard/mobile-nav.tsx` — may need same treatment
- `src/actions/auth.ts` — `signOut` server action; no change needed

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Poll card triple-dot context menu | Bracket cards have it; UI consistency is expected | LOW | Adapt session-card-menu.tsx pattern with Radix DropdownMenu |
| Student dashboard removes deleted activities | Activation appears live; deletion should too | LOW | Add broadcastActivityUpdate call to delete actions |
| Sign-out button pending feedback | Any server action button is expected to show loading state | LOW | useTransition pattern already used project-wide |

## Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| RR all-at-once mode works correctly | Enables flexible classroom pacing — teacher can record results in any order | MEDIUM | Requires root-cause investigation; all-at-once is a unique RR feature few classroom tools offer |
| SE final round live vote counts | Teacher confidence in data throughout the entire bracket; live to the last vote | MEDIUM | Realtime vote watching to the last matchup; not all bracket tools show live mid-round counts |

## Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Realtime deletion notification message to student | "The teacher deleted this bracket" explanation | Adds complexity; students need the deleted item gone, not an explanation | Silently refetch and remove from list; EmptyState handles the zero-activity case |
| Poll context menu with archive option | Sessions have archive; polls should too | Polls have no archiving model in the DB schema; adding it is out of scope for a UX-parity fix | Defer archive to v1.4; context menu in v1.3 has Edit/Duplicate/Delete only |
| Sign-out confirmation dialog ("Are you sure?") | Preventing accidental sign-out | Adds friction to a deliberate action; teachers know what sign-out does | Immediate pending state is sufficient; sign-in is fast if they sign out by mistake |
| Spinner icon on sign-out button | More visual richness during pending | The existing dashboard uses text-only pending states consistently ("Deleting...", "Ending..."); a spinner would be inconsistent | Text change ("Signing out...") + disabled state matches established pattern |

---

## Feature Dependencies

```
Feature 4 (Student dynamic removal)
    └──requires──> broadcastActivityUpdate (already exists in lib/realtime/broadcast.ts)
    └──requires──> deleteBracket / deletePoll fetch sessionId before delete

Feature 2 (RR all-at-once fix)
    └──requires──> investigate activation code path for RR (updateBracketStatus -> DAL -> round opening)
    └──must NOT regress──> celebration chain (Plan 05/06 from Phase 24, hasShownRevealRef guards)

Feature 3 (SE final round realtime)
    └──requires──> root-cause investigation of useRealtimeBracket behavior during round advancement
    └──must NOT regress──> bracketCompleted celebration chain

Feature 1 (Poll context menu)
    └──enhances──> Feature 4 (delete via context menu triggers broadcast removal on student dashboard)
    └──independent of──> Features 2, 3, 5

Feature 5 (Sign-out feedback)
    └──independent of──> all other features
```

### Dependency Notes

- **Feature 1 and Feature 4 compound:** Adding a context menu (Feature 1) with a Delete action
  makes deletion more accessible from the dashboard. If Feature 4 (broadcast on delete) is also
  done, students will see the poll disappear immediately after the teacher uses the new context menu.
  Feature 4 first, then Feature 1 is the safest order — but both are independent enough to do either way.

- **Feature 2 and Phase 24 celebration:** The all-at-once fix touches `recordResult` and the
  activation path. The Phase 24 celebration chain is wired through `bracketCompleted` from the
  realtime hook — the fix must preserve the `bracket_completed` broadcast being sent only when all
  matchups are truly decided. The `hasShownRevealRef` guards from Plan 05 must not be disturbed.

- **Feature 3 investigation may reveal Feature 2 overlap:** Both involve the bracket completion
  signal path. If the SE final-round bug is caused by premature `status: 'completed'` in the API
  response, the same root cause may affect RR all-at-once. Investigate together.

---

## MVP Definition

### Implement in v1.3

All five features are scoped for v1.3. Ordered by ascending complexity and dependency risk:

- [ ] Feature 5 — Sign-out button pending feedback — isolated, lowest complexity, no risk
- [ ] Feature 1 — Poll context menu — isolated, UI-only, clear existing pattern to follow
- [ ] Feature 4 — Student dynamic removal — low complexity, requires broadcast call addition
- [ ] Feature 2 — RR all-at-once completion — medium complexity, requires root-cause trace
- [ ] Feature 3 — SE final round realtime — medium complexity, requires root-cause trace

### Defer to v1.4

- [ ] Poll archiving — schema change needed; not a UX parity bug, a missing feature
- [ ] Student notification message on deletion — adds complexity without proportionate value
- [ ] Spinner icon on sign-out — inconsistent with established text-pending pattern

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Poll context menu (Feature 1) | MEDIUM — teachers notice inconsistency | LOW | P1 |
| RR all-at-once fix (Feature 2) | HIGH — broken pacing mode is a correctness bug | MEDIUM | P1 |
| SE final round realtime (Feature 3) | HIGH — live vote watching is core teacher UX | MEDIUM | P1 |
| Student dynamic removal (Feature 4) | MEDIUM — confusion in live classrooms | LOW | P1 |
| Sign-out button feedback (Feature 5) | LOW — functional, not broken, just lacking polish | LOW | P2 |

**Priority key:**
- P1: Must fix for v1.3
- P2: Should fix, minimal cost, clear pattern

---

## Competitor Feature Analysis

| Feature | Typical Classroom Tool Behavior | SparkVotEDU Target |
|---------|---------------------------------|--------------------|
| Card context menus | Consistent triple-dot across all card types | Match bracket pattern on poll cards |
| Realtime list updates | Full-page refresh on delete | No-refresh removal via broadcast |
| Round-robin completion | Requires manual "end" button | Auto-detect all matchups decided |
| Live vote dashboards | Refresh-to-update or polling | WebSocket with 2s batch flush, final round included |
| Auth button feedback | Instant redirect (often no loading state) | Pending state with label change |

---

## Sources

- `src/components/bracket/bracket-card.tsx` — reference implementation for custom context menu
- `src/components/teacher/session-card-menu.tsx` — reference implementation for Radix DropdownMenu pattern
- `src/components/poll/poll-card.tsx` — current poll card (no context menu)
- `src/hooks/use-realtime-activities.ts` — activity broadcast subscription hook
- `src/actions/bracket.ts` — `deleteBracket`, `updateBracketStatus` (broadcast patterns)
- `src/actions/round-robin.ts` — `recordResult`, `isRoundRobinComplete`
- `src/lib/dal/round-robin.ts` — `isRoundRobinComplete`, `advanceRoundRobinRound`
- `src/hooks/use-realtime-bracket.ts` — bracket subscription, `bracketCompleted` signal
- `src/components/auth/signout-button.tsx` — current sign-out implementation
- `src/actions/auth.ts` — `signOut` server action
- `.planning/STATE.md` — pending todos confirming the 5 scoped features
- `.planning/debug/rr-bracket-completion-celebration.md` — Phase 24 diagnosis (celebration chain)
- `.planning/debug/celebration-loops-infinitely.md` — Phase 24 diagnosis (infinite loop fix)
- `.planning/debug/teacher-rr-celebration-not-triggering.md` — Phase 24 race condition diagnosis
- `.planning/debug/rr-tiebreaker-declares-winner-in-tie.md` — Phase 24 standings fix
- `.planning/phases/24-bracket-poll-ux-consistency/24-VERIFICATION.md` — Plan 05/06 verification (Phase 24 complete)
- `.planning/phases/24-bracket-poll-ux-consistency/24-UAT.md` — UAT results (Phase 24 passed)

---

*Feature research for: SparkVotEDU v1.3 Bug Fixes & UX Parity*
*Researched: 2026-02-24*
