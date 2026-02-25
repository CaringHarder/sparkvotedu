# Pitfalls Research

**Domain:** Supabase Realtime + Next.js classroom voting app — v1.3 bug fixes and UX parity sprint
**Researched:** 2026-02-24
**Confidence:** HIGH (all critical pitfalls verified by reading actual codebase and confirmed debug files)

---

## Critical Pitfalls

### Pitfall 1: hasShownRevealRef Set Before setTimeout — Timer Cancellation Permanently Blocks Celebration

**What goes wrong:**
A `useRef` guard (`hasShownRevealRef.current = true`) is set synchronously *before* the `setTimeout(...)` call that triggers the celebration. When the effect re-runs — due to a dependency change caused by a nearly simultaneous second realtime event — React's cleanup cancels the timer. The re-run then fails the `!hasShownRevealRef.current` guard because the ref was already flipped, so no new timer is scheduled. The celebration never fires.

This is confirmed in the codebase at `live-dashboard.tsx` line 327. When the final RR matchup is decided, `recordResult` fires two rapid-fire broadcasts: `winner_selected` then `bracket_completed`. Each broadcast triggers `fetchBracketState()`, creating a new `currentMatchups` array reference. The dependency change re-runs the effect within the 2-second timer window, cancelling it. The ref guard then blocks rescheduling permanently.

**Why it happens:**
The ref guard is meant to prevent the celebration from looping. Developers set it "before" the action so no second effect pass can trigger. They do not account for the timer cleanup cycle: cleanup cancels the timer, a new run checks the now-true ref, and permanently blocks.

**How to avoid:**
Move `hasShownRevealRef.current = true` **inside** the `setTimeout` callback, just before `setRevealState(...)`. If cleanup cancels the timer before it fires, the ref is not yet set, so the next effect run can reschedule. Only when the timer actually fires does the guard get set, preventing double-fire.

```tsx
// WRONG: ref set outside timer — cancellation permanently blocks rescheduling
hasShownRevealRef.current = true
const timer = setTimeout(() => {
  setRevealState({ ... })
}, 2000)

// CORRECT: ref set inside timer — cleanup can safely cancel and reschedule
const timer = setTimeout(() => {
  hasShownRevealRef.current = true
  setRevealState({ ... })
}, 2000)
```

**Warning signs:**
- Celebration or reveal component never renders even though the completion broadcast arrives.
- Two rapidly-fired events (`winner_selected` then `bracket_completed`) in quick succession.
- Effect has `currentMatchups` or any data-fetching result in its dependency array, and a network refetch happens within the timer window.
- `DEVotingView` works; `RRLiveView` or SE/RR teacher path does not.

**Phase to address:** RR all-at-once bracket completion fix; SE bracket final round realtime fix.

---

### Pitfall 2: Missing hasShownRevealRef on Celebration Effects — Infinite Countdown Loop After Dismiss

**What goes wrong:**
After the `CelebrationScreen` auto-dismisses (12-second timer) or the user clicks "Continue," `showCelebration` is set to `false`. The triggering `useEffect` condition is `bracketCompleted && !revealState && !showCelebration`. With `bracketCompleted` still `true` and both other flags now `false`, all conditions are met again. The effect re-fires, schedules a 2-second delay, and re-launches the entire countdown → celebration cycle — infinitely.

Confirmed in the codebase: `RRLiveView` in `bracket/[bracketId]/page.tsx` has no `hasShownRevealRef` guard. `DEVotingView` in the same file has the guard and works correctly. The `currentMatchups` dependency in `RRLiveView` also makes the effect volatile: polling fallback refetches every 3 seconds, creating new array references and re-evaluating the effect even between dismissals.

**Why it happens:**
Developers add the celebration trigger effect but only think about the "not yet shown" case. They do not consider that after the celebration ends, all the effect conditions will be met again because `bracketCompleted` is permanent and will not revert to `false`.

**How to avoid:**
Every celebration-trigger `useEffect` must include a `useRef` guard set before the celebration fires, never reset. Mirror the `DEVotingView` pattern:

