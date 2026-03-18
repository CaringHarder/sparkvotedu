/**
 * Sports bracket creation and sync DAL.
 *
 * Handles importing NCAA tournaments as predictive brackets,
 * mapping games to matchups with team metadata, and syncing
 * live scores with automatic winner advancement.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '../../../prisma/generated/prisma'
import { getProvider, getProviderName } from '@/lib/sports/provider'
import { resolveTeamLogoUrl } from '@/lib/sports/logo-resolver'
import { broadcastBracketUpdate, broadcastActivityUpdate } from '@/lib/realtime/broadcast'
import type { SportsGame, SportsTeam, SportGender } from '@/lib/sports/types'
import { parsePairing, detectDefaultPairing } from '@/lib/sports/pairings'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Standard NCAA bracket position by higher seed within a region (Round 1).
 * Maps the favored seed in each matchup to its bracket position:
 * 1v16=pos1, 8v9=pos2, 5v12=pos3, 4v13=pos4, 6v11=pos5, 3v14=pos6, 7v10=pos7, 2v15=pos8
 */
const SEED_TO_R1_POSITION: Record<number, number> = {
  1: 1, 8: 2, 5: 3, 4: 4, 6: 5, 3: 6, 7: 7, 2: 8,
}

/**
 * Determine which slot a matchup feeds into in the next matchup.
 * Queries sibling feeders (matchups sharing the same nextMatchupId) and
 * assigns by position order: lower position → entrant1, higher → entrant2.
 * Falls back to position parity for single-feeder cases.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSlotByFeederOrder(
  db: any,
  matchupId: string,
  nextMatchupId: string,
  position: number
): Promise<'entrant1Id' | 'entrant2Id'> {
  const feeders = await db.matchup.findMany({
    where: { nextMatchupId },
    select: { id: true, position: true },
    orderBy: { position: 'asc' },
  })
  if (feeders.length >= 2) {
    return feeders[0].id === matchupId ? 'entrant1Id' : 'entrant2Id'
  }
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
}

/**
 * Compute and write nextMatchupId linkage for all matchups in a bracket
 * based on round/position/region data. This is a fallback for when ESPN
 * data does not provide previousHomeGameId/previousAwayGameId (which is
 * the case for the ESPN provider).
 *
 * Algorithm:
 * - Rounds 1-3 (within-region): group by bracketRegion, sort by position,
 *   pair consecutive matchups: index i feeds into floor(i/2) in the next round.
 * - Rounds 4+ (cross-region): sort by position, pair consecutively.
 * - Round 0 (play-in) and the final round (championship) are skipped.
 * - Only updates matchups where nextMatchupId is currently null.
 *
 * @param bracketId - The bracket to wire
 * @param tx - Optional transaction client; uses prisma directly if not provided
 */
