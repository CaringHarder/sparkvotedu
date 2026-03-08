---
phase: quick-23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/student/simple-poll-vote.tsx
autonomous: true
requirements: [QUICK-23]
must_haves:
  truths:
    - "Green glowing vote button in simple mode polls displays 'VOTE' instead of 'Submit Vote'"
  artifacts:
    - path: "src/components/student/simple-poll-vote.tsx"
      provides: "Vote button with updated label"
      contains: "'VOTE'"
  key_links: []
---

<objective>
Change the submit button text in simple poll voting from "Submit Vote" to "VOTE".

Purpose: Shorter, punchier button label for the simple mode vote button.
Output: Updated simple-poll-vote.tsx with new button text.
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
  <name>Task 1: Change vote button text from "Submit Vote" to "VOTE"</name>
  <files>src/components/student/simple-poll-vote.tsx</files>
  <action>
    On line 219 of src/components/student/simple-poll-vote.tsx, change:
      {submitting ? 'Submitting...' : 'Submit Vote'}
    to:
      {submitting ? 'Voting...' : 'VOTE'}

    Also update the submitting state text from "Submitting..." to "Voting..." for consistency with the shorter label style.
  </action>
  <verify>
    <automated>grep -n "'VOTE'" src/components/student/simple-poll-vote.tsx && npx next build --no-lint 2>&1 | tail -3</automated>
  </verify>
  <done>Button displays "VOTE" in default state and "Voting..." while submitting. Build succeeds.</done>
</task>

</tasks>

<verification>
grep confirms 'VOTE' appears in simple-poll-vote.tsx and 'Submit Vote' does not.
</verification>

<success_criteria>
- Simple mode poll vote button reads "VOTE" instead of "Submit Vote"
- Submitting state reads "Voting..." instead of "Submitting..."
- No build errors
</success_criteria>

<output>
After completion, create `.planning/quick/23-change-submit-vote-button-text-to-vote-i/23-SUMMARY.md`
</output>
