# Phase 1: Sports Bracket Import Reliability - Research

**Researched:** 2026-03-17
**Domain:** NCAA bracket import pipeline (ESPN provider, Prisma DAL, React UI)
**Confidence:** HIGH

## Summary

This phase improves the existing sports bracket import pipeline across three axes: (1) auto-fixing play-in entrant placement in R1 slots using tournament seed data, (2) adding Final Four pairing configuration as both an import-time and post-import setting, and (3) fixing R0 entrant assignment edge cases. The codebase already has a mature ESPN provider (`src/lib/sports/espn/`), a sports DAL (`src/lib/dal/sports.ts`), import UI (`tournament-browser.tsx`), and bracket settings panel (`bracket-detail.tsx`). No new external libraries are needed -- this is purely internal logic and UI work.

The main technical challenges are: (a) adding a `finalFourPairing` field to the Bracket model and wiring it through the settings action, (b) modifying `wireMatchupAdvancement()` to use configurable region pairings instead of position-based defaults, (c) adding import-time warning collection and display, and (d) handling play-in resolution in `syncBracketResults()` to replace combined entrants with winners.

**Primary recommendation:** Work bottom-up: schema migration first, then DAL logic changes, then server actions, then UI. Each layer is independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Final Four Pairing Configuration:** Dropdown presets UI showing 3 possible region pairings as selectable options. Available during import flow AND in bracket settings. Auto-detect Men's vs Women's tournament from ESPN data. Auto-default to official NCAA pairing if ESPN data reveals actual Final Four matchups. Teacher can override at any time. Changing pairings re-wires R4->R5 nextMatchupId links; warn teacher if students have predictions past R4.
- **Play-in Display & Placement:** Combined entries show "11 TEX/NCSU" format. When play-in resolves, auto-replace with winner's name/logo/seed. R0 hidden from students. Students CAN pick combined entries; prediction updates to winner.
- **Import Error Handling:** Import with warnings -- proceed even if data incomplete. Warnings are import-time only, no persistent banner. Duplicate team detection: prefer R0 treatment. Sync notification approach: Claude's discretion.
- **Auto-fix Behavior:** Silently correct placement during import. Fixes logged server-side. Auto-fix on initial import only, NOT during syncs. If unresolvable, place in next available slot + warning. Manual re-import/refresh: Claude's discretion.

### Claude's Discretion
- Sync notification approach (toast vs silent)
- Whether to add a "Refresh from ESPN" button in bracket settings
- Server-side logging format for auto-fix actions
- Exact dropdown preset UI styling and placement within import wizard

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App framework | Project standard |
| Prisma | v7 | ORM / migrations | Project standard |
| Supabase | - | PostgreSQL hosting | Project standard |
| Tailwind | v4 | Styling | Project standard |
| Zod | - | Validation schemas | Used in all server actions |
| Lucide React | - | Icons | Project standard |

### No New Libraries Needed
This phase is purely internal logic and UI. All required capabilities exist in the current stack.

## Architecture Patterns

### Project Structure (existing, add to)
```
src/
├── lib/dal/sports.ts           # DAL: createSportsBracketDAL, syncBracketResults, wireMatchupAdvancement
├── lib/sports/espn/            # ESPN provider: client, mappers, types
├── lib/sports/types.ts         # Domain types: SportsGame, SportsTeam, etc.
├── actions/sports.ts           # Server actions: importTournament, triggerSportsSync
├── actions/bracket.ts          # Server actions: updateBracketSettings, repairBracketLinkage
├── components/bracket/         # UI: tournament-browser, bracket-detail, bracket-diagram
└── lib/utils/validation.ts     # Zod schemas
prisma/
└── schema.prisma               # Bracket, BracketEntrant, Matchup models
```

### Pattern 1: Schema Migration for finalFourPairing
**What:** Add a `finalFourPairing` string column to the Bracket model to store the selected region pairing.
**When to use:** Before any DAL or UI changes.
**Details:**
- Store as a string like `"East-West,South-Midwest"` (the two semifinal pairings, comma-separated)
- Nullable -- null means "auto-detected or default (position-based)"
- Only 3 valid values for a 4-region tournament:
  1. `"East-West,South-Midwest"` (East vs West, South vs Midwest)
  2. `"East-South,West-Midwest"` (East vs South, West vs Midwest)
  3. `"East-Midwest,West-South"` (East vs Midwest, West vs South)
- For Women's, replace geographic names with Regional 1-4

```typescript
// In schema.prisma, add to Bracket model:
finalFourPairing String? @map("final_four_pairing")
```

