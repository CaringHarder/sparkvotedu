---
status: diagnosed
trigger: "Releasing results on predictive auto-resolution bracket does NOT auto-reveal round 1. Teacher must click 'Reveal Next Round' manually after release."
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - releaseResultsDAL sets revealedUpToRound=0 and status="revealing" but never calls revealRoundDAL for round 1
test: Read all three files completely
expecting: Missing call to revealRoundDAL
next_action: Report root cause

## Symptoms

expected: After teacher confirms release, bracket should immediately reveal round 1 results
actual: Bracket transitions to "revealing" state but round 1 is NOT shown; button changes to "Reveal Next Round" requiring manual click
errors: none reported
reproduction: Create predictive bracket, complete voting, click release results
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: releaseResultsDAL in src/lib/dal/prediction.ts (lines 797-841)
  found: Function transitions predictionStatus to "revealing" and sets revealedUpToRound=0. It does NOT call revealRoundDAL. It does NOT reveal any round. It only validates all matchups have winners, then sets the two fields.
  implication: After release, the bracket is in "revealing" state with 0 rounds revealed - teacher must manually click to reveal round 1.

- timestamp: 2026-02-13T00:02:00Z
  checked: releaseResults server action in src/actions/prediction.ts (lines 283-323)
  found: The server action calls releaseResultsDAL only. After success it broadcasts prediction_status_changed with "revealing" and revalidates path. It does NOT call revealRoundDAL or revealNextRound.
  implication: Neither the DAL layer nor the server action layer auto-triggers round 1 reveal.

- timestamp: 2026-02-13T00:03:00Z
  checked: handleReleaseResults in predictive-bracket.tsx (lines 152-156)
  found: Client handler calls `await releaseResults({ bracketId: bracket.id })` and nothing else. No follow-up call to revealNextRound.
  implication: The UI handler also does not chain a reveal after release.

- timestamp: 2026-02-13T00:04:00Z
  checked: TeacherPredictiveView "revealing" UI block (lines 278-454)
  found: When predictionStatus is "revealing", revealedUpToRound defaults to bracket.revealedUpToRound ?? 0. The condition `allRevealed = revealedUpToRound >= totalRounds` is false when revealedUpToRound=0, so the "Reveal Next Round" button is shown. There is no useEffect or auto-trigger to reveal round 1 on mount.
  implication: UI correctly reflects the state (0 rounds revealed) but has no auto-reveal logic either.

- timestamp: 2026-02-13T00:05:00Z
  checked: revealRoundDAL in src/lib/dal/prediction.ts (lines 851-917)
  found: This function properly reveals a round: updates matchups to "decided", increments revealedUpToRound, broadcasts reveal_round event. It works correctly when called - the problem is it is never called as part of release.
  implication: The reveal mechanism is fully functional; it just needs to be triggered.

## Resolution

root_cause: releaseResultsDAL (src/lib/dal/prediction.ts, line 797) transitions the bracket to predictionStatus="revealing" with revealedUpToRound=0 but does NOT auto-reveal round 1. Neither the DAL function, the server action (releaseResults in src/actions/prediction.ts, line 283), nor the client handler (handleReleaseResults in predictive-bracket.tsx, line 152) chains a call to revealRoundDAL/revealNextRound for round 1. The teacher lands in the "revealing" UI with 0 rounds shown and must manually click "Reveal Next Round" to see round 1.
fix:
verification:
files_changed: []