```tsx
const hasShownRevealRef = useRef(false)

useEffect(() => {
  if (bracketCompleted && !revealState && !showCelebration && !hasShownRevealRef.current) {
    const timer = setTimeout(() => {
      hasShownRevealRef.current = true  // set inside timer (see Pitfall 1)
      setRevealState({ ... })
    }, 2000)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState, showCelebration, ...])
```

**Warning signs:**
- Countdown plays, celebration shows, user dismisses, countdown plays again 2 seconds later.
- `useEffect` condition includes a permanent boolean (`bracketCompleted`, `pollClosed`) that never reverts.
- Component has `showCelebration` in dependencies but no persistent guard ref.
- Works correctly in `DEVotingView` but not in `RRLiveView` for the same feature.

**Phase to address:** RR all-at-once bracket completion fix (student `RRLiveView` missing guard).

---

### Pitfall 3: Early Return in Render Short-Circuits Overlay — Celebration Never Reaches the DOM

**What goes wrong:**
Two React state flags are set in the same state batch: `showCountdown = true` AND `closedDetected = true`. On the next render, an early-return guard checks `closedDetected && !showReveal` and returns a static "This poll has been closed" message — short-circuiting before the JSX section that renders the countdown overlay is reached.

Confirmed in the codebase: student poll page `poll/[pollId]/page.tsx`. Lines 89–90 set both flags simultaneously. Line 310 early-returns before line 327 where the countdown overlay lives. The teacher view works because it uses a local `forceReveal` flag that does not compete with any early return.

**Why it happens:**
Developers add a "final state" early return at the top of the render for post-animation display. They do not account for the transition state where both the animation and the final state are simultaneously true. React batches both `setState` calls into a single render, so the final state check fires in the same render that was meant to start the animation.

**How to avoid:**
Never set a "final state" flag at the same time as an "animation starting" flag. Set `closedDetected` only **after** the animation completes — inside the dismiss callback — not in the same effect that detects the status change:

```tsx
// WRONG: sets both flags simultaneously in the same effect
if (prev !== 'closed' && pollStatus === 'closed') {
  setShowCountdown(true)
  setClosedDetected(true)  // fires early return on next render, blocks countdown
}

// CORRECT: closedDetected is set only after animation completes
if (prev !== 'closed' && pollStatus === 'closed') {
  setShowCountdown(true)
  // closedDetected is set inside handleRevealDismiss, not here
}

function handleRevealDismiss() {
  setShowReveal(false)
  setClosedDetected(true)  // NOW the "final state" kicks in, after animation
}
```

**Warning signs:**
- Animation flag (`showCountdown`, `showReveal`) is set simultaneously with a "has completed" or "final state" flag.
- An early return in the component checks `closedDetected && !showReveal` before the section that renders overlays.
- Student page immediately shows final state with no animation, but teacher page works correctly.
- Two separate code paths handle the same lifecycle event (teacher: local flag; student: realtime effect).

**Phase to address:** Poll student UX — fixing poll close celebration on the student page.

---

### Pitfall 4: bracketDone Computed With SE-Centric Logic — Never True for RR Brackets

**What goes wrong:**
`bracketDone` in `live-dashboard.tsx` uses `currentRound === totalRounds && allRoundDecided`. For Round Robin brackets, `currentRound` and `roundStatus` are computed from SE round structure which does not apply to RR — `roundStatus` explicitly returns an empty object for RR, making `allRoundDecided` undefined/falsy. The result: `bracketDone` is never `true` for RR. This prevents the "Complete!" badge from rendering and any UI gating that depends on `bracketDone`.

Confirmed: `live-dashboard.tsx` line 792–794 has `rrAllDecided` computed separately on line 793 (`currentMatchups.every(m => m.status === 'decided')`) but it is not included in the `bracketDone` ternary.

**Why it happens:**
The variable was added for SE brackets and extended with a DE branch, but the RR case was missed. The variable compiles and runs without error — the bug is silent.

**How to avoid:**
When adding a new bracket type condition, trace every derived variable that gates UI downstream and add the appropriate branch:

