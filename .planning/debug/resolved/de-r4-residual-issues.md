---
status: diagnosed
trigger: "Investigate three residual DE bracket issues from UAT Test 5 R4"
created: 2026-02-02T12:00:00Z
updated: 2026-02-02T12:00:00Z
---

# DE R4 Residual Issues -- Root Cause Analysis

Three issues observed during a 16-entrant Double-Elimination bracket in UAT Test 5 R4.

---

## Issue 1: Partial Round Advancement Requires Second Button Press

### Symptom

During one of the rounds, pressing "Close & Advance Winners (N)" leaves 1 matchup
unfinished (still in `voting` status). The button reappears showing "Close Winners &
Advance 1" and correctly finishes when pressed a second time.

### Root Cause

**File:** `src/components/teacher/live-dashboard.tsx`, lines 392-447 (`handleCloseAndAdvance`)

The `handleCloseAndAdvance` function skips matchups that are tied (same vote count for
both entrants) or have zero votes. It does NOT advance these matchups -- it only
advances matchups with a clear vote leader.

```typescript
// lines 410-424
for (const m of votingMatchups) {
  const counts = mergedVoteCounts[m.id] ?? {}
  const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
  const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
  if (e1 > e2 && m.entrant1Id) {
    advanceList.push({ matchupId: m.id, winnerId: m.entrant1Id })
  } else if (e2 > e1 && m.entrant2Id) {
    advanceList.push({ matchupId: m.id, winnerId: m.entrant2Id })
  } else if (e1 > 0) {
    tiedCount.value++     // <-- tied matchup skipped
  } else {
    noVoteCount.value++   // <-- zero-vote matchup skipped
  }
}
```

When `unresolvedCount > 0` but `advanceList.length > 0`, the function advances the
ones it can and shows an error toast (line 440-444):

```typescript
if (unresolvedCount > 0) {
  setError(`${advanceList.length} advanced. ${parts.join(', ')} -- click matchup to pick winner.`)
}
```

However, the error message is easy to miss or confusing. After the first press advances
all clear-winner matchups, the remaining 1 tied/zero-vote matchup is still `voting`.
The action bar re-renders, sees 1 voting matchup, and shows the button again:
"Close Winners & Advance 1".

