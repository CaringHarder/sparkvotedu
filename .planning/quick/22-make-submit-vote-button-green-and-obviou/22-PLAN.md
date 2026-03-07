---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/student/simple-poll-vote.tsx
autonomous: true
requirements: [QUICK-22]

must_haves:
  truths:
    - "Poll submit vote button turns bright green when an option is selected"
    - "Button text is large, clear, and unmissable for younger students"
    - "Disabled state remains visually muted (grayed out) before selection"
  artifacts:
    - path: "src/components/student/simple-poll-vote.tsx"
      provides: "Green submit vote button styling"
  key_links: []
---

<objective>
Make the "Submit Vote" button in simple poll mode bright green and attention-grabbing when active.

Purpose: Younger students cannot easily identify the current black/white submit button. It needs to be unmissable -- large, green, and obvious once they have selected an option.

Output: Updated poll submit button with bright green active styling.

Note: Bracket simple mode (MatchupVoteCard) does NOT have a separate submit button -- students tap the entrant directly, which already highlights green. Only the poll component needs this fix.
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
  <name>Task 1: Restyle poll Submit Vote button to bright green when active</name>
  <files>src/components/student/simple-poll-vote.tsx</files>
  <action>
Update the Submit Vote Button (around line 207-214) in SimplePollVote:

1. When ENABLED (option selected, not submitting): Apply bright green background with white text, larger padding, and a subtle pulse/bounce animation to draw attention. Use these specific classes:
   - `bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30`
   - `text-xl font-bold py-7 min-w-[240px]`
   - Add `animate-bounce` class briefly or a subtle `ring-4 ring-green-300/50` glow to make it pop
   - Use inline className override (not the default Button variant) so it overrides the shadcn default styling

2. When DISABLED (no option selected): Keep the existing muted/gray appearance so the contrast is stark. Use:
   - `bg-muted text-muted-foreground` when disabled
   - No shadow, no glow

3. The "Submitting..." state should show green but slightly muted: `bg-green-400 text-white` without the glow/shadow.

4. Keep the existing `size="lg"` prop. Add `className` with conditional styles based on `!selectedOptionId || submitting`:
   ```
   className={`min-w-[240px] text-xl font-bold py-7 ${
     !selectedOptionId
       ? ''
       : submitting
         ? 'bg-green-400 hover:bg-green-400 text-white border-0'
         : 'bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg shadow-green-500/30 ring-4 ring-green-300/50 animate-[pulse_2s_ease-in-out_infinite]'
   }`}
   ```

This makes the button transform from invisible/muted to an unmissable bright green beacon the moment a student taps an option.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Submit Vote button in simple poll mode is bright green with glow effect when an option is selected, muted/gray when no option selected, and slightly muted green while submitting. The button is large (text-xl, py-7, min-w-240px) and impossible to miss.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual: In simple poll mode, select an option -- button should turn bright green with a pulsing glow ring
- Visual: Before selecting, button should be muted/gray and unobtrusive
</verification>

<success_criteria>
Submit Vote button is bright green, large, and attention-grabbing when active in simple poll mode. Younger students cannot miss it.
</success_criteria>

<output>
After completion, create `.planning/quick/22-make-submit-vote-button-green-and-obviou/22-SUMMARY.md`
</output>