### Pattern 2: Import Warning Collection
**What:** Collect warnings during import without aborting, return them alongside the bracket result.
**When to use:** In `createSportsBracketDAL()` and `importTournament()` action.
**Details:**
- Add a `warnings: string[]` array that accumulates issues during import
- Return `{ bracket, warnings }` from the DAL
- Surface warnings in the tournament-browser UI after successful import
- Categories: missing play-in games, null seeds, partial regions, duplicate teams

```typescript
// Return type from createSportsBracketDAL
interface ImportResult {
  bracket: Bracket & { entrants: BracketEntrant[]; matchups: Matchup[] }
  warnings: string[]
}
```

### Pattern 3: Configurable wireMatchupAdvancement
**What:** Modify the cross-region pairing logic in `wireMatchupAdvancement()` to use the bracket's `finalFourPairing` field.
**When to use:** When wiring R4 (Elite Eight) to R5 (Final Four).
**Details:**
- Current code sorts by position and pairs consecutively -- this is wrong for NCAA
- New code: parse `finalFourPairing` string, match R4 matchups by `bracketRegion`, wire to correct R5 matchup based on pairing config
- If `finalFourPairing` is null, fall back to current behavior (consecutive position pairing)

```typescript
// Pseudo-code for pairing-aware wiring
function parsePairing(pairingStr: string): Array<[string, string]> {
  // "East-West,South-Midwest" -> [["East", "West"], ["South", "Midwest"]]
  return pairingStr.split(',').map(pair => pair.split('-') as [string, string])
}
```

### Pattern 4: Play-in Resolution in Sync
**What:** When a First Four game completes, replace the combined entrant in R1 with the actual winning team.
**When to use:** In `syncBracketResults()`.
**Details:**
- On R0 game completion: find the combined entrant (TEX/NCSU), update its name/abbreviation/logo/externalTeamId to the winner
- The R1 matchup slot (entrant1Id or entrant2Id) already points to this entrant, so it auto-updates
- Must also handle predictions: student who picked the combined entry slot keeps their prediction

### Pattern 5: Re-wire R4-R5 on Pairing Change
**What:** When teacher changes Final Four pairing in settings, clear and re-wire R4->R5 nextMatchupId links.
**When to use:** In new `updateFinalFourPairing()` server action.
**Details:**
- Clear nextMatchupId on all R4 matchups for this bracket
- Re-run `wireMatchupAdvancement()` (or targeted R4->R5 logic) with new pairing
- Also clear and re-propagate any R4 winners into R5 entrant slots
- Check if any predictions exist for R5+ rounds -- if so, return a warning for the UI to show

### Anti-Patterns to Avoid
- **Storing pairing as region order in positions:** Positions should reflect display order, not matchup logic. Keep `finalFourPairing` explicit.
- **Modifying entrant records during sync for non-play-in teams:** Sync should only update scores, winners, and play-in resolution. Never change R1+ entrant data during sync.
- **Aborting import on warnings:** Per user decision, import always proceeds. Collect warnings, don't throw.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Region pairing combinations | Manual enumeration | Combinatorial function for N regions | Only 3 combos for 4 regions, but a function is cleaner and supports women's regional names |
| Migration | Raw SQL | Prisma migrate | Project standard, handles rollback |
| Validation | Manual checks | Zod schema extension | Consistent with existing `updateBracketSettingsSchema` |
| Toast notifications | Custom solution | Existing pattern in `bracket-detail.tsx` | Already has success/error message patterns |

## Common Pitfalls

### Pitfall 1: R0 Entrant Duplication
**What goes wrong:** A team appears in both R0 (First Four) games AND in R1 matchups as a regular entrant, creating duplicate BracketEntrant records.
**Why it happens:** ESPN data sometimes includes the same team in multiple contexts before play-in games resolve.
**How to avoid:** The existing `playInTeamIds` Set already handles this -- teams in R0 games are excluded from the main team loop. Verify this works correctly when ESPN data is partial (some play-in games missing).
**Warning signs:** BracketEntrant count > 68, or a team name appearing twice in the entrants list.

### Pitfall 2: Position Collision in R1
**What goes wrong:** Two matchups get the same `position` value in R1, causing display overlap and incorrect bracket wiring.
**Why it happens:** `SEED_TO_R1_POSITION` maps seeds 1-8 to positions 1-8 per region. If ESPN returns a null seed, the fallback `?? 1` collides with the actual seed-1 matchup.
**How to avoid:** When seed is null (99), use the sequential counter fallback for that matchup. Log a warning about the null seed.
**Warning signs:** R1 matchup count != 32, or multiple matchups with same round+position.

