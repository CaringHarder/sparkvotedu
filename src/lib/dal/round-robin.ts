import { prisma } from '@/lib/prisma'
import { generateRoundRobinRounds, calculateRoundRobinStandings } from '@/lib/bracket/round-robin'
import type { RoundRobinResult } from '@/lib/bracket/round-robin'
import type { RoundRobinStanding } from '@/lib/bracket/types'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'

/**
 * Create a round-robin bracket with all matchups organized by round.
 *
 * Uses the circle method schedule generator to produce balanced rounds,
 * then persists the full bracket structure in a single transaction.
 * Round-robin matchups are independent (no nextMatchupId chaining).
 */
export async function createRoundRobinBracketDAL(
  teacherId: string,
  data: {
    name: string
    description?: string
    size: number
    sessionId?: string
    bracketType?: string
    roundRobinPacing?: string
    roundRobinVotingStyle?: string
    roundRobinStandingsMode?: string
    predictiveMode?: string
    predictiveResolutionMode?: string
    playInEnabled?: boolean
    showSeedNumbers?: boolean
  },
  entrants: { name: string; seedPosition: number }[]
) {
  // Generate round-robin schedule from engine
  const rounds = generateRoundRobinRounds(entrants.length)

  const bracket = await prisma.$transaction(async (tx) => {
    // 1. Create the bracket record
    const created = await tx.bracket.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        size: data.size,
        status: 'draft',
        teacherId,
        sessionId: data.sessionId ?? null,
        bracketType: 'round_robin',
        roundRobinPacing: data.roundRobinPacing ?? 'round_by_round',
        roundRobinVotingStyle: data.roundRobinVotingStyle ?? 'simple',
        roundRobinStandingsMode: data.roundRobinStandingsMode ?? 'live',
        predictiveMode: null,
        predictiveResolutionMode: null,
        playInEnabled: false,
        showSeedNumbers: data.showSeedNumbers ?? true,
      },
    })

    // 2. Create all entrant records and build seed -> id map
    const entrantIdBySeed = new Map<number, string>()
    for (const entrant of entrants) {
      const record = await tx.bracketEntrant.create({
        data: {
          name: entrant.name,
          seedPosition: entrant.seedPosition,
          bracketId: created.id,
        },
      })
      entrantIdBySeed.set(entrant.seedPosition, record.id)
    }

    // 3. Create matchup records for each round-robin matchup
    let globalPosition = 1
    for (const round of rounds) {
      for (let i = 0; i < round.matchups.length; i++) {
        const matchup = round.matchups[i]
        await tx.matchup.create({
          data: {
            bracketId: created.id,
            round: round.roundNumber,
            position: globalPosition++,
            roundRobinRound: round.roundNumber,
            entrant1Id: entrantIdBySeed.get(matchup.entrant1Seed) ?? null,
            entrant2Id: entrantIdBySeed.get(matchup.entrant2Seed) ?? null,
            // Round-robin matchups are independent -- no chaining
            nextMatchupId: null,
            bracketRegion: null,
            status: 'pending',
          },
        })
      }
    }

    return created
  })

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
 * Record a round-robin matchup result (win, loss, or tie).
 *
 * Ownership enforced via bracket.teacherId filter.
 * For ties: winnerId is set to null with status = 'decided'.
 * For wins: winnerId is set to the winning entrant with status = 'decided'.
 */
export async function recordRoundRobinResult(
  matchupId: string,
  winnerId: string | null,
  teacherId: string
) {
  // Verify matchup ownership through bracket
  const matchup = await prisma.matchup.findFirst({
    where: { id: matchupId },
    include: {
      bracket: { select: { id: true, teacherId: true } },
    },
  })

  if (!matchup) {
    return { error: 'Matchup not found' }
  }

  if (matchup.bracket.teacherId !== teacherId) {
    return { error: 'Not authorized to modify this matchup' }
  }

  // Update matchup with result
  const updated = await prisma.matchup.update({
    where: { id: matchupId },
    data: {
      winnerId,
      status: 'decided',
    },
    include: { entrant1: true, entrant2: true, winner: true },
  })

  // Broadcast bracket update (non-blocking)
  broadcastBracketUpdate(matchup.bracket.id, 'winner_selected', {
    matchupId,
    winnerId,
  }).catch(console.error)

  return updated
}

/**
 * Calculate round-robin standings for a bracket.
 *
 * Queries all decided matchups, maps to RoundRobinResult format,
 * calls the pure standings calculator, then enriches with entrant names.
 */
export async function getRoundRobinStandings(
  bracketId: string
): Promise<RoundRobinStanding[]> {
  // Get all decided matchups and entrants
  const [matchups, entrants] = await Promise.all([
    prisma.matchup.findMany({
      where: { bracketId, status: 'decided' },
      select: {
        entrant1Id: true,
        entrant2Id: true,
        winnerId: true,
      },
    }),
    prisma.bracketEntrant.findMany({
      where: { bracketId },
      select: { id: true, name: true },
    }),
  ])

  // Build entrant name lookup
  const nameById = new Map<string, string>()
  for (const e of entrants) {
    nameById.set(e.id, e.name)
  }

  // Map to RoundRobinResult format
  const results: RoundRobinResult[] = matchups
    .filter((m) => m.entrant1Id && m.entrant2Id)
    .map((m) => ({
      entrant1Id: m.entrant1Id!,
      entrant2Id: m.entrant2Id!,
      winnerId: m.winnerId,
    }))

  // Calculate standings using the pure engine function
  const standings = calculateRoundRobinStandings(results)

  // Enrich with entrant names
  for (const standing of standings) {
    standing.entrantName = nameById.get(standing.entrantId) ?? standing.entrantId
  }

  return standings
}

/**
 * Advance a round-robin bracket to the next round.
 *
 * For round-by-round pacing: opens matchups for the specified round.
 * Sets matching pending matchups to 'voting' status.
 */
export async function advanceRoundRobinRound(
  bracketId: string,
  roundNumber: number,
  teacherId: string
) {
  // Verify bracket ownership
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: { id: true },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  // Open matchups for the specified round
  const result = await prisma.matchup.updateMany({
    where: {
      bracketId,
      roundRobinRound: roundNumber,
      status: 'pending',
    },
    data: { status: 'voting' },
  })

  // Broadcast bracket update (non-blocking)
  broadcastBracketUpdate(bracketId, 'round_advanced', {
    round: roundNumber,
  }).catch(console.error)

  return { success: true, opened: result.count }
}

/**
 * Check if all round-robin matchups are decided (bracket complete).
 * Returns the top-ranked entrant ID if complete, null otherwise.
 */
export async function isRoundRobinComplete(bracketId: string): Promise<string | null> {
  const matchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: { status: true, winnerId: true },
  })

  if (matchups.length === 0) return null

  const allDecided = matchups.every((m) => m.status === 'decided')
  if (!allDecided) return null

  // All decided — compute standings to find the winner
  const standings = await getRoundRobinStandings(bracketId)
  if (standings.length === 0) return null

  // Return the top-ranked entrant's ID
  return standings[0].entrantId
}
