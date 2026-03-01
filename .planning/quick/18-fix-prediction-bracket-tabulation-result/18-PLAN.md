---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/prediction.ts
  - src/actions/prediction.ts
  - src/components/bracket/predictive-bracket.tsx
autonomous: true
requirements: [QUICK-18]

must_haves:
  truths:
    - "Teacher sees correct vote counts (entrant1Votes, entrant2Votes) on PredictionPreview after remount"
    - "Teacher navigating away and back to a previewing bracket re-loads tabulation results automatically"
    - "Override winner still works and updates vote counts in the preview"
    - "Existing prepareResults flow continues to work (first tabulation still returns results directly)"
  artifacts:
    - path: "src/lib/dal/prediction.ts"
      provides: "getTabulationResults DAL function that re-computes tabulation from persisted predictions + matchup state"
      contains: "getTabulationResults"
    - path: "src/actions/prediction.ts"
      provides: "fetchTabulationResults server action callable from client"
      contains: "fetchTabulationResults"
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "useEffect that fetches tabulation results on mount when predictionStatus is previewing and tabulationResults is empty"
      contains: "fetchTabulationResults"
  key_links:
    - from: "src/components/bracket/predictive-bracket.tsx"
      to: "src/actions/prediction.ts"
      via: "useEffect calling fetchTabulationResults on mount"
      pattern: "fetchTabulationResults.*bracketId"
    - from: "src/actions/prediction.ts"
      to: "src/lib/dal/prediction.ts"
      via: "server action delegates to DAL"
      pattern: "getTabulationResults"
---

<objective>
Fix prediction bracket tabulation results being lost on component remount.

Purpose: In auto-mode predictive brackets, tabulationResults (vote counts per matchup) are stored only in React useState. When the component remounts after revalidatePath or navigation, results reset to [] and all matchups show 0 vs 0 votes in the PredictionPreview. The fix adds a read-only re-fetch that recomputes tabulation results from the persisted predictions and matchup data when the teacher returns to a bracket in "previewing" status.

Output: Working re-fetch of tabulation results on mount, preserving vote counts across remounts.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/dal/prediction.ts
@src/actions/prediction.ts
@src/components/bracket/predictive-bracket.tsx
@src/components/bracket/prediction-preview.tsx
@src/lib/bracket/predictive.ts
@src/lib/bracket/types.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/lib/bracket/types.ts:
```typescript
export interface TabulationResult {
  matchupId: string
  round: number
  position: number
  winnerId: string | null
  entrant1Id: string | null
  entrant2Id: string | null
  entrant1Votes: number
  entrant2Votes: number
  totalVotes: number
  status: 'resolved' | 'tie' | 'no_predictions'
}

export interface TabulationInput {
  matchupId: string
  round: number
  position: number
  entrant1Id: string | null
  entrant2Id: string | null
  isBye: boolean
  nextMatchupId: string | null
}
```

From src/lib/dal/prediction.ts:
```typescript
// tabulateBracketPredictions (line 498) already:
// 1. Fetches all predictions from DB
// 2. Fetches all matchups
// 3. Calls pure tabulatePredictions() engine
// 4. Writes winners to matchups (mutation step)
// 5. Returns { results: TabulationResult[], unresolvedCount }
//
// The new getTabulationResults function should do steps 1-3 ONLY (read-only)
// to recompute vote counts without mutating anything.
```

From src/actions/prediction.ts:
```typescript
// prepareResults (line 198) - calls tabulateBracketPredictions, auth-gated
// overrideWinner (line 252) - calls overrideMatchupWinnerDAL, auth-gated
// Both use: const teacher = await getAuthenticatedTeacher()
// Both use: canUseBracketType(teacher.subscriptionTier, 'predictive')
// Both use: revalidatePath(`/brackets/${bracketId}`)
```