export async function wireMatchupAdvancement(
  bracketId: string,
  tx?: TransactionClient,
  finalFourPairing?: string | null
) {
  const db = tx ?? prisma

  // 1. Fetch all matchups for this bracket
  const matchups = await db.matchup.findMany({
    where: { bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      bracketRegion: true,
      nextMatchupId: true,
    },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })

  // 2. Group by round
  const byRound = new Map<number, typeof matchups>()
  for (const m of matchups) {
    const arr = byRound.get(m.round) ?? []
    arr.push(m)
    byRound.set(m.round, arr)
  }

  // 3. Determine the max round (championship) — skip it (no next round)
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b)
  if (rounds.length === 0) return

  // 4. For each round R (skip R0 and the final round), link to R+1
  for (const round of rounds) {
    if (round === 0) continue // skip play-in
    const nextRound = round + 1
    const nextRoundMatchups = byRound.get(nextRound)
    if (!nextRoundMatchups || nextRoundMatchups.length === 0) continue // final round

    const currentMatchups = byRound.get(round)!

    // Determine if this is a within-region round:
    // Within-region when BOTH rounds share the same set of regions.
    // R4 has "East/West/South/Midwest" but R5 has "Final Four" — that's cross-region.
    const currentRegions = new Set(currentMatchups.map((m) => m.bracketRegion).filter(Boolean))
    const nextRegions = new Set(nextRoundMatchups.map((m) => m.bracketRegion).filter(Boolean))
    const isWithinRegion =
      currentRegions.size > 0 &&
      nextRegions.size > 0 &&
      currentRegions.size === nextRegions.size &&
      [...currentRegions].every((r) => nextRegions.has(r))

    if (isWithinRegion) {
      // Within-region pairing: group both rounds by region
      const currentByRegion = new Map<string, typeof matchups>()
      for (const m of currentMatchups) {
        const region = m.bracketRegion!
        const arr = currentByRegion.get(region) ?? []
        arr.push(m)
        currentByRegion.set(region, arr)
      }

      const nextByRegion = new Map<string, typeof matchups>()
      for (const m of nextRoundMatchups) {
        const region = m.bracketRegion!
        const arr = nextByRegion.get(region) ?? []
        arr.push(m)
        nextByRegion.set(region, arr)
      }

      for (const [region, regionMatchups] of currentByRegion) {
        const sorted = regionMatchups.sort((a, b) => a.position - b.position)
        const nextSorted = (nextByRegion.get(region) ?? []).sort(
          (a, b) => a.position - b.position
        )

        for (let i = 0; i < sorted.length; i++) {
          const m = sorted[i]
          if (m.nextMatchupId !== null) continue // already linked

          const nextIndex = Math.floor(i / 2)
          const target = nextSorted[nextIndex]
          if (!target) continue

          await db.matchup.update({
            where: { id: m.id },
            data: { nextMatchupId: target.id },
          })
        }
      }
    } else {
      // Cross-region pairing (R4 -> Final Four, R5 -> Championship):
      // If finalFourPairing is provided and this is R4->R5, use region-based pairing.
      // Otherwise fall back to position-based consecutive pairing.
      const sorted = currentMatchups.sort((a, b) => a.position - b.position)
      const nextSorted = nextRoundMatchups.sort((a, b) => a.position - b.position)

      let paired = false
      if (finalFourPairing && currentRegions.size > 0 && nextSorted.length >= 2) {
        // Use configured pairing to wire R4 regional champions to correct R5 semis
        const pairingTuples = parsePairing(finalFourPairing)

        for (let pairIdx = 0; pairIdx < pairingTuples.length; pairIdx++) {
          const [regionA, regionB] = pairingTuples[pairIdx]
          const target = nextSorted[pairIdx]
          if (!target) continue

          // Find R4 matchups from each region in this pairing
          for (const m of sorted) {
            if (m.nextMatchupId !== null) continue
            if (m.bracketRegion === regionA || m.bracketRegion === regionB) {
              await db.matchup.update({
                where: { id: m.id },
                data: { nextMatchupId: target.id },
              })
            }
          }
        }
        paired = true
      }

      if (!paired) {
        // Fallback: position-based consecutive pairing
        for (let i = 0; i < sorted.length; i++) {
          const m = sorted[i]
          if (m.nextMatchupId !== null) continue

          const nextIndex = Math.floor(i / 2)
          const target = nextSorted[nextIndex]
          if (!target) continue

          await db.matchup.update({
            where: { id: m.id },
            data: { nextMatchupId: target.id },
          })
        }
      }
    }
  }

  // 5. Propagate bracketRegion to matchups with null region.
  // ESPN sometimes leaves R2 bracketRegion null. Inherit from R1 feeder matchups.
  const refreshed = await db.matchup.findMany({
    where: { bracketId },
    select: { id: true, round: true, bracketRegion: true, nextMatchupId: true },
  })
  const regionByNextId = new Map<string, string>()
  for (const m of refreshed) {
    if (m.bracketRegion && m.nextMatchupId) {
      regionByNextId.set(m.nextMatchupId, m.bracketRegion)
    }
  }
  for (const m of refreshed) {
    if (!m.bracketRegion && m.round > 0) {
      const inherited = regionByNextId.get(m.id)
      if (inherited) {
        await db.matchup.update({
          where: { id: m.id },
          data: { bracketRegion: inherited },
        })
      }
    }
  }
}

