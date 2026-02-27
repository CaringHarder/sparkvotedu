---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/predictive-bracket.tsx
autonomous: true
requirements: [QUICK-14]

must_haves:
  truths:
    - "Submit button is visible above the bracket diagram in advanced mode, not hidden below it"
    - "Submit button in simple mode final card uses a prominent green color instead of muted primary"
    - "Submit button in advanced mode uses the same prominent green color"
    - "Disabled state is clearly different from enabled state (opacity change is more dramatic)"
    - "Button includes a progress indicator so students know how many picks remain"
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "Repositioned and restyled submit buttons for both prediction modes"
  key_links:
    - from: "submit button"
      to: "handleSubmit"
      via: "onClick handler"
      pattern: "onClick={handleSubmit}"
---

<objective>
Move the prediction bracket submit button to the top of the view and improve its color/visibility in both simple and advanced modes.

Purpose: Students filling out prediction brackets have trouble noticing the submit button because (1) in advanced mode it sits below the entire bracket diagram and (2) in both modes it uses the muted `bg-primary` color that barely changes from disabled to enabled state.

Output: Updated predictive-bracket.tsx with repositioned, more visible submit buttons.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/bracket/predictive-bracket.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move advanced mode submit button above bracket and restyle both modes</name>
  <files>src/components/bracket/predictive-bracket.tsx</files>
  <action>
In the `AdvancedPredictionMode` component (the editing/active return block starting around line 1121):

1. **Move the submit button from below the bracket diagram to above it.** Currently the layout is: Progress bar -> Bracket diagram -> Submit button. Change to: Progress bar + Submit button (same row or stacked) -> Bracket diagram. The submit button should be immediately visible without scrolling past the bracket.

2. **Restyle the submit button in advanced mode** (currently line 1151-1158):
   - Change from `bg-primary` to `bg-green-600 hover:bg-green-700 text-white` when enabled (matches the project's action button pattern used elsewhere like "Open Predictions" buttons)
   - Change disabled state from `disabled:opacity-50` to `disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400` so the transition from disabled to enabled is dramatic and obvious (gray -> green)
   - Make the button slightly larger: `py-3 text-base font-semibold` instead of `py-2.5 text-sm font-medium`
   - Add the progress count INTO the button text: when disabled show "Submit Predictions (X of Y picked)", when all selected show "Submit All Predictions" (or "Update Predictions" if hasSubmitted)

3. **Restyle the submit button in simple mode's "all picked" card** (around line 889-896):
   - Change from `bg-primary` to `bg-green-600 hover:bg-green-700 text-white`
   - Same disabled styling: `disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400`
   - Make slightly larger: `py-3 text-base font-semibold`

4. **Keep the handleSubmit, disabled logic, and isPending logic exactly the same** -- only change positioning and visual styling.

Do NOT change any teacher-facing buttons (Open Predictions, Close Predictions, etc.). Only modify the student-facing submit/update prediction buttons.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Visually inspect that the submit button markup appears BEFORE the bracket diagram div in the advanced mode JSX. Confirm both submit buttons use `bg-green-600` classes.
  </verify>
  <done>
Advanced mode submit button appears above the bracket diagram (not below). Both simple and advanced mode submit buttons use green-600 styling with dramatic disabled-to-enabled transition (gray to green). Button text includes progress count when not all picks are made.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- In the advanced mode active editing JSX, the submit `<button>` element appears before the bracket `<div>` in source order
- Both student submit buttons use `bg-green-600` (not `bg-primary`)
- Disabled buttons use gray background (not just opacity reduction)
- Button text shows pick progress when not all selected
</verification>

<success_criteria>
The prediction bracket submit button is prominently visible above the bracket content in advanced mode, uses an eye-catching green color in both modes, and transitions dramatically from a gray disabled state to a bright green enabled state as students complete their picks.
</success_criteria>

<output>
After completion, create `.planning/quick/14-move-prediction-bracket-submit-button-to/14-SUMMARY.md`
</output>
