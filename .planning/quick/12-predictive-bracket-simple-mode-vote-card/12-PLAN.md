---
phase: quick-12
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/predictive-bracket.tsx
autonomous: true
requirements: [QUICK-12]

must_haves:
  truths:
    - "Predictive simple mode vote cards are visually the same size as SE simple mode vote cards"
    - "Entrant images in predictive simple mode are large squares (h-28 w-28, sm:h-36 sm:w-36) matching SE cards"
    - "Entrant names in predictive simple mode use large text (text-2xl sm:text-3xl) matching SE cards"
    - "Cards stack vertically on mobile and sit side-by-side on sm+ screens with VS divider, matching SE layout"
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "Restyled MatchupPredictionCard matching SE MatchupVoteCard sizing"
      contains: "h-28 w-28"
  key_links:
    - from: "MatchupPredictionCard"
      to: "MatchupVoteCard styling"
      via: "matching Tailwind classes"
      pattern: "h-28 w-28.*sm:h-36 sm:w-36"
---

<objective>
Resize the predictive bracket simple mode `MatchupPredictionCard` to match the large, kid-friendly card sizes used by the SE bracket `MatchupVoteCard`.

Purpose: The current predictive simple mode cards are tiny inline buttons with 20px images and small text. SE simple mode uses large tappable cards with 112-144px images and 2xl-3xl text. Young students need the same large, easy-to-tap card format for predictions.

Output: Updated `MatchupPredictionCard` component with matching visual sizing.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/bracket/matchup-vote-card.tsx (SE simple mode reference - the TARGET styling)
@src/components/bracket/predictive-bracket.tsx (contains MatchupPredictionCard - the component to fix)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restyle MatchupPredictionCard to match SE MatchupVoteCard sizing</name>
  <files>src/components/bracket/predictive-bracket.tsx</files>
  <action>
Rewrite the `MatchupPredictionCard` component (approx lines 1213-1283) to match the visual layout and sizing of `MatchupVoteCard` in `matchup-vote-card.tsx`. The changes are CSS/layout only -- do NOT change the selection logic, props, or `onSelect` callback behavior.

Specific changes to `MatchupPredictionCard`:

1. **Outer container**: Change from `rounded-lg border p-3` to match SE card's `w-full max-w-2xl rounded-xl border border-gray-300 dark:border-border bg-card p-6 shadow-sm`. Keep the green background on `hasVoted` and dashed blue border on `isSpeculative`.

2. **Round/match label**: Keep the round/match info and speculative badge at top, but bump from `text-xs` to `text-sm` and add `mb-3 flex items-center justify-center` for centering, similar to how SE card centers its status badge.

3. **Layout**: Change from `grid grid-cols-[1fr_auto_1fr] items-center gap-2` to match SE card's `flex flex-col items-stretch gap-3 sm:flex-row sm:items-center` layout (stacked vertically on mobile, side by side on larger screens).

4. **Entrant buttons**: Replace the current small inline buttons with large tappable buttons matching SE card style:
   - Outer button: `relative flex min-h-20 flex-1 flex-col items-center justify-center rounded-xl border-2 px-6 py-6 transition-all duration-200`
   - When interactive (no selection yet): `cursor-pointer hover:scale-105 active:scale-95`
   - When selected: `border-primary bg-primary/10 shadow-md` (keep the primary color theme for predictions rather than green, since green is for SE votes)
   - When not selected (after other is picked): `border-border bg-muted/50 opacity-50`
   - Default: `border-border bg-card hover:border-primary/50`
   - Image: Change from `h-5 w-5 rounded-md` to `mb-2 h-28 w-28 overflow-hidden rounded-lg sm:h-36 sm:w-36` with `<img>` using `h-full w-full object-cover`
   - Name text: Change from `text-sm truncate` to `text-center text-2xl font-semibold sm:text-3xl`
   - Check icon: Move from inline `ml-auto h-3.5 w-3.5` to absolute positioned top-right badge matching SE card style: `absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs` with a checkmark SVG inside

5. **VS divider**: Change from `text-xs font-medium` to `flex-shrink-0 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground` matching SE card.

6. **TBD state**: If entrant is null, render `<div>` with `flex min-h-20 flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 px-6 py-6` containing `<span className="text-2xl font-medium text-muted-foreground italic sm:text-3xl">TBD</span>` (matching SE card's TBD state).

Do NOT change:
- The component props interface
- The `onSelect` callback logic
- The `selectedWinnerId` comparison logic
- The `isSpeculative` prop handling (keep the dashed blue border and badge)
- Any other components in the file (SimplePredictionMode, AdvancedPredictionMode, TeacherPredictiveView, etc.)
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npx next lint` on the file. Visually inspect that the MatchupPredictionCard render function outputs large card markup with h-28 w-28 images, text-2xl names, rounded-xl buttons with px-6 py-6 padding.
  </verify>
  <done>
The MatchupPredictionCard component renders large, kid-friendly cards matching the SE MatchupVoteCard sizing: 112-144px square images, 2xl-3xl text, spacious padding, vertical stack on mobile / horizontal on sm+, with a centered VS divider.
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles: `npx tsc --noEmit`
- Lint passes: `npx next lint`
- The MatchupPredictionCard in predictive-bracket.tsx uses the same sizing classes as matchup-vote-card.tsx: `h-28 w-28 sm:h-36 sm:w-36` for images, `text-2xl sm:text-3xl` for names, `px-6 py-6` for button padding
</verification>

<success_criteria>
Predictive bracket simple mode vote cards render at the same large, kid-friendly size as SE bracket simple mode vote cards. Images are 112-144px squares, text is 2xl-3xl, buttons are spacious and easy to tap.
</success_criteria>

<output>
After completion, create `.planning/quick/12-predictive-bracket-simple-mode-vote-card/12-SUMMARY.md`
</output>