```tsx
const bracketDone = isDoubleElim
  ? deBracketDone
  : isRoundRobin
    ? rrAllDecided  // all matchups decided across all RR rounds
    : (currentRound === totalRounds && allRoundDecided)
```

**Warning signs:**
- "Complete!" badge never appears for a particular bracket type even after all matchups are decided.
- Buttons that should be hidden after completion remain visible.
- A `bracketDone` variable uses `currentRound` or `allRoundDecided`, and those variables have explicit `if (isDoubleElim) return {}` guards earlier in the component.

**Phase to address:** RR all-at-once bracket completion fix.

---

### Pitfall 5: Dual-Channel Broadcast Pattern — Activity Deletion Missing Second Channel

**What goes wrong:**
The existing broadcast pattern uses two channels in concert: `activities:{sessionId}` (subscribed by `useRealtimeActivities`) and the activity's own channel `bracket:{bracketId}` or `poll:{pollId}` (subscribed by the respective hooks). When broadcasting a deletion, a developer who only sends to `activities:{sessionId}` will update the student's activity grid but will not notify students who are already inside the activity. Students on the bracket/poll page will see stale UI — a bracket that no longer exists, an error state, or a broken voting form.

**Why it happens:**
The dual-channel pattern is documented in comments but the relationship between channels is not obvious when adding a new feature. Broadcasting "for deletion" looks like a one-channel operation on the surface since deletion affects the list, not the activity itself.

**How to avoid:**
Broadcasting student activity removal requires both:
1. Send `activity_update` to `activities:{sessionId}` — causes activity grid to refetch and remove the card.
2. Send a deletion event to the activity's own channel (`bracket_update` type `activity_removed` or `poll_update` type `activity_removed`) — causes students already on the activity page to detect the removal and navigate back to `/session/{sessionId}`.

When adding any new broadcast event, answer: "Which channels subscribe to this topic, and will any subscriber be in an inconsistent state if they do not receive this event?"

**Warning signs:**
- Students on the activity grid navigate away when an activity is removed, but students already on the bracket/poll page stay on a stale view with no redirect.
- The `broadcast.ts` utility has only one call for a deletion-related action.
- Tests only verify the `activities:{sessionId}` subscriber, not the `bracket:{bracketId}` subscriber.

**Phase to address:** Student dynamic activity removal phase.

---

### Pitfall 6: Supabase Channel Not in useEffect Cleanup — Subscription Leak

**What goes wrong:**
When a component using a realtime hook unmounts or re-renders with new props, if the cleanup function does not call `supabase.removeChannel(channel)`, the previous channel remains subscribed. With 30 students each mounting and unmounting activities, this causes the "TooManyChannels" error on Supabase (default limit: 200 channels per connection). In React StrictMode (development), effects run twice, doubling the leak rate and making the issue appear in development before production.

The codebase handles this correctly in all three existing hooks. The risk is when a new channel is added to an existing `useEffect` without updating the cleanup.

**Why it happens:**
Developers add a second `supabase.channel(...).subscribe()` inside an existing `useEffect` (e.g., for a deletion event subscription) without adding it to the cleanup return. The main channel gets cleaned up but the new one leaks.

**How to avoid:**
Every channel created inside a `useEffect` must have a corresponding `removeChannel` call in the cleanup function. Count channels created; count `removeChannel` calls — they must match:

```tsx
useEffect(() => {
  const mainChannel = supabase.channel(`bracket:${bracketId}`).on(...).subscribe()
  const activitiesChannel = supabase.channel(`activities:${sessionId}`).on(...).subscribe()

  return () => {
    supabase.removeChannel(mainChannel)
    supabase.removeChannel(activitiesChannel)  // both must be removed
  }
}, [bracketId, sessionId, supabase])
```

Also: do not create a Supabase client inside `useEffect`. Use `useMemo(() => createClient(), [])` as the existing hooks do. A new client on each render creates new channels even when channel names match.

**Warning signs:**
- Channel count climbing over time in Supabase Realtime dashboard metrics.
- "TooManyChannels" error in browser console or Supabase logs.
- The `useEffect` cleanup function has one `removeChannel` call but the effect body has multiple `.channel(...).subscribe()` calls.
- A new deletion broadcast subscription is added alongside an existing channel without updating the cleanup.

