---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/predictive-bracket.tsx
autonomous: true
requirements: [QUICK-02]

must_haves:
  truths:
    - "Student in prediction bracket simple mode sees one matchup at a time, not all at once"
    - "A 'Matchup X of Y' counter is displayed above the current matchup"
    - "When student taps a prediction choice, a 'Vote Submitted!' confirmation card appears briefly"
    - "After confirmation, the next matchup slides in from the right"
    - "After all predictions are made, a 'Submit All Predictions' button appears for batch submission"
    - "Cascade still works: picking a Round 1 winner populates the Round 2 matchup speculatively"
    - "Read-only and closed states are unchanged"
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "Updated SimplePredictionMode with one-at-a-time UX"
      contains: "AnimatePresence"
  key_links:
    - from: "SimplePredictionMode (one-at-a-time UI)"
      to: "usePredictionCascade hook"
      via: "selectableMatchups array indexed by currentIndex"
      pattern: "selectableMatchups\\[.*Index\\]"
---

<objective>
Rewrite the SimplePredictionMode component inside predictive-bracket.tsx to show one matchup at a time (matching the SE bracket SimpleVotingView pattern) instead of rendering all matchups as a scrollable list with a single "Submit All Predictions" button.

Purpose: Prediction brackets in simple mode currently overwhelm younger students by showing all matchups for all rounds simultaneously. The one-at-a-time pattern (already proven in SE bracket simple mode) provides a focused, distraction-free experience.

Output: Updated SimplePredictionMode component with sequential matchup presentation, animated transitions, and batch submit at end.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Reference files (read before implementing):
@src/components/student/simple-voting-view.tsx (SE bracket simple mode - the reference pattern for one-at-a-time UX with AnimatePresence, confirmation card, slide animations)
@src/components/bracket/predictive-bracket.tsx (target file - SimplePredictionMode function starts at line 700)
@src/hooks/use-prediction-cascade.ts (provides selectableMatchups, selections, handleSelect, allSelected - used by SimplePredictionMode)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite SimplePredictionMode to show one matchup at a time with animated transitions</name>
  <files>src/components/bracket/predictive-bracket.tsx</files>
  <action>
Rewrite the `SimplePredictionMode` function (lines ~700-863) to show one matchup at a time instead of all at once. Add `motion` and `AnimatePresence` imports from 'motion/react' (already used elsewhere in the project).

Key changes to SimplePredictionMode:

1. **Add state:** `const [currentIndex, setCurrentIndex] = useState(0)` and `const [showConfirmation, setShowConfirmation] = useState(false)` -- same pattern as SimpleVotingView.

2. **Derive current matchup:** From `selectableMatchups[safeIndex]` where `safeIndex = Math.max(0, Math.min(currentIndex, selectableMatchups.length - 1))`. Note: `selectableMatchups` comes from `usePredictionCascade` and dynamically grows as earlier-round picks cascade into later rounds. This is the key difference from voting -- the list grows as the user makes picks.

3. **Track whether all are picked:** `const allPicked = currentIndex >= selectableMatchups.length && allSelected`. When all predictions are made, show the submit button (not the "all done waiting" state from voting).

4. **Modify the prediction form section** (the `return` block at line ~825). Replace the `space-y-2` list of all MatchupPredictionCards with an AnimatePresence-based one-at-a-time display:

   a. **Progress indicator:** Show "Prediction {safeIndex + 1} of {totalSelectableCount}" (not "Matchup" to distinguish from voting). Hide when showing confirmation or when all picked.

   b. **AnimatePresence mode="wait"** wrapping three states:
      - **All picked (allPicked=true):** Show the submit button card with the existing submit handler. Use motion.div with `initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }}`. Display: green checkmark circle, "All predictions made!" text, progress bar showing `{selectedCount} of {totalSelectableCount}`, and the submit button: `{isPending ? 'Submitting...' : hasSubmitted ? 'Update Predictions' : 'Submit All Predictions'}`. Keep the existing disabled logic: `disabled={!allSelected || isPending}`.
      - **Confirmation (showConfirmation=true):** Same "Vote Submitted!" card as SimpleVotingView (lines 225-245). Use `initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ x: -300, opacity: 0 }}`.
      - **Current matchup:** Wrap `MatchupPredictionCard` in motion.div with `initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}`. Modify the `onSelect` callback: when the student taps an entrant, call `handleSelect(matchup.id, entrantId)` as before, BUT then show the confirmation and auto-advance:
        ```
        onSelect={(entrantId) => {
          handleSelect(matchup.id, entrantId)
          setShowConfirmation(true)
          setTimeout(() => {
            setShowConfirmation(false)
            setCurrentIndex((i) => i + 1)
          }, 1200)
        }}
        ```

5. **Keep the existing states unchanged:**
   - The `isLoading` return (line 775-777) -- unchanged
   - The `!isPredictionsOpen` return (lines 780-796) -- unchanged
   - The `hasSubmitted && !isEditing` return (lines 799-822) -- unchanged

6. **Handle cascade growth:** Since `selectableMatchups` grows as earlier picks cascade, the "X of Y" counter naturally updates. The `totalSelectableCount` from usePredictionCascade already accounts for this. However, `currentIndex` might temporarily exceed `selectableMatchups.length` during cascade computation. Handle this by only showing "all picked" state when `allSelected` is also true (not just when index >= length).

7. **Handle "go back" for predictions:** Unlike voting (which is permanent per-matchup), predictions can be changed. Add a small "Back" button (or tap the counter) to go to previous matchup: `setCurrentIndex((i) => Math.max(0, i - 1))`. Show this only when `currentIndex > 0` and not showing confirmation. Style: subtle text button below the counter, like `"< Previous"`.

8. **Wrap the whole form section** in `<div className="mx-auto max-w-md px-2 py-4 sm:px-4 sm:py-6">` for consistent sizing with SimpleVotingView.

Important: Do NOT modify MatchupPredictionCard itself. The onSelect prop already handles the selection logic. The change is purely in SimplePredictionMode's layout/flow.

Important: Do NOT change the `usePredictionCascade` hook. It already provides everything needed.

Important: Keep the existing `handleSubmit` function. The batch submit at the end is the same -- just the presentation flow changes.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Visually inspect the component renders: create or open a predictive bracket in simple mode as a student and verify one matchup shows at a time with the "Prediction X of Y" counter, confirmation animation, and slide transitions.
  </verify>
  <done>
SimplePredictionMode shows one MatchupPredictionCard at a time with "Prediction X of Y" counter. Tapping a choice shows "Vote Submitted!" confirmation (1.2s), then next matchup slides in from right. After all picks are made, "Submit All Predictions" button appears. Back navigation allows revisiting previous predictions. Cascade still works (picking round 1 winners populates round 2 matchups). The read-only, closed, and submitted-not-editing states are unchanged.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Prediction bracket simple mode shows one matchup at a time
3. "Prediction X of Y" counter displays correctly and updates as cascade adds matchups
4. Tapping an entrant shows confirmation card, then auto-advances
5. After all predictions made, submit button appears
6. Submit button works (batch submits all predictions)
7. "Previous" button allows navigating back to change earlier picks
8. Read-only state after submission is unchanged
9. Closed/draft state is unchanged
</verification>

<success_criteria>
Prediction bracket simple mode displays one matchup at a time with animated transitions, matching the UX pattern of SE bracket simple mode. Predictions cascade correctly through rounds, and the batch submit at the end works as before.
</success_criteria>

<output>
After completion, create `.planning/quick/2-make-prediction-bracket-simple-mode-show/2-SUMMARY.md`
</output>