### Pitfall 3: Women's Tournament Region Names
**What goes wrong:** Women's tournament uses "Regional 1", "Regional 2" etc. instead of geographic names. If the Final Four pairing config uses geographic names, it won't match.
**Why it happens:** ESPN uses different naming conventions for men's vs women's.
**How to avoid:** Store pairings using the actual region names from ESPN data (which are already in `bracketRegion` on matchups). The pairing dropdown must show the actual region names for the imported bracket, not hardcoded geographic names.
**Warning signs:** Final Four pairing dropdown shows "East/West" for a women's bracket.

### Pitfall 4: Re-wiring R4->R5 With Existing Predictions
**What goes wrong:** Teacher changes Final Four pairing after students made predictions for R5/R6. Re-wiring changes which teams feed into which R5 matchup, invalidating predictions.
**Why it happens:** The pairing determines which region winners play each other in the Final Four.
**How to avoid:** Before re-wiring, check for predictions on R5+ matchups. If found, show a confirmation warning. The re-wire itself should also update the entrant1Id/entrant2Id on R5 matchups if R4 winners already exist.
**Warning signs:** Predictions reference a matchup that no longer has the expected entrants.

### Pitfall 5: Transaction Timeout During Import
**What goes wrong:** The `$transaction` in `createSportsBracketDAL` times out at 30 seconds when ESPN returns incomplete data and auto-fix logic does extra queries.
**Why it happens:** 67 games * multiple DB operations + auto-fix validation per matchup.
**How to avoid:** Keep auto-fix logic simple (seed-based lookup, not additional ESPN queries). The existing 30s timeout should be sufficient for auto-fix since it's just in-memory validation.
**Warning signs:** Prisma timeout errors during import.

### Pitfall 6: ESPN previousHomeGameId/previousAwayGameId Always Null
**What goes wrong:** The ESPN provider sets `previousHomeGameId` and `previousAwayGameId` to null because ESPN's scoreboard API doesn't expose game relationships.
**Why it happens:** ESPN public API limitation. This is already known and documented.
**How to avoid:** The fallback `wireMatchupAdvancement()` already handles this. No change needed -- just be aware that all matchup linking is position/region-based, never ESPN relationship-based.
**Warning signs:** This is expected behavior, not a bug.

## Code Examples

### Example 1: Final Four Pairing Constants
```typescript
// src/lib/sports/pairings.ts
// For 4 regions, there are exactly 3 unique semifinal pairings
// (choosing which 2 of 4 regions play each other, the other 2 play each other)

export interface FinalFourPairing {
  label: string
  value: string  // stored in DB
  semis: [string, string][]  // [[region1, region2], [region3, region4]]
}

export function getFinalFourPairings(regions: string[]): FinalFourPairing[] {
  if (regions.length !== 4) return []
  const [a, b, c, d] = regions
  return [
    {
      label: `${a} vs ${b}, ${c} vs ${d}`,
      value: `${a}-${b},${c}-${d}`,
      semis: [[a, b], [c, d]],
    },
    {
      label: `${a} vs ${c}, ${b} vs ${d}`,
      value: `${a}-${c},${b}-${d}`,
      semis: [[a, c], [b, d]],
    },
    {
      label: `${a} vs ${d}, ${b} vs ${c}`,
      value: `${a}-${d},${b}-${c}`,
      semis: [[a, d], [b, c]],
    },
  ]
}
```

### Example 2: Auto-Fix During Import (Warning Collection)
```typescript
// Inside createSportsBracketDAL, wrap the main loop:
const warnings: string[] = []

for (const game of allGames) {
  const round = game.round
  if (round === 1 && game.bracket && regionIndex.has(game.bracket)) {
    const seed1 = game.homeTeam?.seed ?? 99
    const seed2 = game.awayTeam?.seed ?? 99
    const higherSeed = Math.min(seed1, seed2)

    if (higherSeed === 99) {
      warnings.push(`Missing seed data for R1 game in ${game.bracket} region`)
      // Fall back to sequential position
    }

    const seedPos = SEED_TO_R1_POSITION[higherSeed]
    if (!seedPos && higherSeed !== 99) {
      warnings.push(`Unexpected seed ${higherSeed} in R1 ${game.bracket} - placed in next available slot`)
    }
  }
}
```

