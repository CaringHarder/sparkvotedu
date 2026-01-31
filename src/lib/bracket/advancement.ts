import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '../../../prisma/generated/prisma'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Determine whether a matchup at a given position feeds into entrant1 or entrant2
 * of the next matchup. Odd positions (1, 3, 5, 7) map to entrant1Id,
 * even positions (2, 4, 6, 8) map to entrant2Id.
 *
 * This mirrors the bracket engine's `Math.ceil(position / 2)` next matchup calculation.
 */
function getSlotForPosition(position: number): 'entrant1Id' | 'entrant2Id' {
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
}

/**
 * Advance a matchup winner and propagate to the next round.
 * Sets winnerId, updates status to "decided", and places the winner
 * into the correct slot of the next matchup.
 *
 * Slot assignment: odd positions (1, 3, 5, 7) -> entrant1Id,
 * even positions (2, 4, 6, 8) -> entrant2Id.
 *
 * All mutations occur within a Prisma $transaction for atomicity.
 */
export async function advanceMatchupWinner(
  matchupId: string,
  winnerId: string,
  _bracketId: string
): Promise<{ winnerId: string | null; status: string }> {
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Fetch the current matchup
    const matchup = await tx.matchup.findUnique({
      where: { id: matchupId },
    })

    if (!matchup) {
      throw new Error('Matchup not found')
    }

    // Validate winner is one of the entrants
    if (winnerId !== matchup.entrant1Id && winnerId !== matchup.entrant2Id) {
      throw new Error('Winner must be one of the matchup entrants')
    }

    // Update the matchup with the winner and set status to decided
    const updated = await tx.matchup.update({
      where: { id: matchupId },
      data: {
        winnerId,
        status: 'decided',
      },
    })

    // Propagate winner to the next matchup if one exists
    if (matchup.nextMatchupId) {
      const slot = getSlotForPosition(matchup.position)
      await tx.matchup.update({
        where: { id: matchup.nextMatchupId },
        data: {
          [slot]: winnerId,
        },
      })
    }

    return { winnerId: updated.winnerId, status: (updated as Record<string, unknown>).status as string }
  })
}

/**
 * Undo a matchup advancement. Clears winnerId, restores status to "voting",
 * and removes the propagated entrant from the next matchup.
 * Blocked if the next matchup already has votes.
 *
 * All mutations occur within a Prisma $transaction for atomicity.
 */
export async function undoMatchupAdvancement(
  matchupId: string,
  _bracketId: string
): Promise<{ winnerId: string | null; status: string }> {
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Fetch the current matchup
    const matchup = await tx.matchup.findUnique({
      where: { id: matchupId },
    })

    if (!matchup) {
      throw new Error('Matchup not found')
    }

    if (!matchup.winnerId) {
      throw new Error('Matchup has no winner to undo')
    }

    // If there is a next matchup, check for votes and clear propagated entrant
    if (matchup.nextMatchupId) {
      // Check if next matchup has any votes -- block undo if so
      const voteCount = await tx.vote.count({
        where: { matchupId: matchup.nextMatchupId },
      })

      if (voteCount > 0) {
        throw new Error('Cannot undo: next matchup already has votes')
      }

      // Clear the propagated entrant from the next matchup
      const slot = getSlotForPosition(matchup.position)
      await tx.matchup.update({
        where: { id: matchup.nextMatchupId },
        data: {
          [slot]: null,
        },
      })
    }

    // Clear winner and restore status
    const updated = await tx.matchup.update({
      where: { id: matchupId },
      data: {
        winnerId: null,
        status: 'voting',
      },
    })

    return { winnerId: updated.winnerId, status: (updated as Record<string, unknown>).status as string }
  })
}

/**
 * Batch advance all decided matchups in a round.
 * Finds matchups that have a winnerId but whose winner hasn't been propagated
 * to the next matchup yet. Propagates all winners to their respective next matchups.
 *
 * Returns the count of matchups advanced.
 *
 * All mutations occur within a Prisma $transaction for atomicity.
 */
export async function batchAdvanceRound(
  bracketId: string,
  round: number
): Promise<number> {
  return prisma.$transaction(async (tx: TransactionClient) => {
    // Find all decided matchups in this round that have a next matchup
    const matchups = await tx.matchup.findMany({
      where: {
        bracketId,
        round,
        winnerId: { not: null },
        nextMatchupId: { not: null },
      },
    })

    if (matchups.length === 0) {
      return 0
    }

    // Propagate each winner to the next matchup
    for (const matchup of matchups) {
      if (matchup.nextMatchupId && matchup.winnerId) {
        const slot = getSlotForPosition(matchup.position)
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: {
            [slot]: matchup.winnerId,
          },
        })
      }
    }

    return matchups.length
  })
}

/**
 * Check if all matchups in a round are decided.
 * Returns true if every matchup in the round has status "decided".
 * Returns false if the round has no matchups or any are not decided.
 */
export async function checkRoundComplete(
  bracketId: string,
  round: number
): Promise<boolean> {
  const matchups = await prisma.matchup.findMany({
    where: { bracketId, round },
  })

  if (matchups.length === 0) {
    return false
  }

  return matchups.every(
    (m) => (m as Record<string, unknown>).status === 'decided'
  )
}

/**
 * Check if the bracket is complete (final matchup has a winner).
 * The final matchup is the one with the highest round number and position 1.
 *
 * Returns the winnerId if complete, null otherwise.
 */
export async function isBracketComplete(
  bracketId: string
): Promise<string | null> {
  // Get all matchups ordered by round descending to find the final
  const matchups = await prisma.matchup.findMany({
    where: { bracketId },
    orderBy: { round: 'desc' },
    take: 1,
  })

  if (matchups.length === 0) {
    return null
  }

  const finalMatchup = matchups[0]
  return finalMatchup.winnerId ?? null
}
