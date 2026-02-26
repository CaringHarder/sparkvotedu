---
status: diagnosed
trigger: "Celebration countdown loops infinitely on student bracket (RR) and poll pages"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: RRLiveView has no hasShownRevealRef guard, so after CelebrationScreen auto-dismisses (sets showCelebration=false), the useEffect re-fires because all conditions are met again. Poll page appears safe due to prevPollStatusRef guard.
test: Traced all state transitions through the full celebration lifecycle
expecting: After CelebrationScreen dismisses, bracketCompleted=true && !revealState && !showCelebration re-triggers the countdown
next_action: Write findings and fix recommendation

## Symptoms

expected: Countdown fires once (3-2-1), celebration screen shows, user dismisses or auto-dismiss, done.
actual: On RR bracket page, countdown fires, celebration shows, then after celebration dismisses (auto-dismiss at 12s or Continue click), countdown fires again, ad infinitum.
errors: No errors -- behavioral loop
reproduction: 1. Teacher completes a round-robin bracket. 2. Student is on the bracket page. 3. bracketCompleted fires via realtime. 4. Countdown plays, celebration shows. 5. After 12 seconds or clicking Continue, celebration dismisses. 6. 2 seconds later, countdown starts again. Repeat.
started: Since celebration/reveal was added to RRLiveView

## Eliminated

(none -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-23T00:01:00Z
  checked: RRLiveView useEffect at lines 589-609 of bracket/[bracketId]/page.tsx
  found: |
    The effect condition is: `bracketCompleted && !revealState && !showCelebration`
    Dependencies: `[bracketCompleted, revealState, showCelebration, currentMatchups]`

    After CelebrationScreen auto-dismisses (12s timer) or user clicks Continue:
    - onDismiss callback (line 696) sets `showCelebration = false`
    - At this point: bracketCompleted=true, revealState=null, showCelebration=false
    - ALL THREE conditions are met again
    - The useEffect fires, sets a 2s timeout, then sets revealState again
    - This restarts the entire countdown -> celebration cycle

    There is NO `hasShownRevealRef` guard in RRLiveView (unlike DEVotingView which has one at line 420).
  implication: This is the root cause for the RR bracket infinite loop.

- timestamp: 2026-02-23T00:02:00Z
  checked: DEVotingView useEffect at lines 447-461 of bracket/[bracketId]/page.tsx
  found: |
    DEVotingView uses `hasShownRevealRef` (line 420) which is set to true on line 453
    before the reveal fires. Both the main effect (line 448) and the fallback effect
    (line 471) check `!hasShownRevealRef.current`, preventing re-triggering after
    celebration dismissal. This pattern is CORRECT and prevents the loop.
  implication: DEVotingView is NOT affected. Only RRLiveView is missing the guard.

- timestamp: 2026-02-23T00:03:00Z
  checked: Poll page useEffect at lines 77-92 of poll/[pollId]/page.tsx
  found: |
    Uses `prevPollStatusRef` to track previous pollStatus value. The guard on line 85
    `prev !== 'closed'` ensures the countdown only triggers on the active->closed
    TRANSITION, not when pollStatus is re-set to 'closed' by polling refetches.

    Additionally, `closedDetected` state (line 310) gates the UI to show a static
    "poll closed" view after reveal dismisses, preventing any re-trigger path.

    Traced all re-render scenarios (polling fallback, WebSocket reconnect):
    - setPollStatus('closed') when already 'closed' = React bails out (same value)
    - Even if effect re-runs, prevPollStatusRef.current is already 'closed', guard fails
  implication: Poll page is NOT affected by infinite loop. The ref-based guard works correctly.

- timestamp: 2026-02-23T00:04:00Z
  checked: WinnerReveal component (winner-reveal.tsx)
  found: |
    Stateless countdown component. 3-2-1 then calls onComplete. No internal loop
    mechanism. The loop is caused by the PARENT re-mounting WinnerReveal by toggling
    revealState back to non-null after celebration dismisses.
  implication: WinnerReveal itself is fine. The bug is in how RRLiveView manages the state lifecycle.

- timestamp: 2026-02-23T00:05:00Z
  checked: currentMatchups dependency in RRLiveView effect
  found: |
    `currentMatchups` comes from `useRealtimeBracket` which creates a NEW array reference
    on every fetchBracketState call (line 74 of use-realtime-bracket.ts: `setMatchups(data.matchups)`).

    In polling fallback mode, fetchBracketState runs every 3 seconds, creating new array refs.
    On WebSocket, bracket_update events trigger refetch. Either way, the dependency changes
    frequently, causing the effect to re-evaluate even when the logical state hasn't changed.

    This means even WITHOUT the celebration dismiss cycle, the effect re-runs frequently.
    The only thing preventing the loop is the condition check -- which fails once
    celebration is dismissed (all conditions become true again).
  implication: The currentMatchups dependency makes the effect even more volatile, but the fundamental issue is the missing "already shown" guard.

## Resolution

root_cause: |
  RRLiveView (round-robin student bracket) is missing a `hasShownRevealRef` guard
  on its celebration trigger useEffect (lines 589-609). After CelebrationScreen
  dismisses (setting showCelebration=false), the effect condition
  `bracketCompleted && !revealState && !showCelebration` becomes true again,
  re-triggering the countdown -> celebration cycle infinitely.

  DEVotingView (double-elimination) correctly uses `hasShownRevealRef` to prevent
  this. The poll page correctly uses `prevPollStatusRef` to prevent this. Only
  RRLiveView is missing the equivalent guard.

fix: |
  Add a `hasShownRevealRef` to RRLiveView, matching the DEVotingView pattern:

  1. Add ref: `const hasShownRevealRef = useRef(false)`
  2. Add guard to the useEffect condition: `if (bracketCompleted && !revealState && !showCelebration && !hasShownRevealRef.current)`
  3. Set ref before triggering: `hasShownRevealRef.current = true` inside the setTimeout callback (or before it)

  Specific code change in RRLiveView (lines 546-609):

  ```tsx
  // ADD this ref (after line 558):
  const hasShownRevealRef = useRef(false)

  // CHANGE the useEffect condition (line 590):
  // FROM:
  if (bracketCompleted && !revealState && !showCelebration) {
  // TO:
  if (bracketCompleted && !revealState && !showCelebration && !hasShownRevealRef.current) {

  // ADD inside the setTimeout callback (before setRevealState, ~line 605):
  hasShownRevealRef.current = true
  ```

verification: (not yet applied)
files_changed: []
