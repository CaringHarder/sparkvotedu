---
phase: quick-21
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/matchup-vote-card.tsx
  - src/components/student/simple-poll-vote.tsx
  - src/components/student/simple-voting-view.tsx
autonomous: true
requirements: [QUICK-21]

must_haves:
  truths:
    - "Bracket simple mode entrant buttons are significantly larger with bigger text, images, and tap targets"
    - "Poll simple mode option cards are significantly larger with bigger text, images, and tap targets"
    - "Submit Vote button is larger and more prominent for younger students"
    - "Layout remains responsive and usable on mobile screens"
  artifacts:
    - path: "src/components/bracket/matchup-vote-card.tsx"
      provides: "Enlarged entrant buttons with bigger images, text, and min-height"
    - path: "src/components/student/simple-poll-vote.tsx"
      provides: "Enlarged poll option cards with bigger images, text, min-height, and submit button"
    - path: "src/components/student/simple-voting-view.tsx"
      provides: "Larger container width and spacing for simple bracket voting"
  key_links:
    - from: "src/components/student/simple-voting-view.tsx"
      to: "src/components/bracket/matchup-vote-card.tsx"
      via: "MatchupVoteCard component usage"
      pattern: "<MatchupVoteCard"
---

<objective>
Enlarge cards, buttons, text, and images in simple voting modes for both brackets and polls to improve usability for younger students.

Purpose: Simple mode is designed for younger students who need large, easy-to-tap targets. Current sizing is still too small -- cards, images, text, and buttons all need to be bigger.
Output: Enlarged UI elements across simple-poll-vote.tsx, matchup-vote-card.tsx, and simple-voting-view.tsx
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/bracket/matchup-vote-card.tsx
@src/components/student/simple-poll-vote.tsx
@src/components/student/simple-voting-view.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enlarge bracket simple mode matchup vote cards</name>
  <files>src/components/bracket/matchup-vote-card.tsx, src/components/student/simple-voting-view.tsx</files>
  <action>
In matchup-vote-card.tsx, enlarge the entrant buttons for a more kid-friendly experience:

1. Increase entrant button min-height from `min-h-20` to `min-h-32 sm:min-h-40` for much larger tap targets
2. Increase entrant button padding from `px-6 py-6` to `px-6 py-8 sm:py-10`
3. Increase entrant name text from `text-2xl sm:text-3xl` to `text-3xl sm:text-4xl`
4. Increase entrant image from `h-28 w-28 sm:h-36 sm:w-36` to `h-36 w-36 sm:h-44 sm:w-44`
5. Increase image margin-bottom from `mb-2` to `mb-3`
6. Increase the VS text from `text-sm` to `text-lg sm:text-xl`
7. Increase TBD text from `text-2xl sm:text-3xl` to `text-3xl sm:text-4xl`
8. Increase outer card padding from `p-6` to `p-6 sm:p-8`
9. Increase voted checkmark badge from `h-6 w-6` to `h-8 w-8` and inner icon from `h-4 w-4` to `h-5 w-5`

In simple-voting-view.tsx:
1. Increase max-w container from `max-w-2xl` to `max-w-3xl` (both in the main view div and the waiting state div) to give cards more room
2. Increase the bracket name heading from `text-2xl sm:text-3xl` to `text-3xl sm:text-4xl`
3. Increase progress indicator text from `text-sm` to `text-base sm:text-lg`
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Bracket simple mode entrant buttons, images, text, and VS divider are all visibly larger. Container is wider to accommodate bigger cards.</done>
</task>

<task type="auto">
  <name>Task 2: Enlarge poll simple mode option cards and submit button</name>
  <files>src/components/student/simple-poll-vote.tsx</files>
  <action>
In simple-poll-vote.tsx, enlarge the poll option cards and submit button:

1. Increase poll question heading from `text-xl sm:text-2xl` to `text-2xl sm:text-3xl`
2. For 2-option layout: increase card width from `sm:w-64 md:w-72` to `sm:w-72 md:w-80`
3. For 2-option CardContent: increase min-height from `min-h-[120px] sm:min-h-[140px]` to `min-h-[160px] sm:min-h-[200px]`
4. For 3+ option CardContent: increase min-height from `min-h-[80px]` to `min-h-[120px] sm:min-h-[140px]`
5. For 3+ option CardContent: increase padding from `px-3 py-4` to `px-4 py-6`
6. Increase option image thumbnail: 2-option from `h-16 w-16` to `h-20 w-20 sm:h-24 sm:w-24`, standard from `h-12 w-12` to `h-16 w-16 sm:h-20 sm:w-20`
7. Increase option text: 2-option from `text-base sm:text-lg` to `text-lg sm:text-xl`, standard from `text-sm sm:text-base` to `text-base sm:text-lg`
8. Increase selection checkmark from `h-6 w-6` to `h-8 w-8` and inner icon from width/height 14 to 18
9. Increase Submit Vote button: add `text-lg py-6` classes and increase min-width from `min-w-[160px]` to `min-w-[200px]`
10. Increase Change Vote button similarly with `text-lg py-6`
11. Increase gap between option cards: 2-option from `gap-4 sm:gap-6` to `gap-5 sm:gap-8`, grid from `gap-3` to `gap-4 sm:gap-5`
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Poll simple mode option cards are taller with larger text, images, and tap targets. Submit button is larger and more prominent. Grid gaps are wider for visual breathing room.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual check: bracket simple mode shows much larger entrant buttons with bigger images and text
- Visual check: poll simple mode shows much larger option cards with bigger text and images
- Visual check: Submit Vote button is large and prominent
- Visual check: layout is responsive and works on mobile without horizontal overflow
</verification>

<success_criteria>
All simple mode voting cards, buttons, images, and text are significantly enlarged compared to before. The UI is clearly designed for younger students with large, easy-to-tap targets. No TypeScript errors.
</success_criteria>

<output>
After completion, create `.planning/quick/21-make-bigger-cards-buttons-for-simple-mod/21-SUMMARY.md`
</output>
