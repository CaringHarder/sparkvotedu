---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/bracket-diagram.tsx
autonomous: true
requirements: [QUICK-03]

must_haves:
  truths:
    - "When a student votes for an entrant in advanced mode, the selected entrant's half of the matchup box shows a clearly visible background color (not just subtle 15% opacity)"
    - "The connector lines between matchup boxes remain visible and properly styled"
    - "The voted entrant's name text uses primary color and bold weight with a checkmark"
    - "The non-voted entrant half in a voted matchup is visually dimmed to create contrast"
    - "Prediction bracket advanced mode uses the same enhanced highlights via votedEntrantIds"
    - "Teacher view, winner highlights, and accuracy overlays are unaffected"
  artifacts:
    - path: "src/components/bracket/bracket-diagram.tsx"
      provides: "Enhanced MatchupBox voted-entrant highlight styling"
      contains: "voted1"
  key_links:
    - from: "MatchupBox voted1/voted2 highlight rects"
      to: "AdvancedVotingView votedEntrantIds prop"
      via: "BracketDiagram passes votedEntrantIds[matchup.id] to each MatchupBox"
      pattern: "votedEntrantIds"
---

<objective>
Enhance the visual highlight for selected/voted entrants in the BracketDiagram MatchupBox component used by the student advanced voting view and prediction advanced mode.

Purpose: The current 15% opacity primary color fill on voted entrant halves is too subtle -- students cannot easily see which entrant they selected. Increasing the background color prominence makes the selection unmistakable at a glance, matching the strong visual feedback already present in simple mode's MatchupVoteCard (which uses `bg-primary/10` + `border-primary` + `shadow-md`).

Output: Updated MatchupBox in bracket-diagram.tsx with more prominent voted-entrant background highlight and dimmed non-voted half for contrast.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Reference files (read before implementing):
@src/components/bracket/bracket-diagram.tsx (target file - MatchupBox function starting around line 134)
@src/components/student/advanced-voting-view.tsx (consumer - passes votedEntrantIds to BracketDiagram)
@src/components/bracket/predictive-bracket.tsx (consumer - AdvancedPredictionMode passes votedEntrantIds via PredictiveDiagram)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enhance MatchupBox voted-entrant highlight and add non-voted dimming</name>
  <files>src/components/bracket/bracket-diagram.tsx</files>
  <action>
In the MatchupBox component inside bracket-diagram.tsx, make three targeted changes to the voted-entrant visual treatment:

1. **Increase voted highlight opacity from 15% to 25%.** Find the two "Voted highlight" rect elements (one for top half `voted1`, one for bottom half `voted2`). Change the fill from:
   ```
   fill: 'color-mix(in oklch, var(--primary) 15%, transparent)'
   ```
   to:
   ```
   fill: 'color-mix(in oklch, var(--primary) 25%, transparent)'
   ```
   This makes the background color clearly visible while still being tasteful (not overwhelming the entrant name text).

2. **Dim the non-voted entrant half for contrast.** When a student has voted in a matchup (either `voted1` or `voted2` is true), the OTHER entrant half should be visually dimmed to create a clear "chosen vs not-chosen" distinction.

   Add two new conditional rect elements right after the existing "Voted highlight" rects (before the "Selected matchup highlight" section). These render when the student has voted in this matchup but for the OTHER entrant:

   For top half (dimmed when voted2 is true and voted1 is false, and entrant1 exists):
   ```tsx
   {voted2 && !voted1 && matchup.entrant1Id && !isBye1 && (
     <rect
       x={x + 1}
       y={y + 1}
       width={MATCH_WIDTH - 2}
       height={MATCH_HEIGHT / 2 - 1}
       rx={6}
       ry={6}
       style={{ fill: 'var(--muted)', opacity: 0.5 }}
     />
   )}
   ```

   For bottom half (dimmed when voted1 is true and voted2 is false, and entrant2 exists):
   ```tsx
   {voted1 && !voted2 && matchup.entrant2Id && !isBye2 && (
     <rect
       x={x + 1}
       y={y + MATCH_HEIGHT / 2}
       width={MATCH_WIDTH - 2}
       height={MATCH_HEIGHT / 2 - 1}
       rx={6}
       ry={6}
       style={{ fill: 'var(--muted)', opacity: 0.5 }}
     />
   )}
   ```

3. **Make voted entrant text slightly more prominent.** In the entrant name `<text>` elements, the voted entrant already gets `var(--primary)` fill and `700` font weight. Additionally, make the NON-voted entrant text lighter when the other side is voted. Change the text fill for the top entrant name:

   Current logic for top entrant fill (around line 344-354):
   ```
   fill: isBye1 ? 'var(--muted-foreground)' : isTBD1 ? 'var(--muted-foreground)' : voted1 ? 'var(--primary)' : 'var(--foreground)'
   ```

   Add a condition: if `voted2 && !voted1` (the other entrant was voted), use `'var(--muted-foreground)'` instead of `'var(--foreground)'`:
   ```
   fill: isBye1
     ? 'var(--muted-foreground)'
     : isTBD1
       ? 'var(--muted-foreground)'
       : voted1
         ? 'var(--primary)'
         : voted2
           ? 'var(--muted-foreground)'
           : 'var(--foreground)'
   ```

   Apply the same pattern to the bottom entrant name text (around line 424-434):
   ```
   fill: isBye2
     ? 'var(--muted-foreground)'
     : isTBD2
       ? 'var(--muted-foreground)'
       : voted2
         ? 'var(--primary)'
         : voted1
           ? 'var(--muted-foreground)'
           : 'var(--foreground)'
   ```

Important: Do NOT change the winner highlight rects (8% opacity) -- those are for teacher-decided winners, not student votes.

Important: Do NOT change the voting indicator glow, clickable areas, connector paths, or any other SVG elements. Only the voted highlight rects and entrant name text fills are modified.

Important: Do NOT change the AdvancedVotingView or AdvancedPredictionMode components. They already pass the correct props -- this is purely a visual enhancement in the shared MatchupBox renderer.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Visually verify by joining a bracket in advanced mode as a student: vote for an entrant and confirm the selected half has a clearly visible primary-colored background, the non-selected half is dimmed, and the voted name is bold primary while the non-voted name is muted.
  </verify>
  <done>
In advanced voting mode, when a student taps an entrant to vote, the selected entrant's half of the matchup box shows a prominent primary-colored background (25% opacity), the non-voted entrant's half is dimmed with a muted overlay (50% opacity), and the non-voted text becomes muted-foreground. The matchup boxes and connector lines remain clearly visible. Winner highlights, teacher view, and accuracy overlays are unaffected.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. In advanced voting mode, voted entrant half shows clearly visible primary background color
3. Non-voted entrant half in same matchup is visually dimmed
4. Voted entrant name is primary colored and bold with checkmark (unchanged)
5. Non-voted entrant name in same matchup shows as muted text
6. Unvoted matchups (neither side selected) look identical to before (no dimming, no highlight)
7. Connector lines between matchup boxes display correctly
8. Winner highlights (decided matchups) are unaffected
9. Teacher view vote labels and selected matchup highlights are unaffected
10. Prediction bracket advanced mode benefits from same visual enhancement
</verification>

<success_criteria>
Student advanced voting mode matchup boxes clearly show which entrant was selected through prominent background color highlighting and dimming of the non-selected alternative, making vote choices unmistakable at a glance.
</success_criteria>

<output>
After completion, create `.planning/quick/3-student-bracket-advanced-mode-show-match/3-SUMMARY.md`
</output>