/**
 * Create a sports bracket from tournament data fetched via the sports data provider.
 *
 * 1. Fetches all tournament games from the provider
 * 2. Extracts unique teams from games
 * 3. Separates First Four (play-in) games from main bracket games
 * 4. Creates bracket, entrants, and matchups in a single transaction
 * 5. Wires nextMatchupId using game relationship data (two-pass approach)
 * 6. Sets winners for already-completed games
 *
 * @param teacherId - The teacher creating the bracket
 * @param input - Tournament and session info
 * @returns The created bracket with entrants and matchups
 */
export async function createSportsBracketDAL(
  teacherId: string,
  input: { tournamentId: string; season: number; sessionId: string }
) {
  const warnings: string[] = []

  // 1. Fetch tournament games from provider
  const provider = getProvider()
  const games = await provider.getTournamentGames(input.tournamentId, input.season)

  // 2. Extract unique real teams from games (skip TBD placeholders with negative IDs)
  // Also collect play-in team IDs — these get combined entrants instead of individual ones
  const playInTeamIds = new Set<number>()
  for (const game of games) {
    if (game.round === 0) {
      if (game.homeTeam && game.homeTeam.externalId > 0) playInTeamIds.add(game.homeTeam.externalId)
      if (game.awayTeam && game.awayTeam.externalId > 0) playInTeamIds.add(game.awayTeam.externalId)
    }
  }

  const teamMap = new Map<number, SportsTeam>()
  for (const game of games) {
    if (game.homeTeam && game.homeTeam.externalId > 0 && !playInTeamIds.has(game.homeTeam.externalId) && !teamMap.has(game.homeTeam.externalId)) {
      teamMap.set(game.homeTeam.externalId, game.homeTeam)
    }
    if (game.awayTeam && game.awayTeam.externalId > 0 && !playInTeamIds.has(game.awayTeam.externalId) && !teamMap.has(game.awayTeam.externalId)) {
      teamMap.set(game.awayTeam.externalId, game.awayTeam)
    }
  }
  const teams = Array.from(teamMap.values())

  // 3. Determine gender from tournamentId string
  const gender: SportGender = input.tournamentId.toLowerCase().includes('womens')
    ? 'womens'
    : 'mens'

  // 4. Separate First Four games (round === 0) from main bracket games
  const firstFourGames = games.filter((g) => g.round === 0)
  const mainGames = games.filter((g) => g.round > 0)

  // 5. Bracket size for standard March Madness
  const bracketSize = 64
  const totalRounds = Math.ceil(Math.log2(bracketSize)) // 6

  // 6. Build bracket name
  const genderLabel = gender === 'womens' ? "Women's" : "Men's"
  const bracketName = `NCAA March Madness ${input.season} - ${genderLabel}`

  // Use Prisma $transaction with 30s timeout (matching 07-16 pattern)
  const bracket = await prisma.$transaction(async (tx) => {
    // a. Create the Bracket record
    const created = await tx.bracket.create({
      data: {
        name: bracketName,
        bracketType: 'sports',
        status: 'draft',
        predictionStatus: 'draft',
        predictiveResolutionMode: 'auto',
        externalTournamentId: input.tournamentId,
        dataSource: getProviderName(),
        lastSyncAt: new Date(),
        sportGender: gender,
        sessionId: input.sessionId,
        size: bracketSize,
        maxEntrants: bracketSize, // 64: play-in teams are combined into single entrants
        playInEnabled: true,
        viewingMode: 'advanced',
        predictiveMode: 'advanced',
        showSeedNumbers: true,
        teacherId,
      },
    })

    // b. Create BracketEntrant records for each team
    // Track entrant IDs by external team ID for matchup wiring
    const entrantByExternalId = new Map<number, string>()
    let seedPosition = 1

    for (const team of teams) {
      // Use auto-incrementing seedPosition for uniqueness constraint.
      // NCAA seeds (1-16) repeat across 4 regions, so team.seed is NOT unique.
      const record = await tx.bracketEntrant.create({
        data: {
          name: team.shortName,
          seedPosition,
          bracketId: created.id,
          externalTeamId: team.externalId,
          logoUrl: resolveTeamLogoUrl(team.logoUrl, team.abbreviation),
          abbreviation: team.abbreviation,
          tournamentSeed: team.seed ?? null,
        },
      })
      entrantByExternalId.set(team.externalId, record.id)
      seedPosition++
    }

    // b2. Create combined play-in entrants for First Four games
    // ESPN shows "TEX/NCSU" as a selectable entry in R1 matchups where
    // the opponent comes from a First Four play-in. This makes all 32
    // R1 matchups fully selectable for predictions from day one.
    //
    // Match logic: First Four seed 16 in region X → R1 game where seed 1 plays TBD
    //              First Four seed 11 in region X → R1 game where seed 6 plays TBD
    const playInEntrantIds = new Map<string, string>() // key: "region-seed" → entrantId

    for (const ffGame of firstFourGames) {
      const team1 = ffGame.homeTeam
      const team2 = ffGame.awayTeam
      if (!team1 || !team2 || team1.externalId <= 0 || team2.externalId <= 0) {
        warnings.push(`Incomplete play-in game data in ${ffGame.bracket ?? 'unknown'} region`)
        continue
      }

      const ffSeed = team1.seed ?? team2.seed ?? null
      const ffRegion = ffGame.bracket
      if (!ffSeed || !ffRegion) continue

      // Create combined entrant: "TEX/NCSU" with shared seed
      const combinedName = `${team1.abbreviation}/${team2.abbreviation}`
      const combinedRecord = await tx.bracketEntrant.create({
        data: {
          name: combinedName,
          seedPosition,
          bracketId: created.id,
          externalTeamId: null, // No single team — placeholder
          logoUrl: null, // No single logo for combined entry
          abbreviation: combinedName,
          tournamentSeed: ffSeed,
        },
      })
      seedPosition++

      // Store for R1 matchup assignment: key is "region-opponentSeed"
      // Seed 16 play-in feeds into 1-seed's matchup, seed 11 feeds into 6-seed's
      const r1OpponentSeed = ffSeed === 16 ? 1 : ffSeed === 11 ? 6 : null
      if (r1OpponentSeed && ffRegion) {
        playInEntrantIds.set(`${ffRegion}-${r1OpponentSeed}`, combinedRecord.id)
      }
    }

    // c. Create Matchup records -- two-pass approach
    // First pass: create all matchups without nextMatchupId
    const allGames = [...firstFourGames, ...mainGames]
    const matchupByExternalGameId = new Map<number, { id: string; position: number }>()

    // Build region ordering for seed-based R1 position assignment
    // Collect unique region names from R1 main games (exclude Final Four / null regions)
    const r1Regions: string[] = []
    for (const game of mainGames) {
      if (game.round === 1 && game.bracket && !r1Regions.includes(game.bracket)) {
        r1Regions.push(game.bracket)
      }
    }
    const regionIndex = new Map<string, number>()
    r1Regions.forEach((r, i) => regionIndex.set(r, i))

    // Position counters for non-R1 rounds (R0, R2+)
    const positionCounters = new Map<number, number>()
    // Track used positions per region for collision detection (auto-fix)
    const usedPositionsByRegion = new Map<string, Set<number>>()

    for (const game of allGames) {
      const round = game.round

      // For R1 main bracket games: use seed-based position ordering
      let currentPosition: number
      if (round === 1 && game.bracket && regionIndex.has(game.bracket)) {
        // Determine the higher seed (lower number) from both teams
        const seed1 = game.homeTeam?.seed ?? 99
        const seed2 = game.awayTeam?.seed ?? 99
        const higherSeed = Math.min(seed1, seed2)
        const regIdx = regionIndex.get(game.bracket) ?? 0

        // Get or create the used positions set for this region
        if (!usedPositionsByRegion.has(game.bracket)) {
          usedPositionsByRegion.set(game.bracket, new Set())
        }
        const usedPositions = usedPositionsByRegion.get(game.bracket)!

        if (higherSeed === 99) {
          // Missing seed data -- use next available position
          warnings.push(`Missing seed data for R1 game in ${game.bracket} region`)
          let nextPos = 1
          while (usedPositions.has(nextPos)) nextPos++
          currentPosition = regIdx * 8 + nextPos
          usedPositions.add(nextPos)
        } else {
          const seedPos = SEED_TO_R1_POSITION[higherSeed]
          if (seedPos === undefined) {
            // Unexpected seed value
            warnings.push(`Unexpected seed ${higherSeed} in ${game.bracket} region - placed in next available slot`)
            let nextPos = 1
            while (usedPositions.has(nextPos)) nextPos++
            currentPosition = regIdx * 8 + nextPos
            usedPositions.add(nextPos)
          } else if (usedPositions.has(seedPos)) {
            // Position collision -- auto-fix by finding next available
            warnings.push(`Seed ${higherSeed} position collision in ${game.bracket} region - auto-fixed to next available slot`)
            let nextPos = 1
            while (usedPositions.has(nextPos)) nextPos++
            currentPosition = regIdx * 8 + nextPos
            usedPositions.add(nextPos)
          } else {
            currentPosition = regIdx * 8 + seedPos
            usedPositions.add(seedPos)
          }
        }
      } else {
        // For R0 (First Four) and R2+ games: sequential counter
        currentPosition = (positionCounters.get(round) ?? 0) + 1
        positionCounters.set(round, currentPosition)
      }

      // Resolve entrant IDs from teams
      // For R1 matchups with TBD slots (play-in feeder), use the combined entrant
      let entrant1Id = game.homeTeam
        ? (entrantByExternalId.get(game.homeTeam.externalId) ?? null)
        : null
      let entrant2Id = game.awayTeam
        ? (entrantByExternalId.get(game.awayTeam.externalId) ?? null)
        : null

      // Fill TBD slots in R1 with combined play-in entrants
      if (round === 1 && game.bracket) {
        if (!entrant1Id && entrant2Id) {
          // Home team is TBD — find play-in entrant for this region + away team's seed
          const awaySeed = game.awayTeam?.seed ?? 99
          const playInId = playInEntrantIds.get(`${game.bracket}-${awaySeed}`)
          if (playInId) entrant1Id = playInId
        }
        if (!entrant2Id && entrant1Id) {
          // Away team is TBD — find play-in entrant for this region + home team's seed
          const homeSeed = game.homeTeam?.seed ?? 99
          const playInId = playInEntrantIds.get(`${game.bracket}-${homeSeed}`)
          if (playInId) entrant2Id = playInId
        }
      }

      // Determine bracket region
      // Men's: East, West, South, Midwest, Final Four
      // Women's (ESPN): Regional 1, Regional 2, Regional 3, Regional 4, Final Four
      const bracketRegion = game.bracket ?? null

      const matchup = await tx.matchup.create({
        data: {
          bracketId: created.id,
          round,
          position: currentPosition,
          entrant1Id,
          entrant2Id,
          externalGameId: game.externalId,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          gameStatus: game.status,
          gameStartTime: game.startTime ? new Date(game.startTime) : null,
          isBye: false,
          bracketRegion,
          status: 'pending',
        },
        select: { id: true, round: true, position: true },
      })

      matchupByExternalGameId.set(game.externalId, {
        id: matchup.id,
        position: matchup.position,
      })
    }

    // d. Second pass: wire nextMatchupId using previousHomeGameId/previousAwayGameId
    // For each game that references a previous game, find the previous game's matchup
    // and set its nextMatchupId to the current game's matchup
    for (const game of allGames) {
      const currentMatchup = matchupByExternalGameId.get(game.externalId)
      if (!currentMatchup) continue

      if (game.previousHomeGameId) {
        const prevMatchup = matchupByExternalGameId.get(game.previousHomeGameId)
        if (prevMatchup) {
          await tx.matchup.update({
            where: { id: prevMatchup.id },
            data: { nextMatchupId: currentMatchup.id },
          })
        }
      }

      if (game.previousAwayGameId) {
        const prevMatchup = matchupByExternalGameId.get(game.previousAwayGameId)
        if (prevMatchup) {
          await tx.matchup.update({
            where: { id: prevMatchup.id },
            data: { nextMatchupId: currentMatchup.id },
          })
        }
      }
    }

    // d2. Detect Final Four pairing from ESPN data (if R5 games exist)
    const detectedPairing = detectDefaultPairing(games, r1Regions)

    // d3. Fallback: wire nextMatchupId from position data for any matchups
    // still unlinked after ESPN Pass 2 (ESPN provider returns null for
    // previousHomeGameId/previousAwayGameId)
    await wireMatchupAdvancement(created.id, tx, detectedPairing)

    // d4. Save detected pairing to bracket
    if (detectedPairing) {
      await tx.bracket.update({
        where: { id: created.id },
        data: { finalFourPairing: detectedPairing },
      })
    }

    // e. Set winners for already-completed games and propagate to next matchup
    for (const game of allGames) {
      if (!game.isClosed || !game.winnerId) continue

      const matchupInfo = matchupByExternalGameId.get(game.externalId)
      if (!matchupInfo) continue

      const winnerEntrantId = entrantByExternalId.get(game.winnerId)
      if (!winnerEntrantId) continue

      await tx.matchup.update({
        where: { id: matchupInfo.id },
        data: { winnerId: winnerEntrantId, status: 'decided' },
      })

      // Propagate winner to next matchup
      const matchup = await tx.matchup.findUnique({
        where: { id: matchupInfo.id },
        select: { nextMatchupId: true, position: true },
      })
      if (matchup?.nextMatchupId) {
        const slot = await getSlotByFeederOrder(tx, matchupInfo.id, matchup.nextMatchupId, matchup.position)
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { [slot]: winnerEntrantId },
        })
      }
    }

    return created
  }, { timeout: 30000 })

  // Log warnings server-side
  if (warnings.length > 0) {
    console.warn('[sports-import]', ...warnings)
  }

  // Return full bracket with relations and warnings
  const fullBracket = await prisma.bracket.findFirst({
    where: { id: bracket.id, teacherId },
    include: {
      entrants: { orderBy: { seedPosition: 'asc' } },
      matchups: {
        include: { entrant1: true, entrant2: true, winner: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      },
    },
  })

  return { bracket: fullBracket, warnings }
}

