---
status: diagnosed
trigger: "When a teacher closes a poll, the student poll page just shows 'This poll has been closed' with no countdown or winner reveal/celebration. The teacher view works correctly."
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Early return on closedDetected short-circuits rendering before countdown/reveal overlays are reached
test: Traced the render logic through all state transitions
expecting: N/A - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: When a teacher closes a poll, the student poll page should show a countdown (WinnerReveal 3-2-1), then a winner celebration (PollReveal with confetti), then finally the "poll closed" state with the winner name.
actual: Student page immediately shows "This poll has been closed" text with no countdown or celebration animation.
errors: No errors - the page renders without crashing, just shows the wrong UI.
reproduction: Teacher opens poll live view, student opens the same poll. Teacher clicks "End Poll". Student sees "This poll has been closed" instantly instead of countdown + celebration.
started: Likely since the celebration feature was added.

## Eliminated

(None - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-23T00:01:00Z
  checked: Teacher flow in src/app/(dashboard)/polls/[pollId]/live/client.tsx
  found: Teacher uses a LOCAL forceReveal flag (line 72-73). When teacher clicks "End Poll", handleStatusChange sets forceReveal=true which passes to PollResults as a prop. PollResults triggers countdown then reveal internally. The teacher never relies on realtime status to trigger celebration.
  implication: Teacher flow works because it uses a synchronous local state flag, not the realtime channel.

- timestamp: 2026-02-23T00:02:00Z
  checked: Student flow in src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx
  found: Student page detects active->closed transition via useEffect (lines 77-92). When pollStatus changes from 'active' to 'closed' AND state.type === 'ready', it sets BOTH showCountdown=true AND closedDetected=true simultaneously (lines 89-90).
  implication: Both flags are set in the same React state batch update.

- timestamp: 2026-02-23T00:03:00Z
  checked: Student page render logic order (lines 310-358)
  found: CRITICAL BUG - Line 310 checks `closedDetected && !showReveal`. When both closedDetected=true and showCountdown=true are set simultaneously, the NEXT render hits line 310 first (closedDetected=true, showReveal=false -> condition is TRUE). This early-returns a static "This poll has been closed" div. The countdown overlay at line 345 (`{showCountdown && <WinnerReveal ... />}`) is NEVER reached because it lives in the MAIN return block at line 327, which is bypassed by the early return at line 310.
  implication: This is the root cause. The closedDetected early-return guard fires before the countdown/reveal overlays can render.

- timestamp: 2026-02-23T00:04:00Z
  checked: Intended animation sequence from code comments and logic
  found: The intended flow was: (1) showCountdown=true renders WinnerReveal countdown, (2) countdown completes -> handleCountdownComplete sets showCountdown=false, showReveal=true, (3) showReveal renders PollReveal with confetti, (4) on dismiss showReveal=false and closedDetected stays true, (5) closedDetected && !showReveal renders final "poll closed + winner" state. The problem is step (1) never happens because closedDetected is set at the SAME TIME as showCountdown, causing step (5) to fire immediately.
  implication: The closedDetected flag was intended as a "post-animation" marker but is set prematurely.

- timestamp: 2026-02-23T00:04:30Z
  checked: Render order in the student page component
  found: The render logic is ordered as a series of early returns:
    - line 220: state.type === 'loading' -> early return
    - line 232: state.type === 'no-identity' -> early return
    - line 247: state.type === 'not-found' -> early return
    - line 267: state.type === 'not-active' -> early return
    - line 310: closedDetected && !showReveal -> early return (THE BUG)
    - line 327: main return (contains countdown + reveal overlays at lines 345-357)
  The early return at line 310 prevents reaching the main return that renders the overlays.
  implication: The fix must ensure the countdown and reveal overlays render BEFORE the closedDetected early return takes effect.

## Resolution

root_cause: In `src/app/(student)/session/[sessionId]/poll/[pollId]/page.tsx`, lines 89-90 set `closedDetected=true` at the same time as `showCountdown=true`. On the next render, the early return at line 310 (`closedDetected && !showReveal`) fires immediately, returning the static "This poll has been closed" message. The countdown overlay (line 345) and reveal overlay (line 353) are in the main return block at line 327, which is never reached because the early return at line 310 short-circuits it.

In contrast, the teacher view at `src/app/(dashboard)/polls/[pollId]/live/client.tsx` works because it uses a LOCAL `forceReveal` prop passed to `PollResults`, which handles countdown and reveal internally within its own render tree -- there is no competing early return that short-circuits the overlays.

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []
