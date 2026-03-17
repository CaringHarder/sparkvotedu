---
phase: "42"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/bracket/bracket-diagram.tsx
  - src/components/bracket/sports-matchup-box.tsx
autonomous: false
requirements: ["QUICK-42"]

must_haves:
  truths:
    - "Clicking either entrant half of a sports matchup box registers a vote/prediction"
    - "Vote/prediction highlight (green) is visible on selected entrant in sports mode"
    - "Checkmark appears next to selected entrant name in sports mode"
    - "Team logos, tournament seeds, and scores render inline — no double text"
    - "Prediction cascade advances winners into subsequent round matchups"
    - "Winner highlight uses standard primary color-mix, not green overlay"
  artifacts:
    - path: "src/components/bracket/bracket-diagram.tsx"
      provides: "MatchupBox with native sports rendering (no overlay dependency)"
      contains: "tournamentSeed"
    - path: "src/components/bracket/sports-matchup-box.tsx"
      provides: "Retained helper utilities (isSportsBracket, SportsStatusBadge, formatGameTime) — overlay components removed"
  key_links:
    - from: "src/components/bracket/bracket-diagram.tsx"
      to: "src/components/bracket/sports-matchup-box.tsx"
      via: "import SportsStatusBadge and formatGameTime helpers"
      pattern: "import.*SportsStatusBadge.*from.*sports-matchup-box"
    - from: "src/components/bracket/bracket-diagram.tsx (MatchupBox)"
      to: "matchup.entrant1.tournamentSeed / matchup.homeScore / matchup.gameStatus"
      via: "inline sports rendering within standard MatchupBox flow"
      pattern: "tournamentSeed|homeScore|awayScore|gameStatus"
---

<objective>
Merge sports bracket rendering into the standard MatchupBox component to fix 5 prediction UX bugs that all share the same root cause: the SportsMatchupOverlay architecture hides click handlers, vote highlights, and checkmarks behind an opaque overlay layer.

Purpose: Sports bracket predictions are currently broken — students can only click the top half of matchups, see no selection feedback, and prediction cascade does not visually propagate. All 5 bugs are fixed by removing the overlay and rendering sports content inline.

Output: A unified MatchupBox that natively handles sports mode (logos, seeds, scores, game status) while preserving all prediction/voting infrastructure.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/sports-bracket-prediction-ux-handoff.md

<interfaces>
<!-- Key layout constants from bracket-diagram.tsx -->
MATCH_WIDTH = 160
MATCH_HEIGHT = 56  (28px per entrant half)

<!-- MatchupBox receives isSports prop already -->
<!-- MatchupData already has: homeScore, awayScore, gameStatus, gameStartTime, externalGameId -->
<!-- BracketEntrantData already has: tournamentSeed, logoUrl, abbreviation -->

<!-- From sports-matchup-box.tsx — helpers to KEEP: -->
export function isSportsBracket(bracket: BracketData): boolean
export function SportsStatusBadge({ matchup, x, y, width }): JSX.Element | null
function formatGameTime(dateStr: string): string

<!-- From sports-matchup-box.tsx — components to REMOVE: -->
export function SportsEntrantRow(...)  // Merged into MatchupBox
export function SportsMatchupOverlay(...)  // Deleted entirely
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Merge sports rendering into MatchupBox and remove overlay</name>
  <files>src/components/bracket/bracket-diagram.tsx, src/components/bracket/sports-matchup-box.tsx</files>
  <action>
**In `bracket-diagram.tsx` MatchupBox function:**

1. **Remove the `display:none` wrapper** — Delete `<g style={isSports ? {display:'none'} : undefined}>` (line ~358) and its closing `</g>` (line ~496). All content inside renders normally for both modes.

2. **Modify entrant name rendering for sports mode** — Replace the `entrant1Name`/`entrant2Name` computation (lines ~169-174) with sports-aware logic:
   - When `isSports && entrant.tournamentSeed != null`: use `"{tournamentSeed} {abbreviation || name}"` (e.g. "1 DUKE")
   - When `isSports && scores visible` (homeScore/awayScore not null): truncate name to abbreviation form to leave room for scores
   - When NOT sports: keep existing `seedPosition. name` logic unchanged
   - Per user decision: use abbreviation when scores visible, full name when no scores

3. **Add score display** — After each entrant name `<text>`, when `isSports`:
   - For entrant1: if `matchup.homeScore != null`, render score text at `x + MATCH_WIDTH - 8`, y same as name, textAnchor="end", fontSize 11, fontWeight 700 if winner else 500
   - For entrant2: if `matchup.awayScore != null`, same pattern at bottom half y position
   - Score text style: `fill: isWinner ? 'var(--foreground)' : 'var(--muted-foreground)'`
   - When scores ARE shown AND voteLabel also exists, scores take precedence (hide voteLabel for sports matchups with scores)