**Phase to address:** Student dynamic activity removal (adding deletion broadcast subscription); any subscription modification in SE bracket final round realtime fix.

---

### Pitfall 7: SE Bracket Final Round — prevMatchupStatusRef Misses Transition on WebSocket Reconnect

**What goes wrong:**
The primary reveal trigger in `live-dashboard.tsx` uses transition detection: `prevStatus !== 'decided' && matchup.status === 'decided'`. On WebSocket reconnect, the initial `fetchBracketState()` call (triggered by `SUBSCRIBED` status callback) loads matchups already in `decided` state. But `prevMatchupStatusRef` also shows `decided` from before the disconnect. No status transition is detected, so the reveal never fires.

The fallback path (Pitfall 1 / `bracketCompleted` path) is the correct recovery. If Pitfall 1 is also present (ref set outside timer), both paths fail simultaneously and the SE final round celebration is permanently broken on reconnect.

**Why it happens:**
Transition-based detection requires a "before" state. On reconnect, both "before" and "after" are the completed state — the transition was missed during the disconnect window.

**How to avoid:**
- Ensure the `bracketCompleted` fallback path is the primary safety net for reconnect scenarios.
- Apply the Pitfall 1 fix (ref inside timer) so the fallback path can recover after a reconnect.
- Confirm the transport fallback (WebSocket → HTTP polling) correctly sets `bracketCompleted = true` from polled status after reconnect — it does in `useRealtimeBracket` line 95 (`if (data.status === 'completed') setBracketCompleted(true)`).

**Warning signs:**
- Teacher celebration does not fire after a network interruption.
- `bracketCompleted` is `true` but `revealState` is never set after reconnect.
- Works on first load but not after disconnecting and reconnecting the browser tab.

**Phase to address:** SE bracket final round realtime fix.

---

### Pitfall 8: Adding Poll Context Menu Without e.stopPropagation — Click Events Bubble

**What goes wrong:**
When adding a dropdown context menu to a poll card (matching the bracket card pattern), the trigger button sits inside a clickable card or link element. Without `e.stopPropagation()` on the trigger button's `onClick`, clicking the three-dot menu button also triggers the parent card's navigation. The user sees the context menu open AND the page navigates simultaneously.

Confirmed pattern in `session-card-menu.tsx` line 33–35: explicit `e.stopPropagation()` and `e.preventDefault()` on the trigger button.

**Why it happens:**
Developers add the `DropdownMenuTrigger` button and wire up the menu, but forget that the button is a descendant of an anchor or click-handler element. The event bubbles up and triggers both handlers.

**How to avoid:**
The trigger button for any context menu inside a clickable card must call both:
```tsx
onClick={(e) => {
  e.stopPropagation()
  e.preventDefault()
}}
```
This is required on the `DropdownMenuTrigger` button, not just on the `DropdownMenuItem` children.

**Warning signs:**
- Clicking the three-dot menu triggers both the menu AND navigates/activates the parent.
- The context menu appears briefly then disappears because navigation unmounts the component.
- Working correctly in `session-card-menu.tsx` but newly added poll card menu does not stop propagation.

**Phase to address:** Poll context menu phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `currentMatchups` in celebration effect dependency array | Ensures latest champion name is available | Creates volatile effect that re-runs on every refetch, enabling Pitfall 1 | Never — capture the matchup snapshot inside the timer callback instead |
| Naive win-counting for RR champion instead of `calculateRoundRobinStandings` | Simpler code | Wrong answer in ties; four independent implementations have all diverged; contradicts the standings table | Never — the correct function already exists as `computeRRChampionInfo` in the codebase |
| Setting render flags (`closedDetected`) at same time as animation flags (`showCountdown`) | One state update | Early-return guards short-circuit the animation; extremely hard to debug because it passes all static analysis | Never — use animation completion callbacks to set final state |
| `bracketDone` without bracket-type guard for each bracket type | Works for initial bracket type | Silently broken for new bracket types with no compilation error | Never without an explicit comment and failing test for each bracket type |
| Inline channel subscriptions inside complex components rather than dedicated hooks | Faster to write | Cleanup burden grows with each feature; easy to miss a `removeChannel` | Only for truly one-off unmount-safe components, never in list items |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Realtime broadcast from Server Action | Using the Supabase client library in a server action (requires persistent WebSocket) | Use the REST API (`/realtime/v1/api/broadcast`) with service role key, as `broadcast.ts` already does |
| Supabase Realtime channel naming | Reusing same channel topic for different resource types | Use prefixed topics: `bracket:{id}`, `poll:{id}`, `activities:{sessionId}` — each resource type gets its own channel family |
| Supabase client in hooks | Calling `createClient()` in the hook body on every render | Wrap in `useMemo(() => createClient(), [])` — one client instance per hook mount |
| Supabase channel in polling fallback | Forgetting to clear the polling interval AND the channel on cleanup | Both `clearInterval(pollInterval)` and `supabase.removeChannel(channel)` must be in the same cleanup return |
| Broadcast payload for deletion | Sending `{ id: activityId }` and expecting subscribers to derive state from the payload | The existing pattern refetches from server on any event — deletion broadcast should send empty payload or trigger a list refetch, not try to update local state from the payload ID |
| Next.js 16 Server vs. Client boundary | Calling `broadcastMessage` in a `'use client'` file | Server-side broadcasts must be in files marked `'use server'` or in API route handlers; `broadcast.ts` is server-only and must stay that way |
| DropdownMenu trigger inside clickable card | Missing `e.stopPropagation()` on trigger button | Always add `stopPropagation` + `preventDefault` to any context menu trigger that sits inside a link or click-handler parent element |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `currentMatchups` as celebration effect dependency | Effect re-runs on every vote (up to 30/min in a classroom), canceling and rescheduling timers | Remove `currentMatchups` from celebration-trigger effect dependencies; capture matchup snapshot at trigger time inside the setTimeout callback | Immediately in a class of 20+ students voting rapidly |
| HTTP polling fallback refetching every 3 seconds per student | 30 students × 3s = 10 API requests/second | The polling fallback is correct for WebSocket-blocked networks — ensure the polling interval is cleared on unmount and never starts if WebSocket connects within 5 seconds | >15 students on a poor network simultaneously |
| Realtime subscription per mounted component rather than per hook | Channel count doubles on React StrictMode double-mount in development | Use `useMemo(() => createClient(), [])` and always clean up; treat development double-mount as a free leak test | Development: immediately; Production: gradual leak over session lifetime |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| New deletion Server Action without teacher ownership check | A student could craft a request to remove activities they do not own | All Server Actions that mutate bracket/poll state must call `getAuthenticatedTeacher()` and verify `bracket.teacherId === teacher.id` before any mutation. Copy the pattern from `advanceMatchup` in `bracket-advance.ts` |
| Broadcasting deletion events from a `'use client'` file with the service role key | Exposes `SUPABASE_SERVICE_ROLE_KEY` to the client bundle | Service role key is only accessed in files without `'use client'` directive and without `NEXT_PUBLIC_` prefix — verify this holds for any new broadcast call |
| Sign-out double-submit | Triggers two sign-out server actions; unlikely security issue but causes redirect errors | Use `useTransition` or disable button during `isPending` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "And the winner is..." reveal text showing before celebration on RR/poll completion | Students see a confusing intermediate screen: "Colosseum vs Taj Mahal / And the winner is..." — a bracket-style reveal that makes no sense for RR or poll completions | Remove the pause + reveal stages from `WinnerReveal` (or add `countdownOnly` prop). The 3-2-1 countdown is wanted; the "And the winner is..." text is not |
| "All votes in!" content bleeding through semi-transparent celebration overlay | Bright green checkmark and text are visible through the 85% opacity black background | Suppress the underlying content when celebration is active: `if (celebrationActive) return null` in `RRSimpleVoting` |
| Sign-out button with no pending state | Teacher clicks sign out, nothing appears to happen for 300–600ms, clicks again | Show "Signing out..." or a spinner and disable the button during the async sign-out action |
| Poll context menu missing compared to bracket context menu | Inconsistent teacher UX: brackets have a three-dot menu with edit/duplicate/delete, polls have separate icon buttons | Add a `DropdownMenu` to the poll list view matching the `session-card-menu.tsx` / `bracket-card.tsx` pattern |
| Student left on bracket/poll page after activity is dynamically removed | Student sees an error or stale voting form for a bracket that no longer exists | Broadcast a deletion event to the activity's own channel; student page detects it and navigates back to `/session/{sessionId}` |

