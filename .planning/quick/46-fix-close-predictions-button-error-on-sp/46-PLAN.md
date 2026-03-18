---
phase: "46"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/prediction.ts
  - src/components/teacher/live-dashboard.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Teacher can click Close Predictions on a sports bracket without error"
    - "Sports bracket transitions from predictions_open to active when predictions are closed"
    - "Non-sports auto-mode brackets still use the existing tabulating transition"
  artifacts:
    - path: "src/lib/dal/prediction.ts"
      provides: "SPORTS_PREDICTION_TRANSITIONS map with predictions_open -> active"
      contains: "SPORTS_PREDICTION_TRANSITIONS"
    - path: "src/components/teacher/live-dashboard.tsx"
      provides: "handleClosePredictions sends status: active"
      contains: "status: 'active'"
  key_links:
    - from: "src/components/teacher/live-dashboard.tsx"
      to: "src/lib/dal/prediction.ts"
      via: "updatePredictionStatus server action -> updatePredictionStatusDAL"
      pattern: "status:\\s*'active'"
---

<objective>
Fix the "Close Predictions" button on sports brackets that throws "Invalid status data" error.

Purpose: The button sends `predictions_closed` which is not in the Zod enum, and even if it were, the auto transition map doesn't allow that transition. Sports brackets need their own transition map that goes `predictions_open -> active`.
Output: Working Close Predictions button for sports brackets.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/dal/prediction.ts
@src/components/teacher/live-dashboard.tsx
@src/lib/utils/validation.ts

<interfaces>
<!-- From src/lib/dal/prediction.ts -->
MANUAL_PREDICTION_TRANSITIONS: { draft: ['predictions_open'], predictions_open: ['active'], active: ['completed'] }
AUTO_PREDICTION_TRANSITIONS: { draft: ['predictions_open'], predictions_open: ['tabulating'], tabulating: ['previewing'], previewing: ['revealing', 'predictions_open'], revealing: ['completed'] }

<!-- Line 407: transition map selection -->
const transitions = bracket.predictiveResolutionMode === 'auto'
  ? AUTO_PREDICTION_TRANSITIONS
  : MANUAL_PREDICTION_TRANSITIONS

<!-- From src/lib/utils/validation.ts:143-146 -->
export const updatePredictionStatusSchema = z.object({
  bracketId: z.string().uuid(),
  status: z.enum(['predictions_open', 'active', 'tabulating', 'previewing', 'revealing', 'completed']),
})
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add sports bracket transition map and fix close predictions status</name>
  <files>src/lib/dal/prediction.ts, src/components/teacher/live-dashboard.tsx</files>
  <action>
**In `src/lib/dal/prediction.ts`:**

1. Add a new `SPORTS_PREDICTION_TRANSITIONS` map after `AUTO_PREDICTION_TRANSITIONS` (around line 373). Sports brackets use `predictiveResolutionMode: 'auto'` but don't use tabulation -- games resolve via API sync. The map should be:
   ```
   const SPORTS_PREDICTION_TRANSITIONS: Record<string, string[]> = {
     draft: ['predictions_open'],
     predictions_open: ['active'],
     active: ['completed'],
   }
   ```
   This mirrors `MANUAL_PREDICTION_TRANSITIONS` because sports brackets follow the same close-predictions flow (predictions_open -> active) rather than auto's tabulation flow.

2. Update the transition map selection logic (around line 407) to use a 3-way check:
   ```typescript
   const transitions =
     bracket.bracketType === 'sports'
       ? SPORTS_PREDICTION_TRANSITIONS
       : bracket.predictiveResolutionMode === 'auto'
         ? AUTO_PREDICTION_TRANSITIONS
         : MANUAL_PREDICTION_TRANSITIONS
   ```
   Sports bracket type check comes FIRST because sports brackets have `predictiveResolutionMode: 'auto'` but need different transitions.

3. Add a JSDoc comment above `SPORTS_PREDICTION_TRANSITIONS` explaining that sports brackets skip tabulation because games resolve via external API sync, not internal tabulation.

**In `src/components/teacher/live-dashboard.tsx`:**

4. In `handleClosePredictions` (line 925-934), change `status: 'predictions_closed'` to `status: 'active'`. The value `'predictions_closed'` is not in the Zod enum and was never valid. The correct status to send is `'active'` which represents "predictions are closed, live play begins".
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && grep -n "SPORTS_PREDICTION_TRANSITIONS" src/lib/dal/prediction.ts && grep -n "status: 'active'" src/components/teacher/live-dashboard.tsx | grep -i "closePrediction\|close" && grep -n "bracketType === 'sports'" src/lib/dal/prediction.ts</automated>
  </verify>
  <done>
    - SPORTS_PREDICTION_TRANSITIONS map exists with predictions_open -> active transition
    - DAL selects sports transition map when bracketType is 'sports'
    - handleClosePredictions sends status 'active' instead of 'predictions_closed'
    - No Zod validation error, no transition error for sports bracket Close Predictions
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify TypeScript compilation and no regressions</name>
  <files>src/lib/dal/prediction.ts, src/components/teacher/live-dashboard.tsx</files>
  <action>
1. Run TypeScript type-check to confirm no type errors introduced.
2. Verify the existing `AUTO_PREDICTION_TRANSITIONS` is still used for non-sports auto-mode brackets by confirming the ternary chain is correct.
3. Verify `'predictions_closed'` does NOT appear anywhere in the codebase (it was never a valid status).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | tail -5 && echo "---" && grep -rn "predictions_closed" src/ || echo "No predictions_closed references found (good)"</automated>
  </verify>
  <done>
    - TypeScript compiles with no errors
    - No remaining references to 'predictions_closed' in src/
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles cleanly
2. No references to invalid 'predictions_closed' status remain
3. SPORTS_PREDICTION_TRANSITIONS map exists and is used for sports brackets
4. AUTO_PREDICTION_TRANSITIONS still used for non-sports auto brackets
5. MANUAL_PREDICTION_TRANSITIONS still used for manual brackets
</verification>

<success_criteria>
Teacher can click "Close Predictions" on a sports bracket without error. The bracket transitions from predictions_open to active status. Non-sports predictive brackets are unaffected.
</success_criteria>

<output>
After completion, create `.planning/quick/46-fix-close-predictions-button-error-on-sp/46-SUMMARY.md`
</output>
