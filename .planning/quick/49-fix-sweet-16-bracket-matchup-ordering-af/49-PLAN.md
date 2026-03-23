---
phase: "49"
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/dal/sports.ts
  - src/actions/sports.ts
autonomous: true
requirements: [FIX-SWEET16-ORDERING]
must_haves:
  truths:
    - "R2-R4 matchups get seed-derived positions instead of sequential counters"
    - "Existing brackets with wrong positions get repaired during sync"
    - "wireMatchupAdvancement correctly pairs matchups after position repair"
    - "Winners propagate to correct next-round slots after re-wiring"
  artifacts:
    - path: "src/lib/dal/sports.ts"
      provides: "Full seed-to-R1 map, seed-based R2-R4 positioning, repairBracketAdvancement function"
      contains: "SEED_TO_R1_POSITION"
    - path: "src/actions/sports.ts"
      provides: "Calls repairBracketAdvancement before syncBracketResults"
      contains: "repairBracketAdvancement"
  key_links:
    - from: "src/actions/sports.ts"
      to: "src/lib/dal/sports.ts"
      via: "repairBracketAdvancement import and call before syncBracketResults"
      pattern: "repairBracketAdvancement.*bracket\\.id"
    - from: "repairBracketAdvancement"
      to: "wireMatchupAdvancement"
      via: "re-wires advancement after position fix"
      pattern: "wireMatchupAdvancement"
---

<objective>
Fix Sweet 16 bracket matchup ordering that breaks after ESPN sync progression.

Purpose: R2+ matchups (Sweet 16, Elite Eight) are assigned positions with a global sequential counter instead of seed-based positions within each region. This causes wireMatchupAdvancement() to pair wrong matchups, producing incorrect pairings (e.g., UConn vs UConn). The fix derives positions from team seeds for all within-region rounds and repairs existing brackets during sync.

Output: Corrected position assignment for R2-R4 during import, plus a repair function that fixes existing brackets on next sync.
</objective>

<execution_context>
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/workflows/execute-plan.md
@/Users/davidreynoldsjr/VibeCoding/SparkVotEDU/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/dal/sports.ts
@src/actions/sports.ts
@src/lib/sports/types.ts

<interfaces>
From src/lib/dal/sports.ts:
```typescript
const SEED_TO_R1_POSITION: Record<number, number> = {
  1: 1, 8: 2, 5: 3, 4: 4, 6: 5, 3: 6, 7: 7, 2: 8,
}

export async function getSlotByFeederOrder(
  db: any, matchupId: string, nextMatchupId: string, position: number
): Promise<'entrant1Id' | 'entrant2Id'>

export async function wireMatchupAdvancement(
  bracketId: string, tx?: TransactionClient, finalFourPairing?: string | null
)

export async function syncBracketResults(bracketId: string, games: SportsGame[])
```