### Example 3: Play-in Resolution in syncBracketResults
```typescript
// After detecting R0 game winner, update combined entrant:
if (matchup.round === 0 && game.isClosed && game.winnerId) {
  const winnerTeam = game.homeTeam.externalId === game.winnerId
    ? game.homeTeam : game.awayTeam

  // Find the combined entrant that represents this play-in
  // Combined entrants have externalTeamId = null and name like "TEX/NCSU"
  const combinedEntrant = entrants.find(e =>
    e.externalTeamId === null &&
    e.abbreviation?.includes(winnerTeam.abbreviation)
  )

  if (combinedEntrant) {
    await prisma.bracketEntrant.update({
      where: { id: combinedEntrant.id },
      data: {
        name: winnerTeam.shortName,
        abbreviation: winnerTeam.abbreviation,
        logoUrl: resolveTeamLogoUrl(winnerTeam.logoUrl, winnerTeam.abbreviation),
        externalTeamId: winnerTeam.externalId,
      },
    })
  }
}
```

### Example 4: Pairing-Aware wireMatchupAdvancement (R4->R5)
```typescript
// In the cross-region branch of wireMatchupAdvancement:
if (!isWithinRegion && finalFourPairing) {
  const pairings = parsePairing(finalFourPairing)
  // pairings: [["East", "West"], ["South", "Midwest"]]

  for (let semiIdx = 0; semiIdx < pairings.length; semiIdx++) {
    const [regionA, regionB] = pairings[semiIdx]
    const targetR5 = nextSorted[semiIdx] // R5 matchup for this semifinal

    // Find R4 matchups for each region in this pairing
    const r4A = currentMatchups.find(m => m.bracketRegion === regionA)
    const r4B = currentMatchups.find(m => m.bracketRegion === regionB)

    if (r4A && targetR5) {
      await db.matchup.update({
        where: { id: r4A.id },
        data: { nextMatchupId: targetR5.id },
      })
    }
    if (r4B && targetR5) {
      await db.matchup.update({
        where: { id: r4B.id },
        data: { nextMatchupId: targetR5.id },
      })
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Position-based R4->R5 wiring | Configurable Final Four pairing | This phase | Correct bracket structure |
| Abort import on data issues | Import with warnings | This phase | Better UX for partial ESPN data |
| Combined entrants stay forever | Auto-replace on play-in resolution | This phase | Accurate team display |

**Current codebase facts:**
- `wireMatchupAdvancement()` already exists and handles R1-R3 (within-region) correctly. R4+ (cross-region) uses position-based fallback that needs pairing config.
- `SEED_TO_R1_POSITION` mapping is correct for standard NCAA brackets.
- `playInEntrantIds` map keyed by `"region-opponentSeed"` handles combined entry creation.
- `repairBracketLinkage()` server action already exists -- useful for manual fixing.
- `updateBracketSettings()` action exists but only handles viewingMode/showSeedNumbers/showVoteCounts -- needs `finalFourPairing` added.
- ESPN provider returns `previousHomeGameId: null` and `previousAwayGameId: null` always -- all wiring is position/region-based.
- `syncBracketResults()` currently only updates scores and propagates winners -- needs play-in resolution logic.

## Open Questions

1. **Auto-detect official NCAA pairing from ESPN data**
   - What we know: ESPN Final Four games (R5) have both teams' regions in the headline/data. If R5 games exist, we can parse which regions are paired.
   - What's unclear: Whether ESPN data exposes R5 matchups before the Elite Eight completes.
   - Recommendation: Parse R5 game data if available; otherwise default to most common historical pairing (1v4, 2v3 quadrant style). Make configurable so teacher can always override.

2. **"Refresh from ESPN" button**
   - What we know: `triggerSportsSync()` action already exists. `repairBracketLinkage()` exists for re-wiring.
   - Recommendation: Add a "Refresh from ESPN" button in bracket settings that calls `triggerSportsSync()`. This is low-effort and useful for teachers who want manual control. Show a toast on completion.

3. **Sync notification approach**
   - Recommendation: Use a brief toast notification (2-3 seconds) when manual sync completes. Auto-sync (cron/polling) should be silent -- no notification needed since it happens in the background.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection**: `src/lib/dal/sports.ts` (664 lines), `src/lib/sports/espn/provider.ts`, `src/lib/sports/espn/mappers.ts`, `src/actions/sports.ts`, `src/actions/bracket.ts`, `src/components/bracket/tournament-browser.tsx`, `src/components/bracket/bracket-detail.tsx`, `prisma/schema.prisma`
- **CONTEXT.md**: User decisions from discussion phase (2026-03-17)
- **STATE.md**: Quick tasks 37-44 covering sports bracket evolution

### Secondary (MEDIUM confidence)
- NCAA tournament structure: 68 teams, 4 regions, 3 possible Final Four pairings (combinatorial fact)
- ESPN scoreboard API structure: verified from existing provider code (no external API docs needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, fully within existing codebase
- Architecture: HIGH - all integration points inspected, patterns clear
- Pitfalls: HIGH - based on actual code inspection and known ESPN API limitations

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, unlikely to change)
