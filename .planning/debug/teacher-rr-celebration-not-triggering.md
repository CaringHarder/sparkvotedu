---
status: diagnosed
trigger: "Teacher RR Bracket Celebration Not Triggering -- bracketDone never evaluates to true for RR brackets on teacher view"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: Celebration useEffect timer is cancelled by a race condition between two fetchBracketState calls, and hasShownRevealRef prevents rescheduling
test: Traced full signal chain from server-side recordResult through realtime hook to useEffect at line 325
expecting: N/A - diagnosis complete
next_action: Return findings

## Symptoms

expected: When all RR matchups are decided, teacher live-dashboard shows countdown then celebration with the RR champion
actual: Teacher live-dashboard never shows countdown or celebration for RR brackets -- stays on standings/matchups view
errors: None (behavioral bug, not a crash)
reproduction: Complete all rounds of a round-robin bracket on teacher view and observe -- no celebration fires
started: Since celebration flow was added for RR brackets

## Eliminated

- hypothesis: "bracketDone is not computed correctly for RR"
  evidence: |
    The 24-04 fix at lines 792-799 correctly computes bracketDone for RR:
      rrAllDecided = currentMatchups.length > 0 && currentMatchups.every(m => m.status === 'decided')
      bracketDone = isRoundRobin ? rrAllDecided : ...
    However, bracketDone is ONLY used for UI elements ("Complete!" badge, hiding buttons).
    It is NOT used to trigger the celebration chain. The celebration depends on `bracketCompleted` from useRealtimeBracket.
  timestamp: 2026-02-23T00:01:00Z

- hypothesis: "bracketCompleted never fires for RR brackets"
  evidence: |
    Server-side recordResult (src/actions/round-robin.ts lines 50-63) correctly:
    1. Calls isRoundRobinComplete which checks all matchups are 'decided'
    2. Updates bracket status to 'completed' via Prisma
    3. Broadcasts 'bracket_completed' event
    The realtime hook (use-realtime-bracket.ts lines 134-153) correctly:
    1. Listens for 'bracket_completed' broadcast type
    2. Calls fetchBracketState() which fetches bracket status
    3. Sets bracketCompleted = true (both via broadcast event and via fetched status check)
    So bracketCompleted DOES become true. The problem is downstream.
  timestamp: 2026-02-23T00:02:00Z

- hypothesis: "The useEffect at line 325 has wrong guard conditions for RR"
  evidence: |
    Guard: bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim
    For RR: bracketCompleted=true, revealState=null (never set via Path A/B),
    hasShownRevealRef.current=false (initially), !isDoubleElim=true.
    All conditions pass on the first run. The conditions themselves are correct.
  timestamp: 2026-02-23T00:03:00Z

## Evidence

- timestamp: 2026-02-23T00:01:00Z
  checked: bracketDone computation vs celebration trigger
  found: |
    bracketDone (line 795-799) is used ONLY in JSX for:
    - Line 965: hiding predictive manual hint when done
    - Line 972: hiding sports hint when done
    - Line 999: hiding "Next Round" button when done
    - Line 1057: showing "Complete!" badge
    bracketDone is NOT used in any useEffect to trigger celebration.
    The celebration chain depends on `bracketCompleted` from useRealtimeBracket hook.
  implication: The 24-04 fix to bracketDone was necessary for the UI badge but does NOT fix the celebration.

- timestamp: 2026-02-23T00:02:00Z
  checked: Server-side completion signal chain for RR
  found: |
    recordResult (src/actions/round-robin.ts):
    1. Calls recordRoundRobinResult -> broadcasts 'winner_selected' (line 147-150 in round-robin.ts DAL)
    2. Calls isRoundRobinComplete -> queries ALL matchups, returns winner ID if all decided
    3. If complete: updates bracket status to 'completed', broadcasts 'bracket_completed'

    The broadcast events arrive in the realtime hook in this order:
    1. 'winner_selected' -> triggers fetchBracketState() [bracket may still be 'active' at this point]
    2. 'bracket_completed' -> triggers fetchBracketState() AND setBracketCompleted(true)
  implication: Two fetchBracketState calls happen in quick succession (10-50ms apart)

- timestamp: 2026-02-23T00:03:00Z
  checked: useEffect at lines 325-369 -- celebration trigger for RR/SE
  found: |
    The effect body:
    ```
    if (bracketCompleted && !revealState && !hasShownRevealRef.current && !isDoubleElim) {
        hasShownRevealRef.current = true  // <-- SET SYNCHRONOUSLY BEFORE TIMER
        const timer = setTimeout(() => {
            setRevealState({ ... })       // <-- FIRES AFTER 2 SECONDS
        }, 2000)
        return () => clearTimeout(timer)  // <-- CLEANUP CANCELS TIMER
    }
    ```
    Dependencies: [bracketCompleted, revealState, isDoubleElim, isRoundRobin, currentMatchups, totalRounds]

    The `currentMatchups` dependency is the problem. When the second fetchBracketState resolves
    (from the 'bracket_completed' event), it calls setMatchups() with a new array reference.
    This triggers the currentMatchups useMemo to return a new reference.
    React detects the dependency change and re-runs the effect:
    1. Cleanup from previous run fires: clearTimeout(timer) -- TIMER CANCELLED
    2. Effect body re-runs: hasShownRevealRef.current is already true
    3. Guard condition fails: !hasShownRevealRef.current is false
    4. No new timer scheduled -- revealState NEVER gets set
  implication: ROOT CAUSE CONFIRMED -- race condition between ref set and timer execution

