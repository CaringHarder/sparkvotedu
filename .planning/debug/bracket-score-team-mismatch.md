---
status: awaiting_human_verify
trigger: "ESPN bracket results show correct winning teams advancing, but scores are swapped/flipped for some games"
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — homeScore/awayScore from ESPN are stored based on ESPN home/away designation, but entrant1/entrant2 in later rounds are assigned by bracket position order (not home/away). Display maps homeScore to entrant1 and awayScore to entrant2, causing swapped scores when ESPN "home" team is in the entrant2 slot.
test: Confirmed via code reading of syncBracketResults, mapEventToGame, and bracket-diagram.tsx
expecting: Fix applied, awaiting human verification
next_action: User verifies scores display correctly after re-sync

## Symptoms

expected: When Michigan beats Arizona in the semifinal, Michigan should show the higher score (e.g., 71) and Arizona the lower (62). Prediction scoring should credit students who picked the winning team.
actual: Michigan (the winner) shows 62, Arizona (the loser) shows 71 in the semifinal display. The correct team still advances, but scores are flipped. This happens in multiple games throughout the tournament but not all.
errors: No explicit errors — the data loads and displays, just with swapped scores on some games.
reproduction: View bracket results page for NCAA tournament. FINAL FOUR section — Arizona vs Michigan semifinal shows ARIZ 71, MICH 62 but Michigan won and advanced to the final.
started: Data ingestion/parsing issue from ESPN API results.

## Eliminated

- hypothesis: ESPN API returns wrong data
  evidence: ESPN mapper correctly maps home/away competitors to homeScore/awayScore; the API data is fine
  timestamp: 2026-04-08

- hypothesis: Prediction scoring is broken by score swap
  evidence: scorePredictions() compares predictedWinnerId === matchup.winnerId (entrant IDs, not scores). winnerId is set from ESPN winner flag, not score comparison. Prediction scoring is correct.
  timestamp: 2026-04-08

## Evidence

- timestamp: 2026-04-08
  checked: ESPN mappers (src/lib/sports/espn/mappers.ts)
  found: mapEventToGame correctly identifies home/away competitors and maps their scores. Winner determined by competitor.winner flag, not score comparison.
  implication: ESPN API layer is correct; issue is downstream in storage/display mapping.

- timestamp: 2026-04-08
  checked: bracket-diagram.tsx display logic (lines 398-523)
  found: Display maps homeScore to entrant1 (top slot) and awayScore to entrant2 (bottom slot). No logic to check which entrant is actually ESPN home vs away.
  implication: Display assumes entrant1=home, entrant2=away, which is only true for Round 1.

- timestamp: 2026-04-08
  checked: createSportsBracketDAL matchup creation (line 640-645) and winner propagation (lines 747-763)
  found: Initial creation sets entrant1=homeTeam, entrant2=awayTeam (correct). But winner propagation via getSlotByFeederOrder places winners by bracket position, potentially swapping entrant1/entrant2 relative to ESPN home/away. Scores remain in original ESPN order.
  implication: After winner propagation, homeScore no longer corresponds to entrant1 for many matchups.

- timestamp: 2026-04-08
  checked: syncBracketResults (lines 882-886)
  found: Sync blindly writes game.homeScore as homeScore and game.awayScore as awayScore without checking which entrant is which ESPN team.
  implication: Every sync perpetuates the score-entrant mismatch for later rounds.

## Resolution

root_cause: The display layer (bracket-diagram.tsx) shows homeScore next to entrant1 and awayScore next to entrant2. But entrant1/entrant2 are assigned by bracket position (via getSlotByFeederOrder during winner advancement), while homeScore/awayScore come from ESPN home/away designation. These two orderings are independent and frequently disagree in later tournament rounds, causing scores to appear on the wrong team.
fix: Two changes in src/lib/dal/sports.ts — (1) syncBracketResults now resolves which entrant corresponds to which ESPN team and maps scores to the correct entrant slot; (2) createSportsBracketDAL now does a score-alignment pass after winner propagation to fix any scores that were misaligned by bracket-position-based entrant assignment.
verification: TypeScript compilation passes with zero errors.
files_changed: [src/lib/dal/sports.ts]
