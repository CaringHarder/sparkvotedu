---
phase: quick-24
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/student/simple-poll-vote.tsx
autonomous: true
requirements: [QUICK-24]
must_haves:
  truths:
    - "VOTE button appears between the question heading and the option cards"
    - "Change Vote button also appears above option cards after submission"
    - "Success state banner remains above VOTE button position (below question)"
  artifacts:
    - path: "src/components/student/simple-poll-vote.tsx"
      provides: "Reordered JSX with vote button above options grid"
  key_links: []
---

<objective>
Move the VOTE button above the option cards in simple poll mode.

Purpose: Students currently must scroll past all option cards to find the VOTE button. Moving it between the question and options means students see the call-to-action immediately after selecting an option, reducing confusion for younger students.
Output: Updated simple-poll-vote.tsx with reordered JSX
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/student/simple-poll-vote.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move VOTE and Change Vote buttons above options grid</name>
  <files>src/components/student/simple-poll-vote.tsx</files>
  <action>
In simple-poll-vote.tsx, reorder the JSX blocks inside the root div so the layout becomes:

1. Poll question heading (lines 79-86 -- unchanged)
2. Success state banner (lines 89-111 -- unchanged)
3. Action buttons block (currently lines 205-228) -- move this ABOVE the options grid
4. Error message (lines 200-202 -- move alongside action buttons, keep above options)
5. Options grid (lines 113-197 -- unchanged content, just lower in order)
6. Live results section (lines 231-271 -- unchanged)

The action buttons div and error message simply move up in the JSX order. No styling, class, or logic changes needed -- pure JSX reorder.

Important: Keep the exact same className, conditional rendering, and onClick handlers on every element. This is strictly a cut-and-paste reorder of existing JSX blocks.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>VOTE button renders between the question/success-state and the option cards. No TypeScript errors. All existing functionality preserved.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual check: VOTE button appears above option cards, not below
</verification>

<success_criteria>
- VOTE button renders between question heading and option card grid
- Change Vote button also appears above options after submission
- No regressions in voting flow (select, submit, change vote)
</success_criteria>

<output>
After completion, create `.planning/quick/24-move-vote-button-above-choices-in-simple/24-SUMMARY.md`
</output>
