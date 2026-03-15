---
phase: quick-37
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/sports/types.ts
  - src/lib/sports/sportsdataio/mappers.ts
  - src/components/bracket/tournament-browser.tsx
autonomous: true
requirements: [QUICK-37]
must_haves:
  truths:
    - "Partially-loaded NCAA tournaments show a 'bracket loading' warning instead of appearing importable"
    - "Import button is disabled for NCAA tournaments with fewer than 60 teams"
    - "UI displays progress like '16 of 68 teams' so teacher knows data is still loading"
  artifacts:
    - path: "src/lib/sports/types.ts"
      provides: "gameCount field on SportsTournament"
      contains: "gameCount"
    - path: "src/lib/sports/sportsdataio/mappers.ts"
      provides: "gameCount populated, teamsPopulated false for partial NCAA data"
    - path: "src/components/bracket/tournament-browser.tsx"
      provides: "Incomplete bracket detection and warning UI"
  key_links:
    - from: "src/lib/sports/sportsdataio/mappers.ts"
      to: "src/lib/sports/types.ts"
      via: "gameCount field set in mapTournament"
      pattern: "gameCount: games\\.length"
    - from: "src/components/bracket/tournament-browser.tsx"
      to: "src/lib/sports/types.ts"
      via: "reads gameCount to detect partial data"
      pattern: "gameCount"
---

<objective>
Detect partially-loaded NCAA tournament brackets from SportsDataIO and prevent teachers from importing broken bracket data. Currently the API returns only 15 of 67 games and 16 of 68 teams (Selection Sunday just happened), but the UI shows these as importable.

Purpose: Prevent importing broken brackets that would create a bad teacher/student experience.
Output: Updated types, mapper logic, and UI with warning messaging.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/sports/types.ts
@src/lib/sports/sportsdataio/mappers.ts
@src/components/bracket/tournament-browser.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add gameCount to types and fix mapper for partial NCAA detection</name>
  <files>src/lib/sports/types.ts, src/lib/sports/sportsdataio/mappers.ts</files>
  <action>
1. In `src/lib/sports/types.ts`, add `gameCount: number` to the `SportsTournament` interface (after `teamCount`).

2. In `src/lib/sports/sportsdataio/mappers.ts`, update `mapTournament`:
   - Set `gameCount: games.length` in the return object.
   - Fix `teamsPopulated` logic: For NCAA tournaments (name contains "NCAA"), require at least 60 teams to be considered populated. For non-NCAA tournaments, keep existing logic (`teamIds.size > 0`).
   - Detect NCAA by checking `raw.Name.includes('NCAA')`.
   - The logic should be:
     ```
     const isNCAA = raw.Name.includes('NCAA')
     const teamsPopulated = isNCAA ? teamIds.size >= 60 : teamIds.size > 0
     ```
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>SportsTournament has gameCount field. mapTournament sets gameCount and marks NCAA tournaments with < 60 teams as teamsPopulated=false.</done>
</task>

<task type="auto">
  <name>Task 2: Show bracket-loading warning and disable import for partial NCAA data</name>
  <files>src/components/bracket/tournament-browser.tsx</files>
  <action>
Update the `TournamentCard` component in `tournament-browser.tsx`:

1. Add a helper function to detect incomplete NCAA tournaments:
   ```
   function isIncompleteNCAA(t: SportsTournament): boolean {
     return t.name.includes('NCAA') && t.teamCount < 60
   }
   ```

2. In the info row (line ~283-288), replace the teams display logic:
   - If `isIncompleteNCAA(tournament)`: show `"Bracket loading... (${tournament.teamCount} of 68 teams)"`
   - Else if `tournament.teamsPopulated`: show `"${tournament.teamCount} teams"`
   - Else: show `"Teams TBD"`

3. Replace the existing `!tournament.teamsPopulated` warning message (lines 290-294). Use two conditions:
   - If `isIncompleteNCAA(tournament)`: show amber warning "Bracket data is still loading from the NCAA. Full bracket will be available once all teams and games are published." This is different from the TBD message.
   - Else if `!tournament.teamsPopulated`: keep existing "Bracket teams haven't been announced yet. Check back after the Selection Show."

4. The `disabled` prop already checks `!tournament.teamsPopulated` (line 211), which will now be false for partial NCAA data thanks to Task 1's mapper fix. No change needed to the disabled logic in the parent.

5. Add a `gameCount` display in the info row after teams: show `"${tournament.gameCount} games"` only when `tournament.gameCount > 0`.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>NCAA tournaments with partial data show "Bracket loading... (16 of 68 teams)" warning. Import button is disabled. Non-NCAA tournaments unaffected.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no type errors
- Dev server starts without errors: `npm run dev`
- Tournament browser renders without runtime errors
</verification>

<success_criteria>
- SportsTournament type includes gameCount field
- NCAA tournaments with < 60 teams show as "loading" not importable
- Import button disabled for incomplete NCAA brackets
- Warning message explains data is still loading
- Non-NCAA tournament behavior unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/37-check-mens-ncaa-bracket-working-now-that/37-SUMMARY.md`
</output>