4. **Add SportsStatusBadge inline** — Import `SportsStatusBadge` from sports-matchup-box.tsx. Inside MatchupBox, after the divider line, when `isSports && matchup.gameStatus`:
   - Render `<SportsStatusBadge matchup={matchup} x={x} y={y + MATCH_HEIGHT/2 - 3} width={MATCH_WIDTH} />`

5. **Remove SportsMatchupOverlay rendering** — Delete the entire block at lines ~679-689:
   ```
   {isSports && positionedMatchups.map(({ matchup, pos }) => (
     <SportsMatchupOverlay ... />
   ))}
   ```

6. **Update import** — Remove `SportsMatchupOverlay` from the import. Add `SportsStatusBadge` import instead.

7. **Winner highlight** — The existing winner highlight rects already use `color-mix(in oklch, var(--primary) 8%, transparent)` which is correct per user decision. No change needed. The SportsMatchupOverlay's green `rgba(34,197,94,0.1)` winner highlights are removed with the overlay.

8. **Move click rects OUTSIDE the old display:none group** — Currently the bottom entrant click rect (lines ~428-440) is INSIDE the hidden `<g>` wrapper. After removing the wrapper, both click rects are exposed. The top click rect (lines ~343-355) is already outside. Verify both are rendered and functional after the wrapper removal.

**In `sports-matchup-box.tsx`:**

9. **Keep**: `isSportsBracket()`, `SportsStatusBadge`, `formatGameTime` (export it)
10. **Delete**: `SportsEntrantRow` component and `SportsMatchupOverlay` component (and their interfaces)
11. Export `formatGameTime` so it can be used elsewhere if needed

**Important implementation notes:**
- The standard MatchupBox already renders logos via `matchup.entrant1?.logoUrl` — this works for sports teams too. No change needed for logo rendering.
- The checkmark `{voted1 ? ' \u2713' : ''}` appended to entrant name text continues to work since it's inside the now-visible text elements.
- The prediction cascade hook (`use-prediction-cascade.ts`) augments matchup.entrant1/entrant2 data — since MatchupBox reads these directly, cascade now works automatically (the overlay was reading un-augmented data).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
- TypeScript compiles with no errors
- SportsMatchupOverlay and SportsEntrantRow are fully removed from bracket-diagram.tsx rendering
- The display:none wrapper is removed — all MatchupBox content renders for both sports and non-sports modes
- Sports entrant names show "{tournamentSeed} {name}" with abbreviation when scores are present
- Scores render right-aligned in each entrant half when homeScore/awayScore are not null
- SportsStatusBadge renders inline inside MatchupBox for sports matchups
- Click rects for both entrant halves are rendered (not hidden) enabling full prediction clicking
- Vote highlights and checkmarks render visibly (not behind an overlay)
- Winner highlights use standard primary color-mix (not green rgba)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify prediction UX fixes across sports and non-sports brackets</name>
  <files>src/components/bracket/bracket-diagram.tsx</files>
  <action>Human verifies the 5 bug fixes visually in the running application.</action>
  <what-built>Merged sports bracket rendering into standard MatchupBox, removing the overlay architecture. All 5 prediction UX bugs should now be fixed: both halves clickable, vote highlights visible, checkmarks shown, prediction cascade works, no double text.</what-built>
  <how-to-verify>
    1. Open a sports bracket in prediction mode as a student
    2. Click the TOP entrant of any R1 matchup — verify green highlight appears and checkmark shows
    3. Click the BOTTOM entrant of a different R1 matchup — verify it highlights correctly (both halves clickable)
    4. Verify no double text on combined play-in entries (e.g. "16 TEX/NCSU" appears once, not twice)
    5. Fill all R1 picks — verify winners cascade into R2 matchups with correct names/logos
    6. Check a matchup with scores (if any live/final games exist) — scores should appear right-aligned
    7. Open the teacher live dashboard — verify sports bracket displays correctly there too
    8. Verify non-sports brackets still render normally (no regression)
  </how-to-verify>
  <verify>Human visual verification</verify>
  <done>All 5 prediction UX bugs confirmed fixed, no regression in non-sports brackets</done>
  <resume-signal>Type "approved" or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- No references to `SportsMatchupOverlay` remain in bracket-diagram.tsx
- No `display: 'none'` wrapper conditioned on `isSports` in MatchupBox
- `sports-matchup-box.tsx` only exports `isSportsBracket`, `SportsStatusBadge`, and `formatGameTime`
- Both entrant click rects render unconditionally (not inside any hidden group)
</verification>

<success_criteria>
All 5 bugs fixed:
1. No double text — single rendering path for entrant names
2. Both halves clickable — click rects not hidden
3. Vote highlights visible — green highlight rects render above card background, not under overlay
4. Prediction cascade works — MatchupBox reads augmented entrant data directly
5. Winner highlights use standard primary color-mix style
</success_criteria>

<output>
After completion, create `.planning/quick/42-merge-sports-bracket-rendering-into-the-/42-SUMMARY.md`
</output>