From src/lib/sports/types.ts:
```typescript
export interface SportsTeam {
  externalId: number; name: string; shortName: string;
  abbreviation: string; logoUrl: string | null;
  conference: string; seed: number | null; region: string | null;
}

export interface SportsGame {
  externalId: number; tournamentId: string; round: number;
  bracket: string | null; status: GameStatus;
  homeTeam: SportsTeam; awayTeam: SportsTeam;
  homeScore: number | null; awayScore: number | null;
  startTime: string; isClosed: boolean;
  period: string | null; timeRemaining: string | null;
  winnerId: number | null; displayOrder: number;
  previousHomeGameId: number | null; previousAwayGameId: number | null;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand seed map and fix R2-R4 position assignment during import</name>
  <files>src/lib/dal/sports.ts</files>
  <action>
Two changes in src/lib/dal/sports.ts:

1. **Expand SEED_TO_R1_POSITION** (line ~24) to cover ALL 16 seeds. Each seed pair in a matchup shares the same R1 position. The full map:
```typescript
const SEED_TO_R1_POSITION: Record<number, number> = {
  1: 1, 16: 1, 8: 2, 9: 2, 5: 3, 12: 3, 4: 4, 13: 4,
  6: 5, 11: 5, 3: 6, 14: 6, 7: 7, 10: 7, 2: 8, 15: 8,
}
```

2. **Fix the R2-R4 position assignment** in the import loop (line ~454, the `else` branch that currently uses sequential counters). Replace the sequential counter logic for R2-R4 within-region rounds with seed-based positioning:

```typescript
} else if (round >= 2 && round <= 4 && game.bracket && regionIndex.has(game.bracket)) {
  // Within-region rounds R2-R4: derive position from team seeds
  const seed1 = game.homeTeam?.seed ?? null
  const seed2 = game.awayTeam?.seed ?? null
  const knownSeed = seed1 ?? seed2

  const regIdx = regionIndex.get(game.bracket) ?? 0
  // gamesPerRegion: R2=4, R3=2, R4=1
  const gamesPerRegion = Math.floor(8 / Math.pow(2, round - 1))

  if (knownSeed !== null) {
    const r1Pos = SEED_TO_R1_POSITION[knownSeed]
    if (r1Pos !== undefined) {
      // Position within region: ceil(r1Pos / 2^(round-1))
      const withinRegionPos = Math.ceil(r1Pos / Math.pow(2, round - 1))
      currentPosition = regIdx * gamesPerRegion + withinRegionPos
    } else {
      // Unknown seed value, fall back to per-region sequential
      const key = `${round}-${game.bracket}`
      const counter = (positionCounters.get(key as any) ?? 0) + 1
      positionCounters.set(key as any, counter)
      currentPosition = regIdx * gamesPerRegion + counter
    }
  } else {
    // No seed data available, fall back to per-region sequential
    const key = `${round}-${game.bracket}`
    const counter = (positionCounters.get(key as any) ?? 0) + 1
    positionCounters.set(key as any, counter)
    currentPosition = regIdx * gamesPerRegion + counter
  }
} else {
  // For R0 (First Four) and R5+ (Final Four, Championship): sequential counter
  currentPosition = (positionCounters.get(round) ?? 0) + 1
  positionCounters.set(round, currentPosition)
}
```

Note: The positionCounters map currently uses `number` keys (round). For the per-region fallback, use string keys like `"2-East"` to avoid collision with the round-only counters. The map type is `Map<number, number>` -- change it to `Map<number | string, number>` or use a separate map for per-region counters.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>SEED_TO_R1_POSITION covers seeds 1-16. R2-R4 matchups created during import get positions derived from team seeds using the formula ceil(SEED_TO_R1_POSITION[seed] / 2^(round-1)), with per-region sequential fallback when seeds are unknown. R0 and R5+ still use global sequential counter.</done>
</task>

<task type="auto">
  <name>Task 2: Add repairBracketAdvancement function and wire into sync</name>
  <files>src/lib/dal/sports.ts, src/actions/sports.ts</files>
  <action>
1. **Add `repairBracketAdvancement` function** in src/lib/dal/sports.ts (export it). Place it after `wireMatchupAdvancement` and before `createSportsBracketDAL`. This function fixes EXISTING brackets that were created with wrong R2-R4 positions:

```typescript
/**
 * Repair bracket advancement wiring for existing brackets.
 * Recalculates R2-R4 matchup positions from team seeds, then
 * re-wires nextMatchupId links and re-propagates decided winners.
 */