From src/components/bracket/predictive-bracket.tsx:
```typescript
// TeacherPredictiveView (line 85):
//   const [tabulationResults, setTabulationResults] = useState<TabulationResult[]>([])
//   const [unresolvedCount, setUnresolvedCount] = useState(0)
//
//   predictionStatus === 'previewing' renders PredictionPreview with tabulationResults prop
//   BUG: On remount, tabulationResults is [] -> preview shows 0 vs 0
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add read-only getTabulationResults DAL + server action</name>
  <files>src/lib/dal/prediction.ts, src/actions/prediction.ts</files>
  <action>
1. In `src/lib/dal/prediction.ts`, add a new exported function `getTabulationResults(bracketId: string, teacherId: string)` that:
   - Fetches the bracket (findFirst with teacherId ownership check) selecting id, bracketType, predictiveResolutionMode, predictionStatus, size, maxEntrants
   - Validates bracketType is 'predictive' and predictiveResolutionMode is 'auto'
   - Validates predictionStatus is 'previewing' (the only status where re-fetch is needed)
   - Fetches all predictions from DB (same query as tabulateBracketPredictions lines 538-545)
   - Fetches all matchups (same query as tabulateBracketPredictions lines 548-559)
   - Builds TabulationInput[] and calls the pure `tabulatePredictions()` engine (same as lines 562-577)
   - However, for matchups that already have a winnerId set in the DB (from prior tabulation or override), use that winnerId as the authoritative winner instead of the pure engine result. This ensures overrides are preserved. Do this by: after computing pure results, iterate the results and for each one, check if the DB matchup has a non-null winnerId. If so, override the result's winnerId with the DB winnerId and set status to 'resolved'.
   - Computes unresolvedCount from results where status !== 'resolved'
   - Returns `{ results: TabulationResult[], unresolvedCount }` or `{ error: string }`
   - This function does NOT write anything to DB -- purely read-only

2. In `src/actions/prediction.ts`, add a new exported server action `fetchTabulationResults(input: unknown)`:
   - Uses 'use server' (already at top of file)
   - Auth-gates with `getAuthenticatedTeacher()` (same pattern as prepareResults)
   - Validates input with `prepareResultsSchema` (same schema -- only needs bracketId)
   - Feature-gates with `canUseBracketType(teacher.subscriptionTier, 'predictive')`
   - Calls `getTabulationResults(bracketId, teacher.id)` from the DAL
   - Returns the result directly (no revalidatePath -- this is read-only)
   - Import `getTabulationResults` from `@/lib/dal/prediction`
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>getTabulationResults DAL function and fetchTabulationResults server action exist, type-check passes, both are read-only (no DB writes)</done>
</task>

<task type="auto">
  <name>Task 2: Auto-fetch tabulation results on mount in TeacherPredictiveView</name>
  <files>src/components/bracket/predictive-bracket.tsx</files>
  <action>
In `TeacherPredictiveView` component (line 85 of predictive-bracket.tsx):

1. Import `fetchTabulationResults` from `@/actions/prediction` (add to existing import block at line 8-16).

2. Add a `useEffect` after the existing state declarations (after line 103) that auto-fetches tabulation results when the component mounts in previewing status with empty results:

```typescript
// Re-fetch tabulation results on mount when in previewing status
// (results are lost on remount since they live in useState only)
useEffect(() => {
  if (isAutoMode && predictionStatus === 'previewing' && tabulationResults.length === 0) {
    fetchTabulationResults({ bracketId: bracket.id }).then((result) => {
      if (result && 'results' in result && result.results) {
        setTabulationResults(result.results as TabulationResult[])
        setUnresolvedCount(result.unresolvedCount ?? 0)
      }
    })
  }
}, [isAutoMode, predictionStatus, bracket.id]) // eslint-disable-line react-hooks/exhaustive-deps
// NOTE: Intentionally omit tabulationResults.length from deps to avoid refetch loop.
// We only want this to run on mount/status change, not when results are updated by user actions.
```

Key points:
- Only fires when predictionStatus is 'previewing' AND tabulationResults is empty
- Does NOT fire during other statuses (predictions_open, revealing, etc.)
- Does NOT overwrite results that were just set by handlePrepareResults or handleOverrideWinner
- The eslint-disable comment is necessary because we intentionally exclude tabulationResults.length from the dependency array to prevent an infinite refetch loop
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>When a teacher navigates to a bracket in 'previewing' status, the component auto-fetches tabulation results and displays correct vote counts. Existing flows (prepareResults, overrideWinner) continue to work unchanged since they set state directly.</done>
</task>

</tasks>

<verification>
1. TypeScript compilation passes: `npx tsc --noEmit`
2. Manual test flow:
   - Create a predictive bracket with auto resolution mode
   - Open predictions, have students submit predictions
   - Click "Close Predictions & Prepare Results" -- verify preview shows vote counts
   - Navigate away from the bracket page, then navigate back -- verify vote counts are still visible (not 0 vs 0)
   - Override a winner in preview -- verify counts update correctly
   - Navigate away and back again -- verify override is preserved and counts still show
</verification>

<success_criteria>
- Tabulation results (vote counts per matchup) survive component remounts during previewing status
- No regression in existing prepareResults, overrideWinner, releaseResults, or revealNextRound flows
- Teacher dashboard shows correct entrant1Votes/entrant2Votes after page refresh or navigation
- Read-only re-fetch does not mutate any database state
</success_criteria>

<output>
After completion, create `.planning/quick/18-fix-prediction-bracket-tabulation-result/18-SUMMARY.md`
</output>