---

## "Looks Done But Isn't" Checklist

- [ ] **hasShownRevealRef inside timer:** Every celebration `useEffect` sets the ref **inside** the `setTimeout` callback, not before it — verify by reading the effect body, not just looking for the ref declaration.
- [ ] **hasShownRevealRef guard present:** Every celebration `useEffect` condition includes `!hasShownRevealRef.current` — verify `RRLiveView`, `DEVotingView`, and teacher `live-dashboard.tsx` all have this guard.
- [ ] **All channels in cleanup:** Any `useEffect` that calls `supabase.channel(...)` more than once must have the same number of `supabase.removeChannel(...)` calls in the cleanup. Count them explicitly.
- [ ] **bracketDone covers RR:** The `bracketDone` variable must have an explicit `isRoundRobin ? rrAllDecided :` branch — verify by searching for `bracketDone` in `live-dashboard.tsx` and checking each ternary arm.
- [ ] **Dual-channel deletion broadcast:** Any activity deletion broadcast must notify BOTH `activities:{sessionId}` AND the activity's own channel. One channel is not sufficient.
- [ ] **e.stopPropagation on context menu trigger:** Any `DropdownMenuTrigger` added inside a card that has a click handler or is wrapped in a link must call `e.stopPropagation()` and `e.preventDefault()` on the trigger button's `onClick`.
- [ ] **Early return render order:** Any component with celebration overlays must not have a "final state" early return before the JSX section that renders the overlays. Trace: early returns at top of render → overlay renders → final state display at bottom.
- [ ] **Sign-out feedback:** Sign-out button shows pending state (`isPending`) and is disabled to prevent double-submission. Verify visually.
- [ ] **Server Action ownership check on deletion:** New deletion Server Actions call `getAuthenticatedTeacher()` and verify `resource.teacherId === teacher.id`. Absence is a silent security hole.
- [ ] **Champion name uses standings function for RR:** Any RR champion display uses `computeRRChampionInfo` (which calls `calculateRoundRobinStandings`) rather than naive win-counting. Search for `maxWins` or `wins.get` in the client files — these indicate the old pattern.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Ref set outside timer — celebration never fires | LOW | Move `hasShownRevealRef.current = true` inside the `setTimeout` callback; no other logic changes required |
| Missing `hasShownRevealRef` — infinite loop | LOW | Add `const hasShownRevealRef = useRef(false)`; add `!hasShownRevealRef.current` to effect condition; set ref inside timer |
| Early return blocking celebration | LOW-MEDIUM | Move the `closedDetected` state update to inside the dismiss callback rather than the detection effect |
| `bracketDone` broken for RR | LOW | Add `isRoundRobin ? rrAllDecided :` branch; `rrAllDecided` is already computed on the adjacent line |
| Channel subscription leak | MEDIUM | Audit every `useEffect` for `supabase.channel()` calls; add all missing `removeChannel` calls to cleanup; verify no channel is created with a new `createClient()` per render |
| Deletion without student navigation — stuck on removed activity | LOW-MEDIUM | Add second broadcast to activity's own channel; add listener in student page that navigates back on `activity_removed` event |
| Wrong RR champion in tie | LOW | Replace four instances of naive win-counting with `computeRRChampionInfo(currentMatchups, entrants)` — the utility already exists in the codebase |
| Content bleed-through behind celebration | LOW | Pass `celebrationActive` flag to `RRSimpleVoting`; return `null` when true |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Ref set outside timer — celebration never fires | RR all-at-once bracket completion fix; SE bracket final round realtime fix | Teacher completes bracket; celebration fires first try; confirm it does NOT fire on effect re-run from second broadcast |
| Missing hasShownRevealRef — infinite loop | RR all-at-once bracket completion (student `RRLiveView` fix) | After celebration auto-dismisses at 12s, confirm countdown does NOT restart |
| Early return blocking poll celebration | Poll student UX parity | Teacher closes poll; student sees 3-2-1 countdown then celebration, not immediate "poll closed" message |
| bracketDone wrong for RR | RR all-at-once bracket completion | Teacher completes all RR matchups; "Complete!" badge appears; action buttons disappear |
| Dual-channel deletion broadcast missing | Student dynamic activity removal | Student on bracket page; teacher removes activity; student redirected to session grid without manual refresh |
| Channel subscription leak | Student dynamic activity removal (new channel for deletion events) | Open Supabase Realtime dashboard; channel count does not climb on repeated component mount/unmount |
| Wrong champion in RR tie | RR all-at-once bracket completion (champion name fix) | Create 3-team RR with circular results; celebration shows "Co-Champions" with all names, not one arbitrary name |
| Content bleed-through | RR all-at-once bracket completion (RRSimpleVoting suppression) | Student is on "All votes in!" screen; celebration overlay appears; green checkmark is NOT visible through overlay |
| Sign-out no feedback | Sign-out button feedback phase | Click sign-out; button shows "Signing out..." or spinner before redirect; button is disabled to prevent double-click |
| Poll missing context menu | Poll context menu phase | Poll list shows three-dot menu matching bracket list UX; Edit/Duplicate/Delete actions all work |
| e.stopPropagation missing on context menu trigger | Poll context menu phase | Click the three-dot menu on a poll card; context menu opens and page does NOT navigate |