export async function repairBracketAdvancement(
  bracketId: string,
  games: SportsGame[]
) {
  // Build game lookup by externalId
  const gameByExternalId = new Map<number, SportsGame>()
  for (const game of games) {
    gameByExternalId.set(game.externalId, game)
  }

  // Fetch R2-R4 matchups with externalGameId
  const matchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      round: { in: [2, 3, 4] },
      externalGameId: { not: null },
    },
    select: {
      id: true,
      round: true,
      position: true,
      bracketRegion: true,
      externalGameId: true,
    },
  })

  if (matchups.length === 0) return

  // Determine region ordering from R1 matchups
  const r1Matchups = await prisma.matchup.findMany({
    where: { bracketId, round: 1 },
    select: { bracketRegion: true },
    distinct: ['bracketRegion'],
    orderBy: { position: 'asc' },
  })
  const regionIndex = new Map<string, number>()
  r1Matchups.forEach((m, i) => {
    if (m.bracketRegion) regionIndex.set(m.bracketRegion, i)
  })

  // Recalculate positions
  let anyChanged = false
  for (const matchup of matchups) {
    if (!matchup.externalGameId || !matchup.bracketRegion) continue
    const game = gameByExternalId.get(matchup.externalGameId)
    if (!game) continue

    const seed1 = game.homeTeam?.seed ?? null
    const seed2 = game.awayTeam?.seed ?? null
    const knownSeed = seed1 ?? seed2
    if (knownSeed === null) continue

    const r1Pos = SEED_TO_R1_POSITION[knownSeed]
    if (r1Pos === undefined) continue

    const round = matchup.round
    const regIdx = regionIndex.get(matchup.bracketRegion) ?? 0
    const gamesPerRegion = Math.floor(8 / Math.pow(2, round - 1))
    const withinRegionPos = Math.ceil(r1Pos / Math.pow(2, round - 1))
    const correctPosition = regIdx * gamesPerRegion + withinRegionPos

    if (matchup.position !== correctPosition) {
      await prisma.matchup.update({
        where: { id: matchup.id },
        data: { position: correctPosition },
      })
      anyChanged = true
    }
  }

  if (!anyChanged) return

  // Clear all nextMatchupId links so wireMatchupAdvancement rebuilds them
  await prisma.matchup.updateMany({
    where: { bracketId, nextMatchupId: { not: null } },
    data: { nextMatchupId: null },
  })

  // Clear entrant assignments on undecided R3+ matchups (they'll be re-propagated)
  await prisma.matchup.updateMany({
    where: {
      bracketId,
      round: { gte: 3 },
      winnerId: null,
    },
    data: { entrant1Id: null, entrant2Id: null },
  })

  // Detect Final Four pairing from bracket settings
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { settings: true },
  })
  const settings = (bracket?.settings ?? {}) as Record<string, unknown>
  const finalFourPairing = (settings.finalFourPairing as string) ?? null

  // Re-wire advancement with correct positions
  await wireMatchupAdvancement(bracketId, undefined, finalFourPairing)

  // Re-propagate winners from decided matchups, round by round
  const decidedMatchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      winnerId: { not: null },
      nextMatchupId: { not: null },
    },
    select: {
      id: true,
      winnerId: true,
      nextMatchupId: true,
      position: true,
      round: true,
    },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })

  for (const matchup of decidedMatchups) {
    if (!matchup.nextMatchupId || !matchup.winnerId) continue
    const slot = await getSlotByFeederOrder(
      prisma, matchup.id, matchup.nextMatchupId, matchup.position
    )
    await prisma.matchup.update({
      where: { id: matchup.nextMatchupId },
      data: { [slot]: matchup.winnerId },
    })
  }
}
```

2. **Call repairBracketAdvancement from triggerSportsSync** in src/actions/sports.ts:

- Add `repairBracketAdvancement` to the import from `@/lib/dal/sports`:
  ```typescript
  import { createSportsBracketDAL, getActiveSportsBrackets, syncBracketResults, repairBracketAdvancement } from '@/lib/dal/sports'
  ```

- In the `triggerSportsSync` function, BEFORE the `await syncBracketResults(bracket.id, games)` call (line ~161), add:
  ```typescript
  // Repair R2-R4 positions before syncing results (fixes Sweet 16 ordering bug)
  await repairBracketAdvancement(bracket.id, games)
  ```

This ensures the wiring is corrected BEFORE winners are propagated during sync.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>repairBracketAdvancement is exported from sports DAL and called in triggerSportsSync before syncBracketResults. Existing brackets with wrong R2-R4 positions will be repaired on next sync: positions recalculated from seeds, nextMatchupId links cleared and rebuilt, undecided R3+ entrants cleared, winners re-propagated in round order through correct slots.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. SEED_TO_R1_POSITION contains all 16 seeds mapping to 8 positions (1-16 to 1, 16-1)
3. R2-R4 import path uses seed-based formula, not sequential counter
4. repairBracketAdvancement is called before syncBracketResults in triggerSportsSync
5. After repair: nextMatchupId links are cleared then rebuilt, decided matchup winners propagate to correct next-round slots
</verification>

<success_criteria>
- Sweet 16 (R2) matchups get positions derived from team seeds, not sequential order
- Elite Eight (R3) and Regional Final (R4) similarly use seed-based positions
- Existing brackets with wrong ordering are auto-repaired on next sync
- Winners propagate to correct matchup slots after re-wiring
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/49-fix-sweet-16-bracket-matchup-ordering-af/49-SUMMARY.md`
</output>