- timestamp: 2026-02-23T00:04:00Z
  checked: Event sequence causing the race
  found: |
    Timeline of events when teacher decides last RR matchup:
    1. recordRoundRobinResult broadcasts 'winner_selected'
    2. Hook receives event, calls fetchBracketState() [Fetch A starts]
    3. recordResult's isRoundRobinComplete detects completion
    4. Bracket status updated to 'completed', broadcasts 'bracket_completed'
    5. Hook receives event, calls fetchBracketState() [Fetch B starts], setBracketCompleted(true)
    6. React batches: bracketCompleted=true, matchups from Fetch A (or pending)
    7. useEffect runs: guard passes, hasShownRevealRef=true, timer scheduled (2s)
    8. Fetch B resolves: setMatchups(newData) -- new array reference
    9. currentMatchups useMemo returns new ref, effect dependency changes
    10. React re-runs effect: cleanup cancels timer, guard fails due to ref
    11. revealState never set, WinnerReveal never renders, celebration never shows

    The critical window is between step 7 (timer scheduled) and step 8 (Fetch B resolves).
    Since Fetch B is a network call (~50-200ms) and the timer is 2000ms, the fetch almost
    always resolves within the timer window, cancelling it.
  implication: This race condition is nearly deterministic -- it will fail almost every time

- timestamp: 2026-02-23T00:05:00Z
  checked: championName computation for RR (secondary issue)
  found: |
    Lines 389-401:
    ```
    const championName = useMemo(() => {
        if (isDoubleElim) { ... DE logic ... }
        const finalMatchup = currentMatchups.find(
            (m) => m.round === totalRounds && m.position === 1
        )
        return finalMatchup?.winner?.name ?? 'Champion'
    }, ...)
    ```
    For RR, totalRounds=1 (hardcoded in server page.tsx line 87).
    RR matchups have round=roundNumber (1,2,3...) and position=globalPosition (1,2,3...).
    So this looks for m.round===1 && m.position===1, which finds the first matchup
    of round 1 -- NOT the overall RR champion.

    The CelebrationScreen at line 816-820 uses this championName.
    Even if the celebration DID fire, it would show the wrong champion name for RR.
  implication: Secondary bug -- championName needs RR-specific logic (compute from standings)

## Resolution

root_cause: |
  PRIMARY: Race condition in celebration-trigger useEffect (lines 325-369)

  The useEffect sets `hasShownRevealRef.current = true` synchronously BEFORE scheduling
  a 2-second timer that calls `setRevealState()`. The effect's dependency array includes
  `currentMatchups`. When a second `fetchBracketState()` call resolves (triggered by the
  'bracket_completed' broadcast arriving ~50ms after 'winner_selected'), `setMatchups()`
  creates a new array reference, which changes `currentMatchups` via useMemo, which
  triggers the effect to re-run. React's effect cleanup cancels the timer. The re-run
  fails the `!hasShownRevealRef.current` guard because the ref was already set. The timer
  is never rescheduled, `revealState` is never set, and WinnerReveal/CelebrationScreen
  never render.

  This bug affects ALL bracket types that use this fallback path (SE and RR), but is
  most reliably triggered for RR because recordResult always generates two rapid-fire
  broadcasts: 'winner_selected' followed by 'bracket_completed'.

  SECONDARY: championName (lines 389-401) has no RR-specific logic.
  For RR it falls through to the SE path which looks for round===totalRounds (which is 1
  for RR) and position===1. This finds the first matchup of round 1 rather than the
  actual RR champion. Even if the celebration fired, it would display the wrong name.

fix: |
  FIX 1: Move hasShownRevealRef.current = true INSIDE the setTimeout callback,
  just before setRevealState(). This ensures:
  - If cleanup cancels the timer, the ref is NOT yet set
  - The re-run of the effect will pass the guard and schedule a new timer
  - Only when the timer actually fires does the ref get set (preventing double-fire)

  Alternatively, remove `currentMatchups` from the dependency array and capture it
  via a ref, but that's a bigger refactor and less idiomatic.

  Simplest fix (line 327):
  BEFORE:
    hasShownRevealRef.current = true
    const timer = setTimeout(() => { ... }, 2000)
  AFTER:
    const timer = setTimeout(() => {
      hasShownRevealRef.current = true
      // ... rest of callback
    }, 2000)

  FIX 2: Add RR-specific championName logic (lines 389-401):
  ```
  const championName = useMemo(() => {
      if (isDoubleElim) { ... }
      if (isRoundRobin) {
          // Compute champion from matchup wins (same logic as line 335-344)
          const wins = new Map<string, { count: number; name: string }>()
          for (const m of currentMatchups) {
              if (m.status === 'decided' && m.winner) {
                  const prev = wins.get(m.winner.id) ?? { count: 0, name: m.winner.name }
                  wins.set(m.winner.id, { count: prev.count + 1, name: m.winner.name })
              }
          }
          const sorted = [...wins.entries()].sort((a, b) => b[1].count - a[1].count)
          return sorted[0]?.[1].name ?? 'Champion'
      }
      // SE fallback
      const finalMatchup = currentMatchups.find(...)
      return finalMatchup?.winner?.name ?? 'Champion'
  }, [currentMatchups, totalRounds, isDoubleElim, isRoundRobin])
  ```

verification: (diagnosis only - not verified)
files_changed: []

## Files Requiring Changes

1. **src/components/teacher/live-dashboard.tsx**
   - Line 327: Move `hasShownRevealRef.current = true` inside the setTimeout callback (BEFORE setRevealState)
   - Lines 389-401: Add `isRoundRobin` branch to championName useMemo that computes winner from matchup wins
   - Add `isRoundRobin` to championName dependency array

2. No other files need changes for this specific bug.