---

## Sources

- Codebase: `.planning/debug/rr-bracket-completion-celebration.md` — four confirmed root causes: RR teacher no-celebration, student WinnerReveal reveal text, z-index bleed-through, architectural bundling
- Codebase: `.planning/debug/celebration-loops-infinitely.md` — confirmed missing `hasShownRevealRef` on `RRLiveView`; `DEVotingView` pattern is correct reference
- Codebase: `.planning/debug/teacher-rr-celebration-not-triggering.md` — confirmed ref-outside-timer race condition as primary cause; secondary champion name bug
- Codebase: `.planning/debug/poll-student-no-celebration.md` — confirmed early-return blocking poll student celebration; teacher local flag workaround
- Codebase: `.planning/debug/rr-tiebreaker-declares-winner-in-tie.md` — confirmed naive win-counting in four locations ignoring ties; `calculateRoundRobinStandings` is the correct function
- Codebase: `src/hooks/use-realtime-bracket.ts`, `use-realtime-poll.ts`, `use-realtime-activities.ts` — verified cleanup patterns and dual-channel subscription approach
- Codebase: `src/lib/realtime/broadcast.ts` — verified REST API broadcast pattern and dual-channel coordination
- Codebase: `src/components/teacher/session-card-menu.tsx` — confirmed `stopPropagation` pattern for context menu triggers inside clickable elements
- Supabase: [Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts) — channel lifecycle, cleanup requirements (MEDIUM confidence — verified against codebase patterns)
- Supabase: [Troubleshooting — TooManyChannels Error](https://supabase.com/docs/guides/troubleshooting/realtime-too-many-channels-error) — subscription leak consequences
- Supabase: [Broadcast](https://supabase.com/docs/guides/realtime/broadcast) — REST API broadcast pattern for server-side use
- Supabase GitHub: [Discussion #8573 — Unsubscribing from broadcast with React 18](https://github.com/orgs/supabase/discussions/8573) — React StrictMode double-mount cleanup pitfalls
- React: [LogRocket — useEffect cleanup function](https://blog.logrocket.com/understanding-react-useeffect-cleanup-function/) — timer and cleanup interaction patterns
- React: [maxrozen.com — Race conditions in useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) — ref guard patterns for preventing stale closures

---
*Pitfalls research for: SparkVotEDU v1.3 bug fix and UX parity sprint — Supabase Realtime + Next.js*
*Researched: 2026-02-24*
