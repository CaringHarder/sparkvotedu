---
status: investigating
trigger: "Student view for auto-mode predictive brackets does not dynamically update between round reveals"
created: 2026-02-14T00:00:00Z
updated: 2026-02-14T00:00:00Z
---

## Current Focus

hypothesis: The PredictionReveal component receives the bracket prop once and never updates it when new rounds are revealed, because the real-time matchup data flows through useRealtimeBracket in PredictiveStudentView but PredictionReveal uses its OWN usePredictions hook that listens for reveal_round events -- however the bracket.matchups passed as a prop are stale (they have the initial matchup statuses from the initial fetch, not the updated decided statuses).
test: Trace the data flow from revealRoundDAL broadcast -> usePredictions -> PredictionReveal -> BracketAccuracyView
expecting: The bracket.matchups prop passed to PredictionReveal never updates with the new matchup statuses (pending -> decided) because PredictionReveal reads matchup statuses from the bracket prop, not from a real-time source.
next_action: Confirm by tracing the exact data flow

## Symptoms

expected: When teacher reveals round 1 then round 2, student bracket view updates in real-time to show newly revealed matchups
actual: Student bracket view does NOT update between round reveals. Page refresh shows correct state.
errors: None reported
reproduction: Teacher uses "Reveal Next Round" button; student page does not reflect new round results until page refresh
started: First time testing progressive reveal on auto-mode predictive brackets

## Eliminated

## Evidence

- timestamp: 2026-02-14T00:01:00Z
  checked: revealRoundDAL broadcast events
  found: revealRoundDAL broadcasts 'reveal_round' with { round } for non-last rounds and 'reveal_complete' with { round } for last round. These are sent via broadcastBracketUpdate which wraps them as event='bracket_update' with type in payload.
  implication: The server-side broadcast is correct.

- timestamp: 2026-02-14T00:02:00Z
  checked: useRealtimeBracket handler for bracket_update events
  found: useRealtimeBracket only handles these types: winner_selected, round_advanced, voting_opened, bracket_completed, prediction_status_changed. It does NOT handle reveal_round or reveal_complete.
  implication: When reveal_round is broadcast, useRealtimeBracket ignores it and does NOT call fetchBracketState(). This means PredictiveStudentView.realtimeMatchups never updates with the new decided matchup statuses.

- timestamp: 2026-02-14T00:03:00Z
  checked: usePredictions handler for reveal_round events
  found: usePredictions DOES handle reveal_round, reveal_complete, and results_prepared. It calls fetchData() which re-fetches leaderboard and predictions. It also updates revealedUpToRound state.
  implication: usePredictions correctly picks up the reveal event and updates its own state.

- timestamp: 2026-02-14T00:04:00Z
  checked: PredictionReveal component data flow for bracket.matchups
  found: PredictionReveal receives bracket as a prop. BracketAccuracyView uses bracket.matchups to determine which matchups are decided (matchup.status !== 'decided'). The accuracy overlay and correct/incorrect counts depend on matchup.status being 'decided'. BUT the bracket prop comes from PredictiveStudentView's liveBracket which merges realtimeMatchups from useRealtimeBracket -- which NEVER refetches on reveal_round events.
  implication: Even though usePredictions updates revealedUpToRound, the bracket.matchups still have status='pending' for the newly revealed round because useRealtimeBracket never fetched the updated state.

- timestamp: 2026-02-14T00:05:00Z
  checked: BracketAccuracyView filtering logic
  found: BracketAccuracyView checks BOTH matchup.status === 'decided' AND matchup.round <= revealedUpToRound. So even if revealedUpToRound updates correctly via usePredictions, the matchups still show status='pending' because the bracket prop was never refreshed.
  implication: Two conditions must be met for accuracy overlay to show: (1) matchup.status === 'decided' (from bracket prop), (2) round <= revealedUpToRound (from usePredictions). Condition (2) updates in real-time but condition (1) does NOT.

## Resolution

root_cause: useRealtimeBracket (line 133-149) does NOT handle 'reveal_round' or 'reveal_complete' broadcast event types. When the teacher reveals a round, revealRoundDAL broadcasts type='reveal_round'. The usePredictions hook correctly handles this event and updates revealedUpToRound + refetches leaderboard/predictions. However, useRealtimeBracket ignores it entirely, so PredictiveStudentView's liveBracket never updates with the new matchup statuses (pending -> decided). PredictionReveal's BracketAccuracyView requires matchup.status === 'decided' to render the accuracy overlay, so newly revealed rounds remain invisible until page refresh.

Additionally, the PredictionLeaderboard component (rendered in PredictionReveal's Leaderboard tab) has its OWN usePredictions subscription -- so leaderboard data DOES update in real-time. But the Bracket tab showing accuracy overlays does NOT update because it depends on the bracket prop's matchup statuses.

fix:
verification:
files_changed: []
