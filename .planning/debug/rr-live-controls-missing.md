---
status: diagnosed
trigger: "RR live dashboard: teacher sees matchup grid but no round advancement controls (test 11)"
created: 2026-02-01T12:00:00Z
updated: 2026-02-01T12:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - The "Open Round N" button IS present in live-dashboard.tsx (line 424-432), but it only shows when `canAdvanceRoundRobin` is true, which requires ALL current-round matchups to be `decided` AND a next round to exist. On initial activation, round 1 matchups are `pending` (not `voting` or `decided`), so there is no "Open Round 1" button to transition them to `voting`. The teacher has NO control to start voting on round 1 at all.
test: Code tracing through matchup status lifecycle for round-robin brackets
expecting: A clear gap where round 1 never gets opened for voting
next_action: Report diagnosis

## Symptoms

expected: Teacher sees "Open Round 1" (or similar) button in the live dashboard to begin round-by-round RR voting when they go live
actual: Teacher sees RR matchup grid and standings but NO round advancement controls. All matchups stay in `pending` status. Only generic Go Live / Activate buttons visible on bracket detail page.
errors: None (no crash, just missing UI controls)
reproduction: Create a round-robin bracket with round-by-round pacing, activate it, click "Go Live" to enter live dashboard. No round controls are visible.
started: Since plan 07-15 added bracket type routing to live dashboard. The RR matchup grid renders correctly but the round lifecycle is incomplete.

## Eliminated

- hypothesis: "The Open Round button was never implemented in live-dashboard.tsx"
  evidence: Lines 424-432 of live-dashboard.tsx DO contain the "Open Round N" button, guarded by `isRoundRobin && canAdvanceRoundRobin`. The button exists.
  timestamp: 2026-02-01T12:01:00Z

- hypothesis: "The button logic is identical to bracket-detail.tsx so it should work the same"
  evidence: While the handler logic is similar, the PRECONDITION differs. Both require `canAdvanceRoundRobin` which needs all current round matchups decided + a next round to exist. But bracket-detail.tsx has the same gap -- neither page has a way to open round 1 for voting after activation.
  timestamp: 2026-02-01T12:02:00Z

## Evidence

- timestamp: 2026-02-01T12:01:00Z
  checked: src/lib/dal/round-robin.ts lines 68-87 (createRoundRobinBracketDAL)
  found: All round-robin matchups are created with `status: 'pending'` (line 83). No special handling for round 1 -- ALL rounds start as pending regardless of pacing mode.
  implication: When the bracket is activated (draft -> active), all matchups remain `pending`. Nothing automatically opens round 1 for voting.

- timestamp: 2026-02-01T12:02:00Z
  checked: src/actions/bracket.ts (updateBracketStatus) and src/lib/dal/bracket.ts (updateBracketStatusDAL)
  found: The activation flow (draft -> active) only validates entrant count, then sets bracket.status = 'active'. There is NO bracket-type-specific logic to open round 1 matchups for RR brackets during activation.
  implication: After activation, round 1 matchups are still `pending`. No automatic transition to `voting`.

- timestamp: 2026-02-01T12:03:00Z
  checked: src/lib/dal/round-robin.ts lines 209-240 (advanceRoundRobinRound)
  found: The `advanceRoundRobinRound` function sets matchups with `roundRobinRound: roundNumber` from `pending` to `voting`. This is the ONLY mechanism to open a round for voting. It must be called explicitly via the `advanceRound` server action.
  implication: Round 1 can only be opened by calling advanceRoundRobinRound(bracketId, 1, teacherId), but no UI control triggers this call for round 1.

- timestamp: 2026-02-01T12:04:00Z
  checked: src/components/teacher/live-dashboard.tsx lines 256-270 (canAdvanceRoundRobin logic)
  found: |
    `canAdvanceRoundRobin` requires:
    1. isRoundRobin = true
    2. pacing = 'round_by_round'
    3. ALL matchups in currentRoundRobinRound are `decided`
    4. A next round exists (roundRobinRound > currentRoundRobinRound)

    On initial load, currentRoundRobinRound = 1 (from line 258: finds first non-decided matchup).
    Round 1 matchups are ALL `pending` (not `decided`), so condition 3 fails.
    Result: canAdvanceRoundRobin = false. Button is hidden.
  implication: The "Open Round N" button is designed for advancing from round N to round N+1 AFTER round N is complete. It was never designed to open round 1 initially.

