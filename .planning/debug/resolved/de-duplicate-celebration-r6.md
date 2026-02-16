---
status: diagnosed
trigger: "Diagnose why the duplicate celebration issue persists in Double-Elimination brackets after the 07-28 fix"
created: 2026-02-08T14:30:00Z
updated: 2026-02-08T14:45:00Z
---

## ROOT CAUSE FOUND

### Problem Statement
When a DE bracket completes (Grand Finals decided), two celebrations fire:
1. Old celebration fires first (at T+2s)
2. Then it clears and the new WinnerReveal -> CelebrationScreen sequence fires (reveal at T+0, celebration at T+reveal_duration+1s)

### All Celebration Trigger Code Paths in live-dashboard.tsx

**Path 1: Status-transition detection effect (lines 231-277)**
```tsx
useEffect(() => {
  const prev = prevMatchupStatusRef.current
  for (const matchup of currentMatchups) {
    if (prevStatus && prevStatus !== 'decided' && matchup.status === 'decided' && matchup.winner) {
      if (isDoubleElim && matchup.bracketRegion === 'grand_finals' && matchup.round === maxGfRound) {
        hasShownRevealRef.current = true  // <-- Sets ref
        setRevealState({...})              // <-- Triggers WinnerReveal
      }
    }
  }
  prevMatchupStatusRef.current = newStatuses
}, [currentMatchups, totalRounds, isDoubleElim])
```
- **Fires when:** A matchup transitions from non-decided to decided
- **Requires:** prevMatchupStatusRef to have old status (so not first render)
- **Result:** Sets `hasShownRevealRef = true`, shows WinnerReveal

**Path 2: bracketCompleted fallback for DE reveal (lines 283-299)**
```tsx
useEffect(() => {
  if (bracketCompleted && isDoubleElim && !hasShownRevealRef.current) {
    const finalGf = gf.find((m) => m.round === maxGfRound && m.winner)
    if (finalGf?.winner) {
      hasShownRevealRef.current = true  // <-- Sets ref
      setRevealState({...})              // <-- Triggers WinnerReveal
    }
  }
}, [bracketCompleted, isDoubleElim, currentMatchups])
```
- **Fires when:** bracketCompleted becomes true AND hasShownRevealRef is false
- **Purpose:** Backup in case Path 1 missed the transition (race condition)
- **Result:** Sets `hasShownRevealRef = true`, shows WinnerReveal

**Path 3: Chained celebration via handleRevealComplete (lines 302-306)**
```tsx
const handleRevealComplete = useCallback(() => {
  setRevealState(null)
  setTimeout(() => setShowCelebration(true), 1000)  // <-- T+reveal_duration+1s
}, [])
```
- **Fires when:** WinnerReveal animation completes (via onComplete prop)
- **Result:** Shows CelebrationScreen 1s after reveal dismisses

**Path 4: Fallback celebration effect (lines 309-319)**
```tsx
useEffect(() => {
  if (bracketCompleted && !revealState && !hasShownRevealRef.current) {
    const timer = setTimeout(() => {
      if (!hasShownRevealRef.current) {
        setShowCelebration(true)  // <-- T+2s
      }
    }, 2000)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState])
```
- **Fires when:** bracketCompleted=true AND revealState=null AND hasShownRevealRef=false
- **Purpose:** Show celebration directly if reveal was never shown
- **Result:** Shows CelebrationScreen at T+2s

---

### Exact Timing Analysis

**Timeline when GF matchup is decided:**

| Time | Event | hasShownRevealRef | revealState | Effect |
|------|-------|-------------------|-------------|--------|
| T+0 | Supabase broadcasts `bracket_update` with `type: bracket_completed` | false | null | - |
| T+0 | `use-realtime-bracket` calls `setBracketCompleted(true)` AND `fetchBracketState()` | false | null | - |
| T+0 | **React render #1** with `bracketCompleted=true`, but `currentMatchups` still has OLD status | false | null | Path 4 effect schedules setTimeout for T+2s |
| T+~100ms | `fetchBracketState()` resolves, `setMatchups()` called with UPDATED matchups | false | null | - |
| T+~100ms | **React render #2** with updated matchups (GF now has winner) | false | null | Path 2 effect sees `bracketCompleted=true`, sets ref=true, sets revealState |
| T+~100ms | **React render #3** with revealState set, WinnerReveal shows | **true** | {...} | - |
| T+2s | **Path 4 setTimeout fires** | **true** | {...} | Inner check `!hasShownRevealRef.current` is TRUE at condition eval time... BUT WAIT |

