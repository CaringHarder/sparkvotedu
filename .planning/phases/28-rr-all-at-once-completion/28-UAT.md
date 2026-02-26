---
status: diagnosed
phase: 28-rr-all-at-once-completion
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md]
started: 2026-02-26T15:00:00Z
updated: 2026-02-26T15:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. RR All-at-Once Activation Opens All Rounds
expected: Create a round robin bracket with "all at once" pacing and at least 4 entrants. Activate the bracket. All matchups across ALL rounds should be open for voting immediately -- not just round 1.
result: pass

### 2. Celebration Manual Dismiss Only
expected: Complete all matchups in an RR bracket so it finishes. The celebration screen should appear and stay visible indefinitely until you click the Continue button. It should NOT auto-dismiss after a timer.
result: issue
reported: "no celebration, because after pressing 'close all and decide by votes' the first two rounds were not detected/calculated, and pressing 'close all and decide by votes' for rounds 1 and 2 doesn't do anything. Round 3 shows 2/2 decided but rounds 1 and 2 show 0/2 decided."
severity: blocker

### 3. Round Progress Badge on Teacher Dashboard
expected: While an RR bracket is active with multiple rounds, the teacher live dashboard should show a "Rounds: X/Y complete" badge that updates in real time as rounds are decided.
result: pass

### 4. Post-Celebration Final Standings (Teacher View)
expected: After clicking Continue on the celebration screen in the teacher live dashboard, a full-screen final standings overlay should appear showing all entrants ranked with the champion highlighted in gold styling. A Continue button dismisses this overlay.
result: pass

### 5. Post-Celebration Final Standings (Student View)
expected: After clicking Continue on the celebration screen in the student bracket view, a full-screen final standings overlay should appear showing all entrants ranked with the champion highlighted in gold styling. A Continue button dismisses this overlay.
result: pass

### 6. Pacing-Aware Fallback Button
expected: If an RR bracket gets stuck in a bad state, the teacher dashboard should show a fallback recovery button. For all-at-once brackets it should say "Open All Rounds"; for round-by-round brackets it should say "Open Round 1".
result: skipped
reason: Bracket did not get stuck in a bad state, so fallback button was not triggered

### 7. Round-by-Round Pacing Non-Regression
expected: Create and activate an RR bracket with round-by-round pacing. Only round 1 matchups should be open for voting -- later rounds should NOT be open yet.
result: pass

## Summary

total: 7
passed: 5
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Close All & Decide by Votes button resolves all matchups in a round for all-at-once RR brackets"
  status: failed
  reason: "User reported: no celebration, because after pressing 'close all and decide by votes' the first two rounds were not detected/calculated, and pressing 'close all and decide by votes' for rounds 1 and 2 doesn't do anything. Round 3 shows 2/2 decided but rounds 1 and 2 show 0/2 decided."
  severity: blocker
  test: 2
  root_cause: "handleBatchDecideByVotes in live-dashboard.tsx hardcodes its matchup filter to currentRoundRobinRound, which in all-at-once mode always equals the highest active round number (e.g., 3). The onBatchDecideByVotes prop takes no arguments, so the handler has no way to know which round the button belongs to. Only round 3 matchups pass the filter; rounds 1 and 2 produce empty arrays causing the early return."
  artifacts:
    - path: "src/components/teacher/live-dashboard.tsx"
      issue: "handleBatchDecideByVotes (lines 717-749) filters by currentRoundRobinRound instead of accepting a round parameter"
    - path: "src/components/bracket/round-robin-matchups.tsx"
      issue: "onBatchDecideByVotes prop type is () => void (line 17), call site passes no round number (line 176)"
  missing:
    - "Change onBatchDecideByVotes prop type from () => void to (roundNumber: number) => void"
    - "Pass roundNumber from call site in round-robin-matchups.tsx"
    - "Accept roundNumber param in handleBatchDecideByVotes and use it in filter instead of currentRoundRobinRound"
  debug_session: ".planning/debug/rr-batch-decide-wrong-round.md"