- timestamp: 2026-02-01T12:05:00Z
  checked: src/components/bracket/bracket-detail.tsx lines 49-57 (canAdvanceRound in bracket detail)
  found: bracket-detail.tsx has the SAME logic gap. Its `canAdvanceRound` also requires `currentRoundAllDecided && nextRoundExists`. There is no "Open Round 1" button on the bracket detail page either.
  implication: The bracket-detail page has the same missing control. Both the bracket detail and live dashboard lack a way to open round 1 for voting. The UAT tester's "no round advancement controls" applies to both pages.

- timestamp: 2026-02-01T12:06:00Z
  checked: src/components/bracket/round-robin-matchups.tsx lines 227-251 (teacher controls)
  found: The MatchupCard component shows "Win/Tie" buttons for individual matchups, but ONLY when `isVoting && onRecordResult`. Since matchups are `pending` (not `voting`), these buttons are also hidden.
  implication: Even the per-matchup result recording buttons are invisible because matchups never transition from `pending` to `voting`.

- timestamp: 2026-02-01T12:07:00Z
  checked: SE bracket workflow comparison
  found: For single-elimination brackets, the live dashboard has `handleOpenVoting` (lines 198-208) which opens pending matchups in the current round for voting. This is the "Open Voting (N)" button. For RR brackets, this button is hidden by the `!isRoundRobin` guard (line 393). The equivalent action for RR -- opening round 1 for voting -- was never added.
  implication: Plan 07-15 correctly hid SE controls for RR but did not provide the RR equivalent of "Open Voting" for the initial round.

## Resolution

root_cause: |
  TWO INTERRELATED GAPS in the round-robin live voting lifecycle:

  **Gap 1 (Primary): No "Open Round 1" control exists anywhere.**
  When a round-robin bracket is activated, ALL matchups across ALL rounds are created
  with `status: 'pending'` (src/lib/dal/round-robin.ts line 83). The activation flow
  (updateBracketStatusDAL) does not include any bracket-type-specific logic to
  automatically open round 1 for voting.

  The `advanceRoundRobinRound(bracketId, roundNumber)` function exists to transition
  matchups from `pending` to `voting`, but it is only callable via the "Open Round N"
  button, which is gated on `canAdvanceRoundRobin`. That flag requires the CURRENT
  round to be fully decided before showing the button to open the NEXT round. Since
  round 1 starts as `pending`, the button never appears.

  There is a chicken-and-egg problem: the teacher needs to open round 1 to start
  voting, but the only round advancement control is designed for advancing from
  round N to round N+1.

  **Gap 2 (Secondary): SE-specific voting controls hidden for RR with no replacement.**
  Plan 07-15 correctly hid the SE action buttons (Open Voting / Close & Advance /
  Next Round) for round-robin brackets using `!isRoundRobin` guards (lines 393, 403,
  413). However, it did not add an RR-equivalent "Open Round 1" button for the initial
  state. The only RR button added was "Open Round N+1" which is for SUBSEQUENT rounds.

  **The net effect:** After going live with an RR bracket, the teacher sees the matchup
  grid with all matchups in "Upcoming" (pending) state, but has NO button to begin
  voting on round 1. The per-matchup Win/Tie buttons (in round-robin-matchups.tsx) are
  also hidden because they require matchups to be in `voting` status.

  **Where this works on bracket-detail.tsx:** It doesn't. The bracket detail page has
  the EXACT SAME gap -- it also lacks an "Open Round 1" button. The UAT tester likely
  never got to test this there because they went directly to "Go Live" after activating.

fix: (not applied -- diagnosis only)
verification: (not applied)
files_changed: []

## Suggested Fix Direction

Two possible approaches:

**Approach A (Automatic):** When a round-robin bracket with `round_by_round` pacing is
activated (draft -> active), automatically open round 1 by setting its matchups to
`voting` status. This would happen in `updateBracketStatusDAL` or as a post-activation
hook. Pros: seamless UX. Cons: couples activation logic to bracket type.

**Approach B (Manual button):** Add an "Open Round 1" button that appears when
`isRoundRobin && currentRoundRobinRound === 1 && all round-1 matchups are pending`.
This button calls `advanceRound({ bracketId, roundNumber: 1 })`. Add this to both
live-dashboard.tsx (line ~424) and bracket-detail.tsx (line ~187). Pros: teacher
controls pacing. Cons: extra click.

**Approach C (Both):** Automatically open round 1 on activation AND show the manual
button as a fallback. Most robust.

Key files requiring changes:
- `src/components/teacher/live-dashboard.tsx` -- Add "Open Round 1" button (or modify canAdvanceRoundRobin logic)
- `src/components/bracket/bracket-detail.tsx` -- Same fix for bracket detail page
- Optionally `src/lib/dal/bracket.ts` (updateBracketStatusDAL) -- Auto-open round 1 on activation
