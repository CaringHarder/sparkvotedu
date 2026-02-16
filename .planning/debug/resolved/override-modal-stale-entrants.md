---
status: diagnosed
trigger: "override modal shows stale entrant data for downstream matchups after earlier override"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - The override modal reads entrant IDs from TabulationResult objects that are re-fetched by calling prepareResults() again, but prepareResults() calls tabulateBracketPredictions() which requires predictionStatus='predictions_open'|'tabulating'. During previewing, this transition is rejected, so the server action returns an error, and setTabulationResults is never called with refreshed data.
test: Traced the full code path from handleOverrideWinner through server action to DAL
expecting: n/a - confirmed
next_action: Return diagnosis

## Symptoms

expected: After overriding a quarterfinal winner, clicking a downstream semifinal matchup should show the updated entrants (reflecting the new winner)
actual: The modal shows the ORIGINAL entrants from the initial tabulation, not the updated ones
errors: No visible error - the prepareResults() call silently fails on the server due to status guard
reproduction: 1) Prepare results for a 16-team predictive bracket (auto mode). 2) Override a quarterfinal matchup winner. 3) Click on the downstream semifinal matchup to open override modal. 4) Modal shows original entrants, not updated ones.
started: Since override feature was implemented

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-13
  checked: handleOverrideWinner in predictive-bracket.tsx (lines 137-149)
  found: After calling overrideWinner(), it attempts to refresh tabulation results by calling prepareResults() a second time (line 142). prepareResults() is the server action that calls tabulateBracketPredictions() in the DAL.
  implication: The refresh mechanism re-uses the initial tabulation entry point rather than a dedicated refresh path.

- timestamp: 2026-02-13
  checked: tabulateBracketPredictions in prediction.ts DAL (lines 493-607)
  found: Lines 521-524 enforce a status guard: `if (currentStatus !== 'predictions_open' && currentStatus !== 'tabulating') { return { error: "Cannot tabulate from status '${currentStatus}'" } }`. During previewing, the bracket's predictionStatus is 'previewing', NOT 'predictions_open' or 'tabulating'.
  implication: The prepareResults() call inside handleOverrideWinner ALWAYS fails silently during the previewing phase because tabulateBracketPredictions rejects the call. The `if (refreshed && 'results' in refreshed && refreshed.results)` check on line 143 silently absorbs the error (it gets `{ error: "..." }` back, which doesn't have a `results` property).

- timestamp: 2026-02-13
  checked: overrideMatchupWinnerDAL in prediction.ts DAL (lines 616-787)
  found: The DAL function correctly updates the database: it sets the new winner on the overridden matchup, propagates the winner to the next matchup's entrant slot, clears downstream winners, clears downstream entrant slots for rounds beyond round+1, re-fetches matchups, and re-tabulates downstream rounds. The DATABASE is correct after this operation.
  implication: The backend correctly cascades changes. The problem is entirely on the frontend -- the client never receives the updated TabulationResult data.

- timestamp: 2026-02-13
  checked: overrideWinner server action in actions/prediction.ts (lines 239-274)
  found: The overrideWinner action returns only `{ success: true }` -- it does NOT return the updated tabulation results or the updated matchup data.
  implication: Even though the DAL re-tabulates downstream matchups, those results are discarded and never sent back to the client. The client would need either (a) the action to return fresh results, or (b) a separate fetch mechanism that works during 'previewing' status.

- timestamp: 2026-02-13
  checked: PredictionPreview component, OverrideModal, getEntrantName function (prediction-preview.tsx)
  found: The OverrideModal reads entrant1Id and entrant2Id from the TabulationResult object (line 233, 275, 298). getEntrantName() looks up names by scanning bracket.matchups -- the prop-drilled bracket object. Both data sources are stale after override: tabulationResults was never refreshed (prepareResults failed), and bracket.matchups is a prop from the server that only updates on page revalidation.
  implication: Two layers of staleness -- the tabulationResults state AND the bracket.matchups prop.

- timestamp: 2026-02-13
  checked: revalidatePath in overrideWinner action (line 268)
  found: The action calls `revalidatePath('/brackets/${bracketId}')` which should trigger a re-render with fresh server data. However, this only refreshes the bracket prop (server component data). The tabulationResults state is local React state (`useState`) that is NOT derived from server data -- it was populated from the prepareResults() call and lives purely in client memory.
  implication: Even if revalidatePath works and bracket.matchups updates, the tabulationResults state remains stale because it's independent client state that was never successfully refreshed.

## Resolution

root_cause: |
  Two-part failure in handleOverrideWinner (predictive-bracket.tsx lines 137-149):

  1. PRIMARY: After a successful override, the function tries to refresh tabulation
     results by calling `prepareResults()` again (line 142). But prepareResults()
     internally calls tabulateBracketPredictions() which has a status guard (DAL
     line 521-524) that only allows calls when predictionStatus is 'predictions_open'
     or 'tabulating'. During the previewing phase (when overrides happen), this guard
     rejects the call with an error. The error is silently swallowed because the
     conditional on line 143 checks for 'results' in the response, which an error
     response lacks.

  2. SECONDARY: The overrideWinner server action (actions/prediction.ts line 262-268)
     does not return the updated tabulation results. The DAL function
     overrideMatchupWinnerDAL internally re-tabulates all downstream matchups and
     writes correct data to the database, but those re-tabulated results are
     discarded -- the action returns only `{ success: true }`.

  The net effect: the tabulationResults React state in TeacherPredictiveView is
  never updated after an override. The override modal continues to render entrant
  IDs from the initial tabulation snapshot. The BracketDiagram may show correct
  data (if bracket.matchups refreshes via revalidatePath), but the modal reads
  from the stale tabulationResults state.

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []
