---
phase: quick
plan: 260324-l3w
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/student/ranked-poll-vote.tsx
autonomous: true
must_haves:
  truths:
    - "Ranked poll submit button appears ABOVE the options grid, matching simple poll layout"
    - "Submit button shows 'VOTE' text with green glowing pulse styling when rankings complete"
    - "Disabled state shows 'Rank N more' with default disabled styling"
    - "Submitting state shows 'Voting...' with muted green styling"
  artifacts:
    - path: "src/components/student/ranked-poll-vote.tsx"
      provides: "Ranked poll voting UI matching simple poll visual pattern"
  key_links: []
---

<objective>
Fix ranked poll voting UI to match simple poll visual pattern: move action buttons above the choices grid, apply green glowing VOTE button styling, and match button sizing.

Purpose: Visual consistency between poll types so students see the same familiar VOTE button pattern.
Output: Updated ranked-poll-vote.tsx with matching layout and styling.
</objective>

<execution_context>
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/workflows/execute-plan.md
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/student/ranked-poll-vote.tsx
@src/components/student/simple-poll-vote.tsx (reference for target styling)
</context>

<interfaces>
<!-- Target styling from simple-poll-vote.tsx lines 118-141 -->

Layout order in SimplePollVote:
1. Poll question
2. Success state (submitted)
3. Error message
4. Action buttons (ABOVE options)
5. Options grid

Button styling (SimplePollVote lines 125-131):
```tsx
className={`min-w-[240px] text-xl font-bold py-7 ${
  !selectedOptionId
    ? ''
    : submitting
      ? 'bg-green-400 hover:bg-green-400 text-white border-0'
      : 'bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30 ring-4 ring-green-300/50 animate-[pulse_2s_ease-in-out_infinite]'
}`}
```

Button text: `{submitting ? 'Voting...' : 'VOTE'}`
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Restyle and reposition ranked poll action buttons to match simple poll</name>
  <files>src/components/student/ranked-poll-vote.tsx</files>
  <action>
In `src/components/student/ranked-poll-vote.tsx`, make these changes:

1. **Move action buttons section (lines 191-226) from BELOW the options grid to ABOVE it.** The new order should be:
   - Poll question
   - Success state (submitted)
   - Ranking counter
   - Error message
   - Action buttons (submit + undo/reset + change rankings)
   - Options grid

2. **Restyle the submit button** to match SimplePollVote exactly:
   - Change `className` from `"min-w-[180px]"` to use conditional classes:
     - When not complete (disabled): no extra classes (default disabled styling)
     - When submitting: `'bg-green-400 hover:bg-green-400 text-white border-0 min-w-[240px] text-xl font-bold py-7'`
     - When complete and ready: `'bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30 ring-4 ring-green-300/50 animate-[pulse_2s_ease-in-out_infinite] min-w-[240px] text-xl font-bold py-7'`
   - Always include `min-w-[240px] text-xl font-bold py-7` sizing classes.

3. **Change button text:**
   - "Submit Rankings" -> "VOTE"
   - "Submitting..." -> "Voting..."
   - Keep "Rank N more" text for the disabled incomplete state

4. **Keep the undo/reset buttons** in the same flex container but visually secondary (they remain `variant="outline" size="sm"`).

The resulting JSX order of the action buttons section should be:
```tsx
{/* Action buttons */}
<div className="flex flex-wrap items-center justify-center gap-3">
  {/* Submit button */}
  {!submitted && (
    <Button
      size="lg"
      onClick={submitVote}
      disabled={!isComplete || submitting}
      className={`min-w-[240px] text-xl font-bold py-7 ${
        !isComplete
          ? ''
          : submitting
            ? 'bg-green-400 hover:bg-green-400 text-white border-0'
            : 'bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30 ring-4 ring-green-300/50 animate-[pulse_2s_ease-in-out_infinite]'
      }`}
    >
      {submitting
        ? 'Voting...'
        : isComplete
          ? 'VOTE'
          : `Rank ${maxRankings - rankings.length} more`}
    </Button>
  )}

  {/* Change rankings button */}
  {submitted && canChangeVote && (
    <Button variant="outline" size="lg" onClick={enableChangeVote}>
      Change Rankings
    </Button>
  )}

  {/* Undo / Reset buttons */}
  {rankings.length > 0 && !submitted && (
    <>
      <Button variant="outline" size="sm" onClick={undoLastRanking}>
        Undo Last
      </Button>
      <Button variant="outline" size="sm" onClick={resetRankings}>
        Reset All
      </Button>
    </>
  )}
</div>
```
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/components/student/ranked-poll-vote.tsx 2>&1 | head -20</automated>
  </verify>
  <done>
    - Submit button renders ABOVE the options grid
    - Complete rankings show green glowing "VOTE" button with pulse animation
    - Incomplete rankings show disabled "Rank N more" button
    - Submitting state shows muted green "Voting..." button
    - Button sizing matches simple poll (min-w-[240px] text-xl font-bold py-7)
    - Undo/Reset buttons remain functional alongside submit
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
- TypeScript compilation passes with no errors
- Visual inspection: ranked poll action buttons appear above options grid
- Visual inspection: green glowing VOTE button matches simple poll appearance
</verification>

<success_criteria>
Ranked poll voting UI is visually consistent with simple poll: VOTE button above choices with green glow styling, matching sizing, and correct text labels.
</success_criteria>

<output>
After completion, create `.planning/quick/260324-l3w-fix-ranked-poll-ui-to-match-poll-ui-acti/SUMMARY.md`
</output>