/**
 * Get all active (non-completed) sports brackets.
 * Used by the sync cron to find brackets that need score updates.
 */
export async function getActiveSportsBrackets() {
  return prisma.bracket.findMany({
    where: {
      bracketType: 'sports',
      status: { not: 'completed' },
    },
    include: {
      matchups: {
        where: { externalGameId: { not: null } },
        select: {
          id: true,
          externalGameId: true,
          homeScore: true,
          awayScore: true,
          gameStatus: true,
          winnerId: true,
          nextMatchupId: true,
          position: true,
        },
      },
      entrants: {
        select: {
          id: true,
          externalTeamId: true,
        },
      },
    },
  })
}

/**
 * Sync bracket matchup results from live game data.
 *
 * For each matchup with an externalGameId:
 * - Updates homeScore, awayScore, gameStatus
 * - If game is closed and has a winner, sets winnerId and propagates to next matchup
 * - Updates lastSyncAt on the bracket
 * - Broadcasts bracket_update for real-time subscribers
 *
 * @param bracketId - The bracket to sync
 * @param games - Fresh game data from the provider
 */
export async function syncBracketResults(bracketId: string, games: SportsGame[]) {
  // Build game lookup by externalId
  const gameByExternalId = new Map<number, SportsGame>()
  for (const game of games) {
    gameByExternalId.set(game.externalId, game)
  }

  // Fetch matchups with external game IDs and entrants for winner lookup
  const matchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      externalGameId: { not: null },
    },
    select: {
      id: true,
      externalGameId: true,
      homeScore: true,
      awayScore: true,
      gameStatus: true,
      winnerId: true,
      nextMatchupId: true,
      position: true,
    },
  })

  // Fetch entrants for external team ID lookup
  const entrants = await prisma.bracketEntrant.findMany({
    where: { bracketId },
    select: { id: true, externalTeamId: true },
  })

  const entrantByExternalTeamId = new Map<number, string>()
  for (const e of entrants) {
    if (e.externalTeamId !== null) {
      entrantByExternalTeamId.set(e.externalTeamId, e.id)
    }
  }

  let updatedCount = 0

  for (const matchup of matchups) {
    if (matchup.externalGameId === null) continue

    const game = gameByExternalId.get(matchup.externalGameId)
    if (!game) continue

    // Update scores and game status
    const updateData: Record<string, unknown> = {
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      gameStatus: game.status,
    }

    // If game is closed and has a winner, and matchup doesn't already have one
    if (game.isClosed && game.winnerId && !matchup.winnerId) {
      const winnerEntrantId = entrantByExternalTeamId.get(game.winnerId)
      if (winnerEntrantId) {
        updateData.winnerId = winnerEntrantId
        updateData.status = 'decided'

        // Propagate winner to next matchup
        if (matchup.nextMatchupId) {
          const slot = await getSlotByFeederOrder(prisma, matchup.id, matchup.nextMatchupId, matchup.position)
          await prisma.matchup.update({
            where: { id: matchup.nextMatchupId },
            data: { [slot]: winnerEntrantId },
          })
        }
      }
    }

    await prisma.matchup.update({
      where: { id: matchup.id },
      data: updateData,
    })

    updatedCount++
  }

  // Play-in (R0) resolution: replace combined entrants with actual winners
  const r0Matchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      round: 0,
      externalGameId: { not: null },
    },
    select: {
      id: true,
      externalGameId: true,
    },
  })

  for (const r0 of r0Matchups) {
    if (r0.externalGameId === null) continue
    const game = gameByExternalId.get(r0.externalGameId)
    if (!game || !game.isClosed || !game.winnerId) continue

    // Determine the winning team from the game data
    const winningTeam =
      game.homeTeam && game.homeTeam.externalId === game.winnerId
        ? game.homeTeam
        : game.awayTeam && game.awayTeam.externalId === game.winnerId
          ? game.awayTeam
          : null
    if (!winningTeam) continue

    // Find the combined entrant (externalTeamId IS NULL, abbreviation contains winner)
    const combinedEntrant = await prisma.bracketEntrant.findFirst({
      where: {
        bracketId,
        externalTeamId: null,
        abbreviation: { contains: winningTeam.abbreviation },
      },
      select: { id: true },
    })

    if (combinedEntrant) {
      await prisma.bracketEntrant.update({
        where: { id: combinedEntrant.id },
        data: {
          name: winningTeam.shortName,
          abbreviation: winningTeam.abbreviation,
          logoUrl: resolveTeamLogoUrl(winningTeam.logoUrl, winningTeam.abbreviation),
          externalTeamId: winningTeam.externalId,
        },
      })
      console.log('[play-in-resolve]', winningTeam.abbreviation, 'wins play-in, replacing combined entry')
    }
  }

  // Update lastSyncAt on bracket
  if (updatedCount > 0) {
    await prisma.bracket.update({
      where: { id: bracketId },
      data: { lastSyncAt: new Date() },
    })
  }

  // Check if all matchups are now decided → auto-complete the bracket
  const allMatchups = await prisma.matchup.findMany({
    where: { bracketId, round: { gt: 0 } }, // Exclude R0 play-in matchups
    select: { status: true },
  })

  const allDecided = allMatchups.length > 0 && allMatchups.every((m) => m.status === 'decided')

  if (allDecided) {
    // Fetch current bracket state to check if already completed
    const currentBracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { status: true, predictionStatus: true, sessionId: true },
    })

    if (currentBracket && currentBracket.status !== 'completed') {
      await prisma.bracket.update({
        where: { id: bracketId },
        data: {
          status: 'completed',
          predictionStatus: 'completed',
        },
      })

      // Broadcast completion for teacher live dashboard + student activity grid
      broadcastBracketUpdate(bracketId, 'bracket_completed', {
        type: 'tournament_complete',
      }).catch(console.error)

      if (currentBracket.sessionId) {
        broadcastActivityUpdate(currentBracket.sessionId).catch(console.error)
      }
    }
  }

  // Broadcast score sync for real-time subscribers
  if (updatedCount > 0) {
    broadcastBracketUpdate(bracketId, 'scores_synced', {
      updatedMatchups: updatedCount,
    }).catch(console.error)
  }
}
