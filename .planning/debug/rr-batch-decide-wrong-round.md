---
status: resolved
trigger: "Close All & Decide by Votes button for rounds 1 and 2 doesn't work in all-at-once RR bracket"
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
---

## Current Focus

hypothesis: handleBatchDecideByVotes always filters by currentRoundRobinRound which is the MAX active round, ignoring the actual round the button belongs to
test: Trace the data flow from button click to matchup filter
expecting: The handler hardcodes the round filter to the highest active round
next_action: Confirmed. Document root cause.

## Symptoms

expected: Clicking "Close All & Decide by Votes" on rounds 1 or 2 should decide all voting matchups in that round
actual: Button click has no effect on rounds 1 and 2; round 3 works correctly
errors: None (silent failure -- filter returns empty array)
reproduction: Create RR bracket with 4 entrants, all-at-once pacing. Activate. Vote on all matchups. Click "Close All & Decide by Votes" on round 1 or 2.
started: Since all-at-once pacing was implemented

## Eliminated

(none needed -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-26T00:00:00Z
  checked: handleBatchDecideByVotes in live-dashboard.tsx (line 717-749)
  found: Filters by `m.roundRobinRound === currentRoundRobinRound` -- always uses the single computed round
  implication: In all-at-once mode, currentRoundRobinRound = max active round (3), so rounds 1 and 2 matchups are excluded

- timestamp: 2026-02-26T00:00:00Z
  checked: currentRoundRobinRound computation (line 647-654)
  found: `Math.max(...activeRounds)` where activeRounds = all non-pending rounds. In all-at-once, all rounds are voting, so max = 3.
  implication: This value is always 3 (for 4 entrants), making the batch handler only operate on round 3

- timestamp: 2026-02-26T00:00:00Z
  checked: onBatchDecideByVotes prop passed to RoundRobinMatchups (line 1475)
  found: The callback takes NO arguments. The child component calls `onBatchDecideByVotes()` without passing the round number.
  implication: The handler has no way to know which round's button was clicked.

- timestamp: 2026-02-26T00:00:00Z
  checked: Per-matchup "Decide by Votes" button in round-robin-matchups.tsx (line 456-459)
  found: Calls `onRecordResult(matchup.id, leaderId)` with the specific matchup ID
  implication: This bypasses the round filter entirely, which is why individual buttons work.

## Resolution

root_cause: handleBatchDecideByVotes in live-dashboard.tsx hardcodes the round filter to currentRoundRobinRound (line 719), which in all-at-once mode always equals the highest round number (e.g., 3 for 4 entrants). The button in each round header calls onBatchDecideByVotes() with no arguments, so the handler cannot distinguish which round's button was clicked.

fix: Change onBatchDecideByVotes to accept a round number parameter. Update the callback, the prop type, and the call site in round-robin-matchups.tsx.

verification: (pending)
files_changed: []
