---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/predictive-bracket.tsx
  - src/components/bracket/bracket-diagram.tsx
  - src/components/bracket/matchup-vote-card.tsx
autonomous: true
requirements: [LIGHT-MODE-BORDERS, GREEN-VOTED-BG]

must_haves:
  truths:
    - "Matchup card borders are clearly visible on white/light backgrounds (Chromebook screens)"
    - "After voting, the matchup container shows a light green background in light mode"
    - "Dark mode styling is preserved and not broken by changes"
  artifacts:
    - path: "src/components/bracket/predictive-bracket.tsx"
      provides: "MatchupPredictionCard with visible borders and green voted state"
      contains: "border-gray-300"
    - path: "src/components/bracket/bracket-diagram.tsx"
      provides: "SVG matchup boxes with stronger default stroke and green voted fill"
      contains: "color-mix(in oklch, green"
    - path: "src/components/bracket/matchup-vote-card.tsx"
      provides: "MatchupVoteCard entrant buttons with green voted background"
      contains: "bg-green-50"
  key_links:
    - from: "predictive-bracket.tsx"
      to: "MatchupPredictionCard"
      via: "selectedWinnerId conditional classes"
      pattern: "border-gray-300|bg-green-50"
    - from: "bracket-diagram.tsx"
      to: "MatchupBox voted highlight"
      via: "SVG rect fill style"
      pattern: "color-mix.*green"
---

<objective>
Fix predictive bracket light mode visibility on student Chromebooks by strengthening matchup card borders and adding green voted-state backgrounds across all three bracket view components.

Purpose: Students on Chromebooks in light mode cannot see matchup boundaries and get no green confirmation after voting. This is a visual accessibility fix for classroom devices.
Output: Updated styling in three bracket components with visible borders and green vote confirmation.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/bracket/predictive-bracket.tsx (lines 1213-1282 — MatchupPredictionCard)
@src/components/bracket/bracket-diagram.tsx (full file — MatchupBox SVG component)
@src/components/bracket/matchup-vote-card.tsx (full file — MatchupVoteCard)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix light mode borders and add green voted backgrounds in MatchupPredictionCard and MatchupVoteCard</name>
  <files>src/components/bracket/predictive-bracket.tsx, src/components/bracket/matchup-vote-card.tsx</files>
  <action>
**predictive-bracket.tsx — MatchupPredictionCard (lines 1213-1282):**

1. Container div (line 1228): Change the default border from plain `border` to `border border-gray-300 dark:border-border` so it is visible on white backgrounds. Keep the existing speculative conditional unchanged (it already sets `border-dashed border-blue-300 dark:border-blue-700`).

   Change:
   ```
   `rounded-lg border p-3 ${isSpeculative ? ...}`
   ```
   To:
   ```
   `rounded-lg border border-gray-300 dark:border-border p-3 ${isSpeculative ? ...}`
   ```

2. Add green voted background to the container: Determine if either entrant has been selected (`selectedWinnerId !== null`). When voted, add `bg-green-50 dark:bg-green-950/30` to the container div. Build this as a computed variable:
   ```tsx
   const hasVoted = selectedWinnerId !== null
   ```
   Then update the className to include:
   ```
   ${hasVoted ? 'bg-green-50 dark:bg-green-950/30' : ''}
   ```

3. Selected entrant buttons (lines 1242-1245 and 1264-1267): Keep existing `border-primary bg-primary/10 font-semibold text-primary` for the SELECTED entrant button — this correctly highlights the chosen pick. No change needed on the entrant buttons themselves; the green goes on the CONTAINER.

**matchup-vote-card.tsx — MatchupVoteCard entrant buttons (line 96-108):**

1. Change the voted entrant button styling (line 100-101) from:
   ```
   'border-primary bg-primary/10 shadow-md'
   ```
   To:
   ```
   'border-green-500 bg-green-50 shadow-md dark:border-green-600 dark:bg-green-950/30'
   ```
   This gives a clear green border and light green background when voted, visible on Chromebooks.

2. Outer card container (line 148): Strengthen the default border for light mode visibility. Change:
   ```
   className="w-full max-w-md rounded-xl border bg-card p-4 shadow-sm"
   ```
   To:
   ```
   className="w-full max-w-md rounded-xl border border-gray-300 dark:border-border bg-card p-4 shadow-sm"
   ```

