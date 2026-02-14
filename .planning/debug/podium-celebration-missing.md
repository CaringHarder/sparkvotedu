---
status: diagnosed
trigger: "Podium celebration does NOT appear when all rounds are revealed on auto-mode predictive bracket"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: Two root causes - (1) usePredictions never initializes revealComplete from existing bracket state, and (2) cold-start page load for completed brackets bypasses PredictionReveal entirely
test: Code analysis of all paths
expecting: revealComplete is only set from broadcast event, never from initial state
next_action: Report root cause

## Symptoms

expected: After all rounds are revealed in auto-mode predictive bracket, a PodiumCelebration overlay should appear with gold/silver/bronze and confetti
actual: Final round reveal shows brackets and leaderboards with bracket marked as closed, no podium celebration
errors: None (silent failure - condition never met)
reproduction: Complete auto-mode predictive bracket reveal, observe student page
started: Since implementation (structural defect)

## Eliminated

- hypothesis: PodiumCelebration component is broken
  evidence: Component code (podium-celebration.tsx) is fully implemented with confetti, animations, auto-dismiss - renders correctly when showPodium=true
  timestamp: 2026-02-13

- hypothesis: Supabase channel conflict between useRealtimeBracket and usePredictions
  evidence: Supabase JS v2.93.3 reuses channel instances (RealtimeClient.ts line 383), _on() adds to bindings array (line 924-928), _trigger iterates all bindings (line 847). Both handlers fire on shared channel.
  timestamp: 2026-02-13

- hypothesis: Server never broadcasts reveal_complete
  evidence: revealRoundDAL (prediction.ts:911) correctly broadcasts reveal_complete when isLastRound=true. Server logic is correct.
  timestamp: 2026-02-13

## Evidence

- timestamp: 2026-02-13
  checked: usePredictions hook initialization (use-predictions.ts:33)
  found: revealComplete initialized to false, only set to true from 'reveal_complete' broadcast event (line 90-93). No initialization from bracket state (predictionStatus, revealedUpToRound).
  implication: If student misses the broadcast event (page load after completion, HTTP polling fallback, or any other reason), revealComplete stays false forever.

- timestamp: 2026-02-13
  checked: Student page cold-start path (page.tsx:148-150, 256-290)
  found: When bracket status='completed' on page load, state.type='completed' renders generic completed view. For predictive brackets, renders PredictiveBracket (read-only), NOT PredictionReveal. PredictionReveal is never mounted.
  implication: Students who refresh or arrive after completion never see podium.

- timestamp: 2026-02-13
  checked: PredictionReveal podium trigger (prediction-reveal.tsx:91-98)
  found: Podium depends solely on revealComplete from usePredictions. No fallback check for bracket.predictionStatus === 'completed'.
  implication: Even when PredictionReveal is mounted, if revealComplete is not set, podium never shows.

- timestamp: 2026-02-13
  checked: Live WebSocket scenario
  found: When WebSocket is working, reveal_complete broadcast reaches usePredictions handler, sets revealComplete=true, podium shows after 1s delay. This path works correctly.
  implication: Bug manifests when (a) student loads page after completion, or (b) student is on HTTP polling fallback (school network blocking WebSocket).

- timestamp: 2026-02-13
  checked: HTTP polling fallback path (use-realtime-bracket.ts:160-168)
  found: useRealtimeBracket has polling fallback, usePredictions does NOT. In polling mode, usePredictions never receives broadcast events, revealComplete stays false.
  implication: Students on school networks with blocked WebSocket never see podium even during live reveal.

- timestamp: 2026-02-13
  checked: useRealtimeBracket event handling (use-realtime-bracket.ts:137-149)
  found: reveal_complete type is NOT handled by useRealtimeBracket (doesn't match winner_selected, round_advanced, voting_opened, bracket_completed, or prediction_status_changed). So fetchBracketState is NOT triggered by reveal_complete.
  implication: Parent component doesn't refetch state on reveal_complete, which is by design since usePredictions handles it. But this means no redundancy.

## Resolution

root_cause: |
  TWO interconnected defects prevent the podium celebration from appearing:

  **Defect 1 (Primary): No cold-start initialization of revealComplete**
  File: src/hooks/use-predictions.ts (line 33)
  The `revealComplete` state is initialized to `false` and only transitions to `true` when a live `reveal_complete` broadcast event is received (line 90-93). There is no code to derive `revealComplete` from existing bracket state (e.g., checking if `predictionStatus === 'completed'` or `revealedUpToRound >= totalRounds`). This means:
  - Students who refresh the page after reveal completion never get revealComplete=true
  - Students on HTTP polling fallback (school networks) never receive the broadcast event

  **Defect 2 (Compounding): Cold-start page routing bypasses PredictionReveal entirely**
  File: src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx (lines 148-150, 285-290)
  When the student page loads and `bracket.status === 'completed'`, it sets `state.type = 'completed'` and renders a generic completed view. For predictive brackets, this shows `PredictiveBracket` (read-only bracket diagram) instead of `PredictionReveal`. The `PredictionReveal` component is never mounted, so the podium is impossible regardless of revealComplete state.

  **The combined effect:** Even if Defect 1 were fixed (usePredictions initialized revealComplete from state), Defect 2 would still prevent the podium from showing on cold start because PredictionReveal isn't rendered at all.

fix: (not applied - diagnosis only)
verification: (not applied)
files_changed: []
