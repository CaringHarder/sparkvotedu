---
phase: "43"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/sports.ts
  - src/actions/bracket.ts
autonomous: true
requirements: ["QUICK-43"]

must_haves:
  truths:
    - "Every non-R0 matchup in rounds 1-5 has a nextMatchupId pointing to its advancement target"
    - "Winner propagation flows through all rounds when syncBracketResults runs"
    - "Existing Men's and Women's NCAA brackets have correct nextMatchupId linkage after repair"
  artifacts:
    - path: "src/lib/dal/sports.ts"
      provides: "wireMatchupAdvancement() function + integration into createSportsBracketDAL"
      contains: "wireMatchupAdvancement"
    - path: "src/actions/bracket.ts"
      provides: "repairBracketLinkage() server action"
      contains: "repairBracketLinkage"
  key_links:
    - from: "src/lib/dal/sports.ts:wireMatchupAdvancement"
      to: "prisma.matchup.update"
      via: "position-based pairing: R[n] index i feeds R[n+1] index floor(i/2)"
      pattern: "Math\\.floor.*\\/\\s*2"
    - from: "src/lib/dal/sports.ts:createSportsBracketDAL"
      to: "wireMatchupAdvancement"
      via: "called after Pass 2 ESPN wiring as fallback"
      pattern: "wireMatchupAdvancement"
    - from: "src/actions/bracket.ts:repairBracketLinkage"
      to: "wireMatchupAdvancement"
      via: "server action calling DAL function for existing brackets"
      pattern: "wireMatchupAdvancement"
---

<objective>
Fix next_matchup_id linkage for ESPN-sourced NCAA brackets so predictive bracket cascade flows through all rounds.

Purpose: ESPN mapper hardcodes previousHomeGameId/previousAwayGameId as null, so the DAL's Pass 2 wiring (lines 275-301) never links matchups. Without linkage, winner propagation in syncBracketResults silently fails and predictions cannot cascade.

Output: wireMatchupAdvancement() function that computes linkage from position data, integrated into creation flow and available as a repair action for existing brackets.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/dal/sports.ts
@src/actions/bracket.ts
@prisma/schema.prisma

<interfaces>
<!-- From src/lib/dal/sports.ts -->
Position numbering scheme (critical for linkage algorithm):
- R1: regions get 8 positions each. Region 0 = P1-8, Region 1 = P9-16, Region 2 = P17-24, Region 3 = P25-32
- R2+: sequential counters per round (positionCounters map, starts at 1)
- R0 (play-in): sequential counter, separate from R1

Key existing function:
```typescript
function getSlotForPosition(position: number): 'entrant1Id' | 'entrant2Id' {
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
}
```

Matchup model fields relevant to linkage:
- id, round, position, bracketId, bracketRegion, nextMatchupId
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add wireMatchupAdvancement() and integrate into creation flow</name>
  <files>src/lib/dal/sports.ts</files>
  <action>
Add a new exported async function `wireMatchupAdvancement(bracketId: string, tx?: PrismaTransaction)` that computes and writes nextMatchupId linkage from position data. The function should work with either a transaction client or the default prisma client (for repair use).

Algorithm:
1. Fetch all matchups for the bracket, ordered by round ASC, position ASC. Fields needed: id, round, position, bracketRegion, nextMatchupId.
2. Group matchups by round into a Map<number, Matchup[]>.
3. Skip round 0 (play-in) entirely — those games complete before predictions open.
4. For each round R (starting from 1), find matchups in round R+1:

   **Within-region rounds (R1 through R3 for NCAA):**
   - Group round R matchups by bracketRegion.
   - For each region, sort by position, then pair consecutive matchups: matchup at index i feeds into the matchup at index floor(i/2) in round R+1 for the same region.
   - Within-region R+1 matchups are also grouped by region and sorted by position.

   **Cross-region round (R4 to R5 = regional finals to Final Four):**
   - Sort R4 matchups by position ASC.
   - Sort R5 matchups by position ASC.
   - Pair consecutive R4 matchups: R4[0] and R4[1] -> R5[0], R4[2] and R4[3] -> R5[1].

   **Final Four to Championship (R5 to R6):**
   - Sort R5 matchups by position ASC.
   - Sort R6 matchups by position ASC (should be exactly 1).
   - R5[0] and R5[1] -> R6[0].