3. The checkmark badge (line 116): Update from `bg-primary` to `bg-green-600 dark:bg-green-500` to match the green voted theme:
   ```
   className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 dark:bg-green-500 text-white text-xs"
   ```
  </action>
  <verify>Run `npx tsc --noEmit` to ensure no type errors. Visually inspect that no Tailwind class syntax errors exist in the modified lines. Search for `bg-green-50` and `border-gray-300` in the modified files to confirm changes are present.</verify>
  <done>MatchupPredictionCard shows visible gray borders in light mode and a light green container background when voted. MatchupVoteCard shows green border+background on voted entrant buttons and visible card border. Dark mode uses subtle green-950/30 equivalents.</done>
</task>

<task type="auto">
  <name>Task 2: Fix SVG bracket diagram matchup box borders and green voted fills</name>
  <files>src/components/bracket/bracket-diagram.tsx</files>
  <action>
**bracket-diagram.tsx — MatchupBox component (lines 134-490):**

1. Default matchup box stroke (lines 307-311): Change the default (non-selected, non-voting) stroke from `var(--border)` to a harder-coded gray that is visible in light mode. Update the style object:
   ```tsx
   stroke: isSelected ? 'var(--primary)' : isVoting ? 'var(--primary)' : 'oklch(0.75 0 0)',
   ```
   The value `oklch(0.75 0 0)` is approximately `#b3b3b3` — clearly visible on white but not jarring. This is darker than the current `var(--border)` which resolves to `oklch(0.922 0 0)` (nearly white).

2. Divider line stroke (lines 407-417): Same treatment for the horizontal divider inside each matchup box. Change:
   ```tsx
   stroke: isVoting ? 'var(--primary)' : 'var(--border)',
   ```
   To:
   ```tsx
   stroke: isVoting ? 'var(--primary)' : 'oklch(0.75 0 0)',
   ```

3. Voted entrant highlight fills (lines 231-254): Change the voted highlight from primary-tinted to green-tinted. Update BOTH voted1 and voted2 rect styles from:
   ```tsx
   fill: 'color-mix(in oklch, var(--primary) 25%, transparent)'
   ```
   To:
   ```tsx
   fill: 'color-mix(in oklch, oklch(0.72 0.19 142) 25%, transparent)'
   ```
   The oklch value `oklch(0.72 0.19 142)` corresponds to a vivid green (~#4ade80 / green-400). The 25% mix produces a soft green tint visible in both light and dark mode.

4. Voted entrant text color (lines 372-376 and 456-460): Change voted entrant text fill from `var(--primary)` to `oklch(0.45 0.18 142)` (a darker green for readable text, ~green-700). Update both `voted1` and `voted2` branches:
   ```tsx
   : voted1
     ? 'oklch(0.45 0.18 142)'
     : voted2
   ```
   And:
   ```tsx
   : voted2
     ? 'oklch(0.45 0.18 142)'
     : voted1
   ```

5. Voted entrant font weight / check mark (lines 380, 385, 464, 468): Keep existing `fontWeight: voted1 ? 700` and checkmark `\u2713` as-is — these work well with the green color.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Search for `oklch(0.75 0 0)` and `oklch(0.72 0.19 142)` in bracket-diagram.tsx to confirm the stroke and fill changes are in place.</verify>
  <done>SVG bracket matchup boxes have visible gray borders (oklch 0.75) instead of near-invisible var(--border). Voted entrant halves show green tint instead of primary color tint. Voted text is dark green. Dark mode remains functional since oklch values work across both themes.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. Search all three files for the key changes:
   - `border-gray-300` in predictive-bracket.tsx and matchup-vote-card.tsx
   - `bg-green-50` in predictive-bracket.tsx and matchup-vote-card.tsx
   - `oklch(0.75 0 0)` in bracket-diagram.tsx (visible stroke)
   - `oklch(0.72 0.19 142)` in bracket-diagram.tsx (green voted fill)
3. No regressions: dark mode classes (`dark:`) present alongside all light mode additions
</verification>

<success_criteria>
- All three bracket components have clearly visible matchup borders in light mode (not near-invisible gray-on-white)
- Voted state shows green visual confirmation: light green bg in card components, green tint in SVG component
- Dark mode equivalents are present and do not break existing dark mode appearance
- TypeScript compilation succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/6-predictive-bracket-light-mode-add-matchu/6-SUMMARY.md`
</output>
