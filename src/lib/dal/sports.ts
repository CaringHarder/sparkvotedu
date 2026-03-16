/**
 * Sports bracket creation and sync DAL.
 *
 * Handles importing NCAA tournaments as predictive brackets,
 * mapping games to matchups with team metadata, and syncing
 * live scores with automatic winner advancement.
 */

import { prisma } from '@/lib/prisma'
import { getProvider, getProviderName } from '@/lib/sports/provider'
import { resolveTeamLogoUrl } from '@/lib/sports/logo-resolver'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import type { SportsGame, SportsTeam, SportGender } from '@/lib/sports/types'

/**
 * Determine which slot a matchup feeds into in the next round.
 * Odd positions (1, 3, 5...) -> entrant1Id, even positions (2, 4, 6...) -> entrant2Id.
 * Mirrors the logic in bracket.ts getSlotForPosition and advancement.ts.
 */
function getSlotForPosition(position: number): 'entrant1Id' | 'entrant2Id' {
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
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
  // 1. Fetch tournament games from provider
  const provider = getProvider()
  const games = await provider.getTournamentGames(input.tournamentId, input.season)

  // 2. Extract unique real teams from games (skip TBD placeholders with negative IDs)
  const teamMap = new Map<number, SportsTeam>()
  for (const game of games) {
    if (game.homeTeam && game.homeTeam.externalId > 0 && !teamMap.has(game.homeTeam.externalId)) {
      teamMap.set(game.homeTeam.externalId, game.homeTeam)
    }
    if (game.awayTeam && game.awayTeam.externalId > 0 && !teamMap.has(game.awayTeam.externalId)) {
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
        predictiveResolutionMode: 'auto',
        externalTournamentId: input.tournamentId,
        dataSource: getProviderName(),
        lastSyncAt: new Date(),
        sportGender: gender,
        sessionId: input.sessionId,
        size: bracketSize,
        maxEntrants: 68, // includes First Four teams
        playInEnabled: true,
        viewingMode: 'advanced',
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
        },
      })
      entrantByExternalId.set(team.externalId, record.id)
      seedPosition++
    }

    // c. Create Matchup records -- two-pass approach
    // First pass: create all matchups without nextMatchupId
    const allGames = [...firstFourGames, ...mainGames]
    const matchupByExternalGameId = new Map<number, { id: string; position: number }>()

    // Build position counters per round for unique position assignment
    const positionCounters = new Map<number, number>()

    for (const game of allGames) {
      const round = game.round
      const currentPosition = (positionCounters.get(round) ?? 0) + 1
      positionCounters.set(round, currentPosition)

      // Resolve entrant IDs from teams
      const entrant1Id = game.homeTeam
        ? (entrantByExternalId.get(game.homeTeam.externalId) ?? null)
        : null
      const entrant2Id = game.awayTeam
        ? (entrantByExternalId.get(game.awayTeam.externalId) ?? null)
        : null

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
        const slot = getSlotForPosition(matchup.position)
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { [slot]: winnerEntrantId },
        })
      }
    }

    return created
  }, { timeout: 30000 })

  // Return full bracket with relations
  return prisma.bracket.findFirst({
    where: { id: bracket.id, teacherId },
    include: {
      entrants: { orderBy: { seedPosition: 'asc' } },
      matchups: {
        include: { entrant1: true, entrant2: true, winner: true },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      },
    },
  })
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
          const slot = getSlotForPosition(matchup.position)
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

  // Update lastSyncAt on bracket
  if (updatedCount > 0) {
    await prisma.bracket.update({
      where: { id: bracketId },
      data: { lastSyncAt: new Date() },
    })
  }

  // Broadcast bracket update for real-time subscribers
  await broadcastBracketUpdate(bracketId, 'bracket_completed', {
    type: 'scores_synced',
    updatedMatchups: updatedCount,
  }).catch(console.error)
}