5. For each computed link, ONLY update if the matchup's nextMatchupId is currently null (don't overwrite any existing ESPN data).
6. Use `tx` if provided, otherwise use `prisma` directly.

Then integrate into `createSportsBracketDAL()`:
- After the existing Pass 2 loop (after line 301, after the comment "// d. Second pass: wire nextMatchupId"), add a call to `wireMatchupAdvancement(created.id, tx)` as a fallback. This handles the case where ESPN data doesn't provide previousHomeGameId/previousAwayGameId.

Implementation note: Since R2+ positions use sequential counters (not region-offset like R1), the within-region grouping by bracketRegion is essential for rounds 2-3. For R1, positions are region-offset (1-8, 9-16, etc.) but bracketRegion is also set, so grouping by region works for all within-region rounds.

A simpler approach that may work better given the sequential position counters for R2+: For rounds where bracketRegion is set on matchups, group by region, sort by position within each region, and pair i -> floor(i/2) in the next round's same-region group. For rounds without region (R5, R6), just sort by position and pair.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/lib/dal/sports.ts 2>&1 | head -20</automated>
  </verify>
  <done>wireMatchupAdvancement() exists and compiles, createSportsBracketDAL calls it after Pass 2 as fallback</done>
</task>

<task type="auto">
  <name>Task 2: Add repairBracketLinkage server action and run repair on existing brackets</name>
  <files>src/actions/bracket.ts</files>
  <action>
Add a new server action `repairBracketLinkage(bracketId: string)` to src/actions/bracket.ts:

1. Import `wireMatchupAdvancement` from `@/lib/dal/sports`.
2. Authenticate the teacher with `getAuthenticatedTeacher()`.
3. Verify the bracket belongs to this teacher and is bracketType 'sports'.
4. Call `wireMatchupAdvancement(bracketId)` (no transaction — uses prisma directly).
5. Return `{ success: true }` or throw appropriate error.

After implementing, run the repair on both existing NCAA brackets using a one-time script via the Next.js environment. Execute in the dev server context:

```bash
# Use prisma's execute or a small script to call the DAL function directly
npx tsx -e "
import { wireMatchupAdvancement } from './src/lib/dal/sports';
async function main() {
  // Men's NCAA
  await wireMatchupAdvancement('f3ce8e01-9eb7-4901-b1e6-a9047112eaf8');
  console.log('Men bracket repaired');
  // Women's NCAA
  await wireMatchupAdvancement('9615abda-410c-4850-ab04-3c3f012da44c');
  console.log('Women bracket repaired');
}
main().catch(console.error);
"
```

If tsx import resolution fails due to path aliases, create a temporary script `scripts/repair-linkage.ts` that imports using relative paths and configures tsconfig paths, or use `node --loader ts-node/esm` with appropriate config. Delete the temp script after running.

After repair, verify by querying the database:
```sql
SELECT round, count(*) as total, count(next_matchup_id) as linked
FROM "Matchup"
WHERE bracket_id = 'f3ce8e01-9eb7-4901-b1e6-a9047112eaf8'
GROUP BY round ORDER BY round;
```

Expected: R0 = 0 linked (play-in, skipped), R1 = all linked, R2 = all linked, R3 = all linked, R4 = all linked, R5 = all linked, R6 = 0 linked (championship, no next round).
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/actions/bracket.ts 2>&1 | head -20</automated>
  </verify>
  <done>repairBracketLinkage server action exists, both NCAA brackets have non-null nextMatchupId for rounds 1-5, R6 (championship) has null nextMatchupId (correct — no next round)</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Database verification query shows all R1-R5 matchups have nextMatchupId linked for both brackets
3. Dev server starts without errors: `npm run dev`
</verification>

<success_criteria>
- wireMatchupAdvancement() correctly computes position-based linkage for all NCAA bracket rounds
- createSportsBracketDAL() calls wireMatchupAdvancement() as fallback after ESPN Pass 2
- Both existing NCAA brackets (Men's and Women's) have correct nextMatchupId values
- Winner propagation in syncBracketResults will now flow through all rounds
</success_criteria>

<output>
After completion, create `.planning/quick/43-fix-next-matchup-id-linkage-so-predictiv/43-SUMMARY.md`
</output>