**Why this is confusing but not a logic bug:** The behavior is intentional -- tied
matchups require teacher tiebreak. But the UX makes it look like the button "didn't
finish" rather than communicating that a tiebreak is needed. If there happen to be
zero votes on a matchup (students didn't vote on it), the "no votes" case is also
skipped, and the teacher has no clear indication of why.

### Why It Happens

1. Voting opens for N matchups in a round.
2. Students vote on most matchups, but one matchup gets a tie or no votes.
3. Teacher presses "Close & Advance (N)".
4. Function advances N-1 matchups (clear winners), skips the tied/zero-vote one.
5. Error message flashes but may be overlooked on a busy dashboard.
6. Button reappears for the remaining 1 matchup.
7. On the second press, the same logic runs. If still tied/zero votes, it shows
   the error again and still won't advance (the error message says "click matchup
   to pick winner").
8. User reported it "correctly finishes when pressed" on second try -- this means
   during the interval between presses, the vote counts may have updated (latency
   from the realtime batch flush at 2-second intervals) and the tie resolved itself,
   OR the user clicked the matchup to manually tiebreak between presses.

### Suggested Fix

**Option A (Best UX):** When all other matchups advance and only tied/zero-vote ones
remain, auto-select the first entrant (or random) for zero-vote matchups, and show
a modal for ties asking teacher to pick. This avoids the confusing "button appears
again" flow.

**Option B (Simpler):** After advancing the clear winners, if there are tied/zero-vote
matchups remaining, automatically open the pick-winner modal for the first unresolved
matchup instead of just setting an error string. Specifically, call
`setSelectedMatchupId(firstUnresolvedId)` so the teacher immediately sees the
tiebreak UI.

**Specific code change for Option B** in `handleCloseAndAdvance` (after the
`startTransition` block around line 440):

```typescript
// After advancing clear winners, auto-select first unresolved for tiebreak
if (unresolvedCount > 0) {
  const firstUnresolved = votingMatchups.find((m) => {
    const counts = mergedVoteCounts[m.id] ?? {}
    const e1 = m.entrant1Id ? (counts[m.entrant1Id] ?? 0) : 0
    const e2 = m.entrant2Id ? (counts[m.entrant2Id] ?? 0) : 0
    return e1 === e2 // tied or both zero
  })
  if (firstUnresolved) {
    setSelectedMatchupId(firstUnresolved.id)
  }
}
```

---

## Issue 2: Teacher Tab Resets to "Winners" After GF Completion

### Symptom

After the Grand Finals matchup is decided and the bracket completes, the teacher's
active region tab (which was on `grand_finals`) resets back to `winners`.

### Root Cause

**File:** `src/components/teacher/live-dashboard.tsx`, line 59 and lines 132-162
(`deRegionInfo` / `computeRegionInfo`)

The `deRegion` state is initialized to `'winners'` on line 59:

```typescript
const [deRegion, setDeRegion] = useState<DERegion>('winners')
```

There is **no code that auto-switches `deRegion` when a region becomes active or
when the bracket completes**. The teacher manually navigates to `grand_finals` tab.

The problem occurs because when the bracket completes, the `bracketCompleted` flag
triggers a state refetch via `useRealtimeBracket`. The `fetchBracketState` function
(line 68-100 in `use-realtime-bracket.ts`) calls `setMatchups(data.matchups)` which
replaces the entire matchups array. This causes `currentMatchups` to update (line 95-100),
which triggers re-computation of `deMatchupsByRegion`, `deRegionInfo`, and all derived
`useMemo` values.

However, the **actual tab reset** happens because the real-time refetch causes the
component to receive a **new `bracket` prop** from the server via `revalidatePath`
(called in the server action at line 81 of `bracket-advance.ts`). When Next.js
revalidates the path, the server component re-renders, which can cause the
`LiveDashboard` client component to remount if the parent layout re-renders with
new props. A remount resets `useState` to its initial value of `'winners'`.

**Supporting evidence:** The `revalidatePath` calls in `advanceMatchup` (lines 81-82)
and the `isBracketComplete` check (line 69-74) both trigger when the final GF matchup
is decided. The `broadcastBracketUpdate(bracketId, 'bracket_completed', ...)` also
fires, which triggers `fetchBracketState()` in the realtime hook. These dual update
paths (broadcast refetch + Next.js revalidation) can cause the component tree to
re-render from the server, potentially remounting `LiveDashboard`.

Even without a full remount, there is a subtler path: When the `bracket_completed`
broadcast arrives, `fetchBracketState` runs and updates `setMatchups`. This triggers
a cascade through the useMemo chain. The GF matchups are now all decided. If
`deActiveRegionInfo` for `grand_finals` recalculates and
`deActiveRegionInfo.currentDisplayRound` changes, the round sub-tabs re-render.
But `deRegion` itself is local state and should survive re-renders.

**Most likely path:** The `revalidatePath` call triggers a server re-render of the
page component that passes the `bracket` prop to `LiveDashboard`. If the page
component is a server component that re-fetches the bracket, it passes a new
`bracket` object. If the `key` on `LiveDashboard` changes (e.g., bracket.status
changes from 'active' to 'completed'), or if the page structure changes (e.g.,
conditional rendering based on bracket status), the component remounts and
`deRegion` resets to `'winners'`.

### Investigation of the Page Component

Let me trace where `LiveDashboard` is rendered to confirm the remount theory.

**File to check:** The live dashboard page that renders `<LiveDashboard>`. The
`revalidatePath` calls target `/brackets/${bracketId}` and `/brackets/${bracketId}/live`.

The remount is the most likely explanation because:
1. `deRegion` is plain `useState` -- it survives re-renders but not remounts.
2. The user reported it goes "back to winners" which is the initial value.
3. It happens specifically "after GF completion" when `bracket_completed` fires
   and `revalidatePath` runs.

### Suggested Fix

**Option A (Preserve tab across remounts):** Store `deRegion` in a ref or URL search
param so it survives remounts. For example, use `useSearchParams` to persist the
active tab in the URL:

```typescript
// In LiveDashboard, replace useState with URL-persisted state:
const searchParams = useSearchParams()
const [deRegion, setDeRegion] = useState<DERegion>(
  (searchParams.get('region') as DERegion) || 'winners'
)
```

**Option B (Auto-navigate to GF on completion):** Add an effect that switches to
`grand_finals` tab when the bracket completes:

```typescript
// After the deBracketDone useMemo (around line 204), add:
useEffect(() => {
  if (deBracketDone) {
    setDeRegion('grand_finals')
  }
}, [deBracketDone])
```

This is the simplest and most robust fix. Even if the component remounts and
`deRegion` resets to `'winners'`, the effect will immediately fire and set it to
`'grand_finals'` because `deBracketDone` will be `true` on mount (all GF matchups
are decided).

**Option C (Both):** Combine A and B -- persist region in URL AND auto-navigate on
completion. This provides the best UX across all scenarios.

**Recommended:** Option B is minimal and directly addresses the reported issue.

---

## Issue 3: Teacher Page Winner Animation Not Showing

### Symptom

When the bracket completes, the student page shows the WinnerReveal countdown
animation + CelebrationScreen correctly. The teacher page does NOT show the
WinnerReveal animation. It may jump directly to CelebrationScreen or show nothing.

### Root Cause

**File:** `src/components/teacher/live-dashboard.tsx`, lines 222-290

The teacher page uses TWO mechanisms to trigger `WinnerReveal`:

1. **Status-transition detection** (lines 222-268): Watches `currentMatchups` for
   a matchup whose status transitions from non-`decided` to `decided` in the final
   GF round.

2. **Fallback via `bracketCompleted`** (lines 274-290): When the `bracketCompleted`
   flag fires, checks if reveal hasn't been shown yet and triggers it.

**The race condition:** Both mechanisms depend on the `prevMatchupStatusRef` being
populated with the "before" state. Here is the problem:

When `advanceMatchup` fires on the server (teacher presses "Close GF & Advance"),
**two things happen nearly simultaneously:**

1. `broadcastBracketUpdate(bracketId, 'winner_selected', ...)` fires (line 62 of
   `bracket-advance.ts`)
2. `broadcastBracketUpdate(bracketId, 'bracket_completed', ...)` fires (line 71)

Both broadcasts reach `use-realtime-bracket.ts`. The `winner_selected` event triggers
`fetchBracketState()` (line 144). The `bracket_completed` event triggers BOTH
`fetchBracketState()` (line 144) AND `setBracketCompleted(true)` (line 148).

**Critical timing issue:** The `fetchBracketState` from `winner_selected` and
`bracket_completed` are essentially duplicate calls. They both fetch the same
state (matchup already decided, bracket completed). Only one fetch actually updates
`setMatchups`. The React batching may cause `bracketCompleted` and the matchup
update to arrive in the same render cycle.

When they arrive in the same render cycle:
- `currentMatchups` updates with the GF matchup now `decided`
- `bracketCompleted` becomes `true`
- The status-transition effect (lines 222-268) runs, but `prevMatchupStatusRef`
  is empty or already contains `decided` (because the initial fetch on mount
  populated the ref with the "already decided" status if the fetch completes
  before the ref is populated with the "voting" state).

**The specific failure mode:**

The teacher is the one who triggers the advancement by pressing the button.
The `startTransition` wrapping `advanceMatchup` means the server action runs
and completes. The `revalidatePath` causes Next.js to re-render the page with
updated data. This server-side revalidation may deliver the updated bracket
(with the GF matchup already decided) **before** the broadcast arrives.

So the flow is:
1. Teacher clicks "Close GF & Advance"
2. Server action runs `advanceDoubleElimMatchup` -- matchup set to `decided`
3. Server action calls `revalidatePath` -- Next.js re-renders page with new data
4. `LiveDashboard` remounts or receives new props with GF already `decided`
5. `prevMatchupStatusRef` is initialized empty `{}`
6. First render: effect runs, sees GF status is `decided`, but `prev[matchup.id]`
   is `undefined` (not a non-decided status), so the condition
   `prevStatus && prevStatus !== 'decided'` on line 228 **fails** because
   `prevStatus` is `undefined` (falsy).
7. The ref is then populated with `{ [gfMatchupId]: 'decided' }`.
8. `bracketCompleted` is set (either from broadcast or from polling detection).
9. Fallback effect (line 274) runs, but `hasShownRevealRef.current` is `false`
   (component remounted), so it should trigger the reveal.

Wait -- if the component remounts, the fallback SHOULD work because
`hasShownRevealRef` resets to `false`. Let me re-examine.

**Re-analysis with the `startTransition` flow:**

Actually, the `startTransition` in `handleCloseAndAdvance` calls `advanceMatchup`
which is a server action. Server actions with `revalidatePath` do NOT cause
component remounts in Next.js App Router -- they trigger a soft refresh that
preserves client state. So `prevMatchupStatusRef` and `hasShownRevealRef` are
preserved across the revalidation.

The real issue is:

1. Before the teacher clicks, `prevMatchupStatusRef` has `{ [gfId]: 'voting' }`.
2. Teacher clicks "Close GF & Advance".
3. Server action runs. `revalidatePath` triggers.
4. The soft refresh delivers new `bracket` prop with GF matchup `decided`.
5. `currentMatchups` updates (from new bracket prop, not from realtime).
6. Status-transition effect runs: `prevStatus = 'voting'`, `matchup.status = 'decided'`,
   `matchup.winner` exists. **BUT** -- the check on line 237 is:
   ```
   if (matchup.bracketRegion === 'grand_finals' && matchup.round === maxGfRound)
   ```
   This requires computing `maxGfRound` from `currentMatchups.filter(m => m.bracketRegion === 'grand_finals')`.

**Here is the actual bug for the GF reset scenario:**

If a GF reset match was dynamically created (LB champion won GF1), then
`advanceDoubleElimMatchup` creates a new matchup row with a new round number.
When the teacher decides GF1, the `winner_selected` broadcast fires, and
`fetchBracketState` returns all matchups including the **newly created reset
matchup**. The `maxGfRound` now equals the reset matchup's round, which is
higher than GF1's round. So when GF1 decides, the check
`matchup.round === maxGfRound` fails for GF1 (GF1's round < reset match round).
The reveal doesn't trigger for GF1.

Then when the reset match decides, `maxGfRound` equals the reset match round,
and the check passes. But at this point, `prevMatchupStatusRef` may or may not
have the reset matchup's previous status depending on timing.

**However, the user reported no animation AT ALL -- not even for the final
deciding match.** This means the status-transition detection fails for the
final GF matchup too.

**The most likely cause for complete failure:**

The teacher triggers advancement via `handleCloseAndAdvance`. This function
calls `advanceMatchup` server action **sequentially** for each voting matchup
(line 436-438). After the server action returns, `revalidatePath` fires.
The component re-renders with updated props from the server. `currentMatchups`
now has the GF matchup as `decided`. But the status-transition effect compares
against `prevMatchupStatusRef`, which was set to `'voting'` in the previous
render. So the transition IS detected.

**BUT** -- there's a critical difference between teacher and student:

The teacher's `handleCloseAndAdvance` function calls `advanceMatchup` inside
`startTransition`. The `startTransition` callback is the one that triggers the
server action AND the subsequent `revalidatePath`. During a transition, React
may batch the state updates. The `revalidatePath` causes the server to send
new props, which React applies.

**The real smoking gun:** Look at the `handleCloseAndAdvance` flow for the GF
matchup. In DE mode (line 396-399):

```typescript
votingMatchups = deActiveRegionMatchups.filter(
  (m) => m.round === deCurrentDbRound && m.status === 'voting'
)
```

The function builds `advanceList` and calls `advanceMatchup` for each. After
ALL matchups are advanced, the transition completes. The `revalidatePath` runs,
delivering new data. The component re-renders.

In the same render cycle, `bracketCompleted` may also be set (from the broadcast
that arrives during or just after the server action). The `showCelebration` effect
(line 293-298) sets a 4-second timer. The WinnerReveal trigger runs.

**Found it -- the actual bug:**

Look at the CelebrationScreen timer on line 295:
```typescript
const timer = setTimeout(() => setShowCelebration(true), 4000)
```

And the WinnerReveal auto-dismiss on line 78 of `winner-reveal.tsx`:
```typescript
const timer = setTimeout(dismiss, 3000)
```

The WinnerReveal countdown takes: 3 x 1100ms (countdown) + 1500ms (reveal text) +
3000ms (winner display) = **~7.8 seconds** before auto-dismiss.

But the CelebrationScreen appears after **4 seconds** from `bracketCompleted`.

The `bracketCompleted` flag and the status transition fire in the **same render
cycle** (or very close). So:
- WinnerReveal starts at T=0
- CelebrationScreen starts at T=4 seconds
- CelebrationScreen renders on top of WinnerReveal (both are `z-50` fixed overlays)
- CelebrationScreen's dismiss handler (line 655) calls `setShowCelebration(false)`
  AND `setRevealState(null)` -- killing both.

**But wait** -- on the teacher page, the WinnerReveal and CelebrationScreen are
both conditionally rendered (lines 641-657). If CelebrationScreen appears while
WinnerReveal is still in its countdown, the CelebrationScreen overlay covers it.
The user sees the CelebrationScreen (confetti, trophy) but never sees the dramatic
countdown + winner name reveal. They might click "Continue" immediately, dismissing
both.

**However**, the user said "no animation was shown" -- meaning they didn't see
the CelebrationScreen either. This points to a different root cause: the
status-transition effect NEVER triggers, and the fallback effect also doesn't
trigger, possibly because `bracketCompleted` is already `true` when the component
mounts (if `revalidatePath` caused a remount) or the `hasShownRevealRef` guard
prevents re-triggering.

**Final root cause determination:**

There are actually **two compounding bugs:**

**Bug 3a: Status-transition effect race with `revalidatePath`.**

When the teacher advances the final GF matchup via `handleCloseAndAdvance`, the
server action completes and `revalidatePath` fires. This can cause the page's
server component to re-render, potentially remounting `LiveDashboard` (if the
bracket status changes from 'active' to 'completed' and the page has conditional
rendering based on status). On remount, `prevMatchupStatusRef` is `{}`, so the
first render sees the GF matchup as `decided` with no previous status recorded.
The condition `prevStatus && prevStatus !== 'decided'` fails (prevStatus is
undefined). The reveal never triggers via the status-transition path.

**Bug 3b: Fallback effect may not fire because `bracketCompleted` starts as
`false` and the broadcast arrives AFTER the remount.**

On remount, `bracketCompleted` starts as `false`. The broadcast for
`bracket_completed` may arrive, setting it to `true`. The fallback effect
(lines 274-290) then checks `hasShownRevealRef.current` which is `false`
(remount reset it). It should trigger. UNLESS the `fetchBracketState` triggered
by the broadcast updates `currentMatchups` in the same render cycle. If it does,
the GF matchup's `winner` field needs to be present in `currentMatchups`. If the
state API returns the correct data, the fallback should work.

**The most probable scenario for "no animation at all":**

Confirmed: The page server component (`src/app/(dashboard)/brackets/[bracketId]/live/page.tsx`,
lines 42-43) explicitly allows `completed` status and always renders `LiveDashboard`.
So the page does NOT route away on completion. The LiveDashboard IS rendered.

This means the failure is purely a client-side timing issue. The most probable
sequence for the teacher experiencing **no animation**:

1. Teacher presses "Close GF & Advance (1)".
2. `handleCloseAndAdvance` runs inside `startTransition`. The `advanceMatchup`
   server action completes, sets GF matchup to `decided`, calls `revalidatePath`.
3. The `revalidatePath` soft-refresh delivers new `bracket` prop to LiveDashboard.
   The `bracket.matchups` prop now has the GF matchup as `decided` with a `winner`.
4. React batches the transition: `currentMatchups` updates from the new prop
   (via the `useMemo` on lines 95-100 that returns `bracket.matchups` when
   `realtimeMatchups` is still null from the previous render).
5. **Key race:** The broadcast for `winner_selected` fires from the server, but
   `fetchBracketState` was already triggered by revalidation. The realtime hook's
   `setMatchups` may or may not have updated yet. The `currentMatchups` useMemo
   prefers `realtimeMatchups` when available (line 96), but during the transition
   update from revalidation, `realtimeMatchups` may still be the old value (with
   GF as `voting`), causing `currentMatchups` to temporarily show old data, then
   update again when the broadcast fetch completes.
6. The status-transition effect (lines 222-268) runs. `prevMatchupStatusRef`
   has `{ [gfId]: 'voting' }`. The GF matchup now has `status: 'decided'` and
   `winner` populated. The check on line 237:
   ```
   matchup.bracketRegion === 'grand_finals' && matchup.round === maxGfRound
   ```
   computes `maxGfRound` from the current GF matchups. If a reset match was
   created earlier, `maxGfRound` = reset round > GF1 round. If GF1 is the
   deciding match (WB champion won), `maxGfRound` = GF1 round and the check
   passes. **So the transition detection SHOULD work for the non-reset case.**
7. **However**, after the status-transition effect sets `revealState`, the
   `bracketCompleted` flag also becomes `true` (from broadcast). The
   celebration timer starts: `setTimeout(() => setShowCelebration(true), 4000)`.
8. After 4 seconds, `showCelebration` becomes `true`. The CelebrationScreen
   renders (z-50 fixed overlay), covering the WinnerReveal which is still in
   its countdown phase (the full WinnerReveal animation takes ~7.8 seconds).
9. Teacher sees CelebrationScreen appear (confetti), clicks "Continue",
   which calls `setShowCelebration(false); setRevealState(null)` (line 655-656),
   killing both overlays.
10. **Net result:** Teacher briefly sees CelebrationScreen overlapping the
    WinnerReveal countdown, interprets this as "no animation was shown"
    because they never saw the dramatic countdown + winner name reveal.

**Alternative failure mode (if `startTransition` delays state updates):**

React's `startTransition` marks updates as non-urgent. During the transition,
React may defer rendering the new `bracket` prop. The broadcast arrives
separately and triggers `fetchBracketState`, which calls `setMatchups`.
If `setMatchups` and the prop update happen in the same batched render,
`currentMatchups` jumps directly from old (voting) to new (decided).
The status-transition effect sees the change and triggers the reveal.
But `bracketCompleted` is also set in the same render, starting the
4-second celebration timer that stomps the reveal.

**Bottom line:** The CelebrationScreen 4-second timer stomps the WinnerReveal
7.8-second animation. This is the primary bug. The status-transition detection
may or may not fire depending on timing, but even when it does, the celebration
covers it.

### Suggested Fix

**1. Chain celebration to reveal completion (primary fix):**

Replace the independent `bracketCompleted`-based celebration timer (lines 293-298)
with a chained approach that only shows CelebrationScreen after WinnerReveal
completes. This prevents the CelebrationScreen from stomping the reveal animation.

```typescript
// REMOVE the current celebration timer effect (lines 293-298):
// useEffect(() => {
//   if (bracketCompleted) {
//     const timer = setTimeout(() => setShowCelebration(true), 4000)
//     return () => clearTimeout(timer)
//   }
// }, [bracketCompleted])

// REPLACE with a callback that chains celebration to reveal completion:
const handleRevealComplete = useCallback(() => {
  setRevealState(null)
  // Show celebration 1 second after reveal dismisses
  setTimeout(() => setShowCelebration(true), 1000)
}, [])

// Add a fallback for when reveal never triggers but bracket IS complete:
useEffect(() => {
  if (bracketCompleted && !revealState && !hasShownRevealRef.current) {
    // Reveal never triggered (race condition). Go straight to celebration.
    const timer = setTimeout(() => setShowCelebration(true), 1000)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState])
```

Update the WinnerReveal rendering (line 643-648) to use the chained callback:
```tsx
{revealState && (
  <WinnerReveal
    winnerName={revealState.winnerName}
    entrant1Name={revealState.entrant1Name}
    entrant2Name={revealState.entrant2Name}
    onComplete={handleRevealComplete}
  />
)}
```

The same change should be applied to the student `DEVotingView` in
`src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` (lines 441-446)
to ensure consistent behavior. The student page happens to work because `bracketCompleted`
arrives via broadcast (not revalidation), and the timing is slightly different, but
the 4-second overlap bug exists there too.

**2. Make the fallback reveal more robust:**

Initialize `prevMatchupStatusRef` with the current matchup statuses on mount
so the first render doesn't miss transitions. Or, add a third detection path:
on initial mount, if `bracketCompleted` is already true (detected from the
initial fetch), trigger the reveal immediately.

```typescript
// Add after the existing bracketCompleted fallback effect:
useEffect(() => {
  // One-time check on mount: if bracket is already complete, show celebration
  if (bracketDone && !hasShownRevealRef.current) {
    const gf = currentMatchups.filter((m) => m.bracketRegion === 'grand_finals')
    const maxGfRound = gf.length > 0 ? Math.max(...gf.map((m) => m.round)) : 0
    const finalGf = gf.find((m) => m.round === maxGfRound && m.winner)
    if (finalGf?.winner) {
      hasShownRevealRef.current = true
      setRevealState({
        winnerName: finalGf.winner.name,
        entrant1Name: finalGf.entrant1?.name ?? 'TBD',
        entrant2Name: finalGf.entrant2?.name ?? 'TBD',
        entrant1Votes: 0,
        entrant2Votes: 0,
      })
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Intentionally empty deps: mount-only check
```

---

## Summary Table

| Issue | Root Cause | File:Line | Severity |
|-------|-----------|-----------|----------|
| 1. Partial round advance | Tied/zero-vote matchups silently skipped; error toast easily missed; no auto-tiebreak UI | `live-dashboard.tsx:410-444` | Low (UX confusion, not data loss) |
| 2. Tab resets to "winners" | `deRegion` useState resets on soft-refresh/remount; no auto-navigation to GF on completion | `live-dashboard.tsx:59` | Medium (disorienting after climactic moment) |
| 3. No winner animation | CelebrationScreen 4s timer stomps WinnerReveal 7.8s animation; celebration and reveal are independent timers that race | `live-dashboard.tsx:293-298` | High (students see it, teacher doesn't -- breaks shared classroom experience) |

## Files Involved

- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/teacher/live-dashboard.tsx` -- All three issues center here
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` -- Server component that renders LiveDashboard (confirmed: does NOT route away on completion)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/actions/bracket-advance.ts` -- `revalidatePath` triggers soft-refresh (Issues 2 & 3)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/hooks/use-realtime-bracket.ts` -- Broadcast + fetchBracketState timing (Issue 3)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/winner-reveal.tsx` -- Animation takes ~7.8 seconds total (Issue 3)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/components/bracket/celebration-screen.tsx` -- Overlays and stomps reveal at 4 seconds (Issue 3)
- `/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` -- Student DE view (works but has same latent timing bug)

## Eliminated Hypotheses

- hypothesis: "advanceMatchup server action fails silently for some matchups"
  evidence: The server action returns success and matchups do advance; it's the
  client filtering that skips tied ones. Confirmed by user report that second
  press works.
  timestamp: 2026-02-02

- hypothesis: "DE region tab is overwritten by some effect or computed value"
  evidence: `deRegion` is plain useState with no setter called programmatically
  except the tab button onClick. The reset only happens at initial value,
  pointing to remount not programmatic override.
  timestamp: 2026-02-02

- hypothesis: "WinnerReveal component itself is broken"
  evidence: Student page uses the identical `WinnerReveal` component and it works
  correctly. The component is fine; the issue is that it's never rendered on the
  teacher page (revealState is never set to a non-null value).
  timestamp: 2026-02-02

- hypothesis: "Page server component routes away from LiveDashboard when bracket completes"
  evidence: Verified `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` lines
  42-43: comment explicitly says "Allow 'active' AND 'completed'" and only redirects
  on 'draft' status. LiveDashboard is always rendered. The issue is client-side timing.
  timestamp: 2026-02-02

- hypothesis: "The status-transition detection never fires on the teacher page"
  evidence: In the non-reset GF case (WB champion wins GF1), the detection SHOULD
  fire because prevMatchupStatusRef has 'voting' and the matchup transitions to
  'decided'. The reveal IS triggered -- but CelebrationScreen appears 4 seconds
  later and covers it, making it appear as if no animation was shown.
  timestamp: 2026-02-02
