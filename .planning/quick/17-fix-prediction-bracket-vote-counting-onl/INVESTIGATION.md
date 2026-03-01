# Quick Task 17: Investigation Notes

## Bug Description
- Predictive bracket, `predictiveResolutionMode === 'auto'` ("Prediction is the Vote"), simple prediction mode
- 4 students filled out predictions for 8-team bracket (all picks, got confirmation)
- Teacher: only first matchup shows votes, rest of round 1 show 0 vs 0

## Key Architecture (auto mode)
1. Students submit predictions via `submitPredictions()` in `src/lib/dal/prediction.ts`
2. Teacher clicks "Close Predictions & Prepare Results" which calls `prepareResults` server action
3. This calls `tabulateBracketPredictions()` → pure `tabulatePredictions()` engine
4. Tabulation counts predictions per matchup, determines winners, cascades through rounds
5. Results stored in React state (`tabulationResults`) on `TeacherPredictiveView` component
6. Preview shown via `PredictionPreview` component

## Critical Flow Files
- `src/lib/dal/prediction.ts` - `tabulateBracketPredictions()` (line 498) & `submitPredictions()` (line 17)
- `src/lib/bracket/predictive.ts` - Pure `tabulatePredictions()` (line 106) - processes round by round
- `src/components/bracket/predictive-bracket.tsx` - `TeacherPredictiveView` (line 85), `PredictiveBracket` (line 37)
- `src/components/bracket/prediction-preview.tsx` - Shows tabulation results with vote counts
- `src/hooks/use-prediction-cascade.ts` - Used by simple prediction mode to generate matchupId mappings
- `src/hooks/use-predictions.ts` - Fetches predictions and leaderboard

## What Works
- The live dashboard correctly delegates to `PredictiveBracket` for auto mode (line 1449-1455 in live-dashboard.tsx)
- The pure tabulation engine (`tabulatePredictions`) logic looks correct for counting predictions per matchup
- Database models: Prediction has bracketId, participantId, matchupId, predictedWinnerId

## Suspected Root Cause Areas (NOT YET CONFIRMED)
1. **Simple prediction mode matchup mapping**: In simple mode, students use a sequential form (not bracket click). The `usePredictionCascade` hook generates matchupId mappings. If it incorrectly maps predictions (only assigns matchupId for first matchup, or uses wrong matchupIds for others), tabulation would show 0 for those matchups.
2. **Prediction submission**: Verify that all 4 round-1 predictions from each student have correct, distinct matchupIds (not all pointing to matchup 1)
3. **Tabulation display**: The `tabulationResults` are in React state only - page refresh loses them. If teacher refreshed, previewing state would have empty tabulationResults.

## Most Likely Bug
The simple prediction mode (via `usePredictionCascade`) may be generating predictions with incorrect matchupIds - possibly all predictions reference the FIRST matchup's ID instead of the correct matchup for each pick. This would cause:
- Matchup 1: shows all prediction counts (because all predictions point to it)
- Matchups 2-4: show 0 votes (no predictions reference them)

## Next Steps
1. Read `src/hooks/use-prediction-cascade.ts` FULLY - check how matchupIds are generated for simple mode
2. Read the simple prediction form component to see how picks map to matchupIds
3. Check `src/components/bracket/prediction-preview.tsx` to see how tabulationResults are displayed
4. If matchupId mapping is correct, check if predictions are being submitted with duplicate matchupIds
5. Test: query predictions in DB to verify each has unique matchupId per round-1 matchup