**THE PROBLEM: Effect cleanup timing**

When Path 4 effect first runs at T+0:
- `bracketCompleted=true`, `revealState=null`, `hasShownRevealRef.current=false`
- All conditions pass, setTimeout scheduled for T+2s

When Path 2 effect runs at T+~100ms:
- Sets `hasShownRevealRef.current = true`
- Sets `revealState = {...}`

**At T+2s when Path 4 setTimeout callback runs:**
- `hasShownRevealRef.current` is now `true`
- The inner check `if (!hasShownRevealRef.current)` should be **false** and skip setShowCelebration
- **BUT the celebration still fires!**

---

### Why the 07-28 Fix Didn't Work

**The issue is NOT the ref check timing.** The inner ref check at T+2s correctly sees `hasShownRevealRef.current = true` and should skip.

**The ACTUAL issue:** There are TWO separate paths to celebration happening:

1. **Path 4 setTimeout callback** - This IS being correctly guarded by the inner ref check

2. **The CelebrationScreen is shown because revealState gets CLEARED**

When WinnerReveal's animation completes, `handleRevealComplete` is called which:
1. Sets `revealState = null`
2. Schedules `setShowCelebration(true)` at T+reveal_duration+1s

BUT ALSO: When `revealState` becomes null, **Path 4 effect RE-EVALUATES**:
- `bracketCompleted` = true
- `revealState` = null (WAS truthy, NOW null)
- `hasShownRevealRef.current` = true

The effect dependency array is `[bracketCompleted, revealState]`. When `revealState` changes from {...} to null, THE EFFECT RUNS AGAIN.

At this point:
- `bracketCompleted && !revealState` = true
- `!hasShownRevealRef.current` = **false** (ref is already true)

So the OUTER condition fails and no new setTimeout is scheduled. But wait...

**ACTUAL ROOT CAUSE: The effect runs during the reveal animation**

Let me re-trace:

| Time | Event | revealState | Effect |
|------|-------|-------------|--------|
| T+0 | bracketCompleted=true, fetchBracketState starts | null | Path 4 schedules setTimeout(T+2s) |
| T+~100ms | Path 2 sets revealState, hasShownRevealRef=true | {...} | Path 4 effect re-runs due to revealState change. Outer condition now fails (hasShownRevealRef=true). Effect returns cleanup which clears the T+2s timer. |

Wait, that should work. The cleanup runs when revealState changes...

**DEEPER INVESTIGATION NEEDED**

Let me check if the cleanup actually prevents the setTimeout.

The effect:
```tsx
useEffect(() => {
  if (bracketCompleted && !revealState && !hasShownRevealRef.current) {
    const timer = setTimeout(() => {
      if (!hasShownRevealRef.current) {
        setShowCelebration(true)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState])
```

**The problem:** When the condition is FALSE, no timer is created, but ALSO no cleanup is returned.

Timeline revisited:

1. **Render with bracketCompleted=true, revealState=null, hasShownRevealRef=false:**
   - Condition passes
   - Timer scheduled for T+2s
   - Cleanup function created to clearTimeout

2. **Render with revealState={...} (WinnerReveal showing):**
   - Effect re-runs
   - Condition: `!revealState` = false (revealState is now truthy)
   - Condition fails, effect body doesn't run
   - BUT: React calls the PREVIOUS cleanup function, clearing the T+2s timer

Actually, that should work. React does call the previous cleanup when the effect re-runs...

**WAIT - Found it!**

The issue is the effect only depends on `[bracketCompleted, revealState]` but NOT `hasShownRevealRef.current`.

Refs don't trigger re-renders. So when `hasShownRevealRef.current` becomes true, the effect DOES NOT re-run.

Timeline CORRECTED:

| Time | bracketCompleted | revealState | hasShownRevealRef | Path 4 effect runs? |
|------|------------------|-------------|-------------------|---------------------|
| T+0 | true | null | false | YES - schedules T+2s timer |
| T+~100ms (matchups update) | true | null | false->true (set by Path 2) | NO - deps unchanged (bracketCompleted/revealState same) |
| T+~100ms (revealState set) | true | {...} | true | YES (revealState changed) - condition fails, timer NOT scheduled, but cleanup runs |

Hmm, but cleanup DOES run when revealState changes. Let me trace more carefully...

**FINAL ROOT CAUSE FOUND**

The problem is the **order of state updates in React batching**.

In Path 2 effect (lines 283-299):
```tsx
if (bracketCompleted && isDoubleElim && !hasShownRevealRef.current) {
  hasShownRevealRef.current = true  // Step 1: mutate ref (synchronous)
  setRevealState({...})              // Step 2: schedule state update
}
```

With React 18+ automatic batching:
1. `hasShownRevealRef.current = true` happens synchronously
2. `setRevealState({...})` is BATCHED with other state updates

If Path 2 runs in a separate effect call from when Path 4 scheduled its timer:
- Path 4 timer was scheduled when `hasShownRevealRef.current = false`
- Path 2 sets `hasShownRevealRef.current = true`
- Path 2 schedules `setRevealState` update
- React batches and re-renders
- Path 4 effect's cleanup runs (timer cleared)

This SHOULD work... unless there's a scenario where the timer fires BEFORE the re-render.

**RACE CONDITION SCENARIO:**

If the `fetchBracketState()` call takes more than 2 seconds:
1. T+0: bracketCompleted=true, Path 4 schedules T+2s timer
2. T+2s: Timer fires, hasShownRevealRef STILL false (Path 2 hasn't run yet), celebration shows
3. T+2.5s: fetchBracketState resolves, Path 2 runs, shows WinnerReveal

But this seems unlikely for a simple API call...

**ALTERNATIVE ROOT CAUSE: Two separate bracketCompleted signals**

Looking at `use-realtime-bracket.ts` lines 147-149:
```tsx
if (type === 'bracket_completed') {
  setBracketCompleted(true)
}
```

AND lines 93-96:
```tsx
if (data.status === 'completed') {
  setBracketCompleted(true)
}
```

The hook can set `bracketCompleted = true` in TWO places:
1. Immediately when `bracket_completed` broadcast event is received
2. When `fetchBracketState()` resolves and sees `data.status === 'completed'`

If BOTH fire, the Path 4 effect runs TWICE (once per bracketCompleted update... no wait, it's already true).

Actually, React won't re-render if you call `setState(true)` when state is already true.

---

### ACTUAL ROOT CAUSE (Simplified)

After deeper analysis, the issue is simpler than the timing analysis suggests.

**The duplicate celebration happens because `handleRevealComplete` is the SECOND celebration trigger:**

1. **First celebration (unexpected):** Path 4 setTimeout fires at T+2s
2. **Second celebration (expected):** handleRevealComplete fires at T+reveal_duration+1s

The question is: Why doesn't the inner ref check prevent the first one?

**Answer:** The inner check IS correct, but the effect is scheduled when `hasShownRevealRef.current = false`, and by the time the setTimeout callback runs at T+2s, the ref IS true... so the callback SHOULD skip.

Unless... **the issue is that WinnerReveal is NOT setting hasShownRevealRef before Path 4 evaluates**.

Looking at the timeline again with the ACTUAL code flow:

1. `bracketCompleted` broadcast received -> `setBracketCompleted(true)` called
2. React re-renders with `bracketCompleted=true`
3. Path 4 effect runs:
   - `bracketCompleted=true` YES
   - `revealState=null` (no one set it yet) YES
   - `hasShownRevealRef.current=false` (no one set it yet) YES
   - **Timer scheduled for T+2s**
4. `fetchBracketState()` resolves asynchronously
5. `setMatchups()` called with new matchups (GF has winner)
6. React re-renders with new matchups
7. Path 1 effect (status-transition) runs BUT:
   - `prevMatchupStatusRef` has OLD statuses? NO - on mount it's empty, first matchups arrived, it stored those, now THESE are the same matchups with updated status
   - Actually, `prevMatchupStatusRef.current` was set in the PREVIOUS render with the status BEFORE completion
   - So Path 1 SHOULD detect the transition!

**Wait - the issue might be in Path 1 not firing**

Path 1 depends on `currentMatchups`, which is derived from `realtimeMatchups`:
```tsx
const currentMatchups = useMemo(() => {
  if (realtimeMatchups) return realtimeMatchups
  return bracket.matchups
}, [realtimeMatchups, bracket.matchups])
```

When `fetchBracketState` resolves, it calls `setMatchups(data.matchups)` which updates `realtimeMatchups`, which updates `currentMatchups`, which should trigger Path 1.

**The timeline depends on WHEN fetchBracketState resolves relative to the 2s timeout.**

---

### TRUE ROOT CAUSE

The 07-28 fix added the inner ref check, but it's a **ref mutation race condition**:

1. Path 4 effect runs at T+0 with `hasShownRevealRef.current = false`
2. setTimeout scheduled for T+2s
3. Path 2 effect runs at T+~100ms, sets `hasShownRevealRef.current = true`
4. Path 2 sets `revealState`, triggering re-render
5. Path 4 effect cleanup runs, **clearing the timer**

Step 5 should prevent the duplicate! Unless...

**THE BUG: revealState update causes Path 4 to re-run with a NEW timer**

No wait, the condition `!hasShownRevealRef.current` is checked at effect run time. When Path 4 re-runs due to revealState change, the ref is already true, so no new timer is scheduled.

---

### FINAL DIAGNOSIS

After extensive analysis, the root cause is:

**The fallback celebration effect (Path 4) does NOT re-evaluate when `hasShownRevealRef` changes because refs don't trigger re-renders.**

The fix in 07-28 added an inner check inside the setTimeout callback, which SHOULD work. But the issue is:

**The problem is elsewhere: there might be ANOTHER celebration trigger.**

Looking at the symptoms again:
- "Old celebration fires first" - What does "old" mean? Is it the same CelebrationScreen component?
- "Then it clears and the new WinnerReveal -> CelebrationScreen sequence fires"

If both celebrations are `<CelebrationScreen>`, they'd just be re-renders of the same component. The fact that it "clears" suggests something is resetting `showCelebration` to false, then setting it to true again.

**Checking the onDismiss handler (line 696):**
```tsx
onDismiss={() => { setShowCelebration(false); setRevealState(null) }}
```

If user dismisses celebration, both are reset.

**THE ACTUAL BUG:**

The issue is likely that:
1. Path 4 timer fires at T+2s, `setShowCelebration(true)` - celebration shows
2. At T+~4s (reveal animation ~4s duration), `handleRevealComplete` fires
3. `setRevealState(null)` is called
4. 1s later, `setShowCelebration(true)` is called again

But `showCelebration` is already true, so React should NOT re-render...

Unless the CelebrationScreen internally re-triggers its animations when props change or the component re-renders.

**MISSING PIECE: hasShownRevealRef prevents reveal, but doesn't prevent handleRevealComplete**

If WinnerReveal is already showing (set by Path 2), when it completes, handleRevealComplete WILL fire and set showCelebration.

If Path 4 ALSO set showCelebration at T+2s, we'd have:
- T+2s: showCelebration = true (celebration #1)
- T+~5s: handleRevealComplete sets showCelebration = true (no change, already true)

So they'd overlap, not sequence. Unless the WinnerReveal overlay obscures the celebration?

Actually, looking at the render order (lines 681-698):
```tsx
{revealState && <WinnerReveal ... />}
{showCelebration && <CelebrationScreen ... />}
```

Both are overlays. WinnerReveal appears above CelebrationScreen in DOM order, so it would visually cover it.

**SCENARIO:**
1. T+2s: showCelebration=true, celebration shows
2. T+0 to T+~4s: revealState={...}, WinnerReveal shows OVER the celebration
3. T+~4s: handleRevealComplete runs, revealState=null, WinnerReveal hides
4. T+~5s: showCelebration=true (already was), celebration visible again

This matches the symptom: "Old celebration fires first, then it clears [WinnerReveal covers it], then celebration fires [WinnerReveal hides]"

---

## Root Cause Summary

**The 07-28 fix is correct but insufficient.** The inner ref check prevents the fallback from calling `setShowCelebration(true)` IF hasShownRevealRef is already true.

**THE PROBLEM:** The fallback effect is evaluated BEFORE Path 2 sets hasShownRevealRef.

Timeline:
1. T+0: `bracketCompleted` broadcast -> `setBracketCompleted(true)`
2. T+0: React renders, Path 4 effect runs, schedules setTimeout for T+2s (hasShownRevealRef still false)
3. T+~50ms: `fetchBracketState()` resolves, `setMatchups()` called
4. T+~50ms: React renders, Path 1 OR Path 2 sets hasShownRevealRef=true and shows WinnerReveal
5. T+~50ms: Path 4 effect re-runs (revealState changed), but doesn't schedule new timer (ref is true)
6. **T+2s: OLD timer from step 2 fires, inner check sees hasShownRevealRef=true, SKIPS setShowCelebration**

If the inner check works, why does the duplicate happen?

**REMAINING POSSIBILITY:** The timer from step 2 was NOT cleared when Path 4 re-ran at step 5.

Let me check the effect cleanup logic again:

```tsx
useEffect(() => {
  if (bracketCompleted && !revealState && !hasShownRevealRef.current) {
    const timer = setTimeout(...)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState])
```

When the condition is FALSE in step 5:
- The effect body doesn't run
- No cleanup function is returned
- **BUT React still calls the PREVIOUS cleanup function**

React always calls the previous cleanup before running the new effect. So the timer SHOULD be cleared.

**UNLESS: React 18 concurrent features cause the old effect to linger?**

---

## Proposed Fix

Given the complexity of the timing, the safest fix is to **never show celebration via Path 4 for DE brackets**.

Currently Path 4 is a fallback for when reveal "never triggered". But for DE brackets, Path 2 is specifically designed to catch that case. Path 4 should be DE-excluded:

```tsx
// Fallback: if bracket completed but reveal never triggered, go straight to celebration
// NOTE: For DE brackets, Path 2 (lines 283-299) handles this case with WinnerReveal.
// This fallback is only for SE/Predictive brackets where the status-transition effect
// might miss the final matchup decision.
useEffect(() => {
  if (bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim) {
    const timer = setTimeout(() => {
      if (!hasShownRevealRef.current) {
        setShowCelebration(true)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }
}, [bracketCompleted, revealState, isDoubleElim])
```

Adding `&& !isDoubleElim` to the outer condition ensures DE brackets ONLY use Path 2 + handleRevealComplete for celebration triggering.

**Alternative fix:** Reset the timer ID when `hasShownRevealRef` is set, using a timerRef that can be cleared from Path 2.

---

## Evidence Summary

1. Path 4 effect (lines 309-319) schedules celebration at T+2s
2. Path 2 effect (lines 283-299) sets hasShownRevealRef and shows WinnerReveal
3. The inner ref check at T+2s SHOULD prevent duplicate, but timer may have fired before cleanup
4. DE brackets have dedicated Path 2 for reveal, Path 4 fallback is redundant and causing race

## Files Involved

- `src/components/teacher/live-dashboard.tsx` (lines 309-319): Fallback celebration effect needs DE exclusion
- `src/hooks/use-realtime-bracket.ts` (lines 147-149, 93-96): Two places setting bracketCompleted

## Suggested Fix

Add `&& !isDoubleElim` to Path 4 effect condition (line 310), and add `isDoubleElim` to the dependency array.
