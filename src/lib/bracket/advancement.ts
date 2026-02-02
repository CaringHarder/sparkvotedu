import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '../../../prisma/generated/prisma'
import { seedLosersFromWinnersRound } from '@/lib/bracket/double-elim'

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
 *
 * For double_elimination brackets: only complete when the highest-round
 * grand_finals matchup has a winnerId. If no GF matchups exist yet, returns null.
 *
 * For all other bracket types: the final matchup is the one with the highest
 * round number. Returns winnerId if complete, null otherwise.
 */
export async function isBracketComplete(
  bracketId: string,
  bracketType?: string
): Promise<string | null> {
  if (bracketType === 'double_elimination') {
    // For DE, only the grand finals determine completion
    const gfMatchups = await prisma.matchup.findMany({
      where: { bracketId, bracketRegion: 'grand_finals' },
      orderBy: { round: 'desc' },
    })

    if (gfMatchups.length === 0) {
      return null // GF not yet created
    }

    // The highest-round GF matchup is the decisive one (could be reset match)
    const finalGf = gfMatchups[0]
    return finalGf.winnerId ?? null
  }

  // SE / Predictive / RR: highest-round matchup with winnerId
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

// ---------------------------------------------------------------------------
// Double-elimination advancement
// ---------------------------------------------------------------------------

/**
 * Compute the losers bracket (LB) engine round that accepts WB dropdowns from
 * a given winners bracket engine round.
 *
 * Mapping (engine rounds, not DB rounds):
 * - WB R1 -> LB R1 (minor: WB R1 losers paired with each other)
 * - WB R(n) for n>=2 -> LB R(2*(n-1)) (major rounds that mix LB survivors + WB dropdowns)
 */
function wbRoundToLbEngineRound(wbEngineRound: number): number {
  if (wbEngineRound === 1) return 1
  return 2 * (wbEngineRound - 1)
}

/**
 * For a WB matchup at a given engine round and position, determine where the loser
 * should be placed in the losers bracket.
 *
 * Uses split-and-reverse seeding to avoid rematches.
 *
 * @param wbEngineRound - Winners bracket engine round (1-based)
 * @param wbPosition - Winners bracket matchup position (1-based)
 * @param wbRoundMatchCount - Total matchups in this WB round
 * @param lbTargetMatchCount - Total matchups in the target LB round
 * @returns { lbPosition, lbSlot } - Where to place the loser in the LB
 */
function computeLoserPlacement(
  wbEngineRound: number,
  wbPosition: number,
  wbRoundMatchCount: number,
  lbTargetMatchCount: number
): { lbPosition: number; lbSlot: 'entrant1Id' | 'entrant2Id' } {
  // Build a position list [1..wbRoundMatchCount] representing WB losers by position
  const positionList = Array.from(
    { length: wbRoundMatchCount },
    (_, i) => i + 1
  )

  // Apply split-and-reverse (seedLosersFromWinnersRound takes string[], we use position strings)
  const reordered = seedLosersFromWinnersRound(
    positionList.map(String),
    lbTargetMatchCount
  ).map(Number)

  // Find where this WB position ended up in the reordered list
  const reorderedIndex = reordered.indexOf(wbPosition)

  if (wbEngineRound === 1) {
    // LB R1 (minor): each LB matchup gets 2 WB losers
    // reorderedIndex 0,1 -> LB P1; 2,3 -> LB P2; etc.
    const lbPosition = Math.floor(reorderedIndex / 2) + 1
    const lbSlot: 'entrant1Id' | 'entrant2Id' =
      reorderedIndex % 2 === 0 ? 'entrant1Id' : 'entrant2Id'
    return { lbPosition, lbSlot }
  } else {
    // LB major round: 1-to-1 mapping (one WB loser per LB matchup)
    // The LB matchup already has one entrant from LB path; WB loser fills the other
    // We use entrant2Id for WB dropdowns (entrant1 reserved for LB survivors via nextMatchupId)
    const lbPosition = reorderedIndex + 1
    return { lbPosition, lbSlot: 'entrant2Id' }
  }
}

/**
 * Advance a matchup in a double-elimination bracket.
 *
 * Handles:
 * 1. Standard winner propagation within the same region (via nextMatchupId)
 * 2. WB losers dropping to the correct LB position (split-and-reverse seeding)
 * 3. WB/LB champions propagating to grand finals
 * 4. Grand finals: bracket completion or dynamic reset match creation
 *
 * All mutations occur within a single Prisma $transaction.
 */
export async function advanceDoubleElimMatchup(
  matchupId: string,
  winnerId: string,
  bracketId: string
): Promise<{ winnerId: string | null; status: string; resetCreated?: boolean }> {
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

    const loserId =
      winnerId === matchup.entrant1Id ? matchup.entrant2Id : matchup.entrant1Id

    const region = (matchup as Record<string, unknown>).bracketRegion as string | null

    // Update the matchup with the winner and set status to decided
    await tx.matchup.update({
      where: { id: matchupId },
      data: { winnerId, status: 'decided' },
    })

    // --- Region-specific logic ---

    // Determine bracket structure info
    // Get all matchups to compute round offsets
    const allMatchups = await tx.matchup.findMany({
      where: { bracketId },
      select: {
        id: true,
        round: true,
        position: true,
        bracketRegion: true,
        entrant1Id: true,
        entrant2Id: true,
        nextMatchupId: true,
      },
    })

    const wbMatchups = allMatchups.filter((m) => m.bracketRegion === 'winners')
    const lbMatchups = allMatchups.filter((m) => m.bracketRegion === 'losers')
    const gfMatchups = allMatchups
      .filter((m) => m.bracketRegion === 'grand_finals')
      .sort((a, b) => a.round - b.round)

    // Propagate winner to the next matchup in the same region (via nextMatchupId)
    if (matchup.nextMatchupId) {
      let slot: 'entrant1Id' | 'entrant2Id'

      if (region === 'losers') {
        // In losers bracket, "major" rounds receive WB dropdowns into entrant2Id.
        // LB survivors from minor rounds must always go into entrant1Id to avoid
        // a slot collision with WB dropdowns.
        // Detect 1-to-1 transitions (minor→major): source and target rounds have
        // the same number of matchups.
        const nextMatchup = allMatchups.find((m) => m.id === matchup.nextMatchupId)
        const currentRoundCount = lbMatchups.filter((m) => m.round === matchup.round).length
        const nextRoundCount = nextMatchup
          ? lbMatchups.filter((m) => m.round === nextMatchup.round).length
          : 0

        if (currentRoundCount === nextRoundCount) {
          // 1-to-1 (minor→major): always use entrant1Id for LB survivors
          slot = 'entrant1Id'
        } else {
          // 2-to-1 (major→minor): standard position-based slot assignment
          slot = getSlotForPosition(matchup.position)
        }
      } else {
        slot = getSlotForPosition(matchup.position)
      }

      await tx.matchup.update({
        where: { id: matchup.nextMatchupId },
        data: { [slot]: winnerId },
      })
    }

    const wbMaxRound = Math.max(...wbMatchups.map((m) => m.round))
    const lbMinRound = lbMatchups.length > 0 ? Math.min(...lbMatchups.map((m) => m.round)) : 0
    const lbMaxRound = lbMatchups.length > 0 ? Math.max(...lbMatchups.map((m) => m.round)) : 0

    // Round offset: LB DB rounds = engine LB rounds + offset
    // WB rounds are 1..wbMaxRound, LB starts at wbMaxRound+1
    const losersRoundOffset = wbMaxRound

    if (region === 'winners' && loserId) {
      // Compute WB engine round (DB round, since WB has no offset)
      const wbEngineRound = matchup.round
      const wbRoundMatchCount = wbMatchups.filter(
        (m) => m.round === matchup.round
      ).length

      // Check if this is the WB final (winner goes to GF)
      const isWbFinal =
        matchup.round === wbMaxRound && matchup.position === 1

      if (isWbFinal) {
        // WB champion goes to GF entrant1 (already handled via nextMatchupId if wired)
        // WB final loser goes to LB final
        // Find the LB final matchup (highest LB round, position 1)
        const lbFinal = lbMatchups.find(
          (m) => m.round === lbMaxRound && m.position === 1
        )
        if (lbFinal) {
          // WB dropdowns always go to entrant2Id in major rounds.
          // The LB Final is a major round — LB survivor fills entrant1Id,
          // WB Final loser fills entrant2Id. This is consistent with all
          // other major round placements and avoids slot collisions.
          await tx.matchup.update({
            where: { id: lbFinal.id },
            data: { entrant2Id: loserId },
          })
        }
      } else {
        // Non-final WB matchup: loser drops to LB
        const lbEngineRound = wbRoundToLbEngineRound(wbEngineRound)
        const lbDbRound = lbEngineRound + losersRoundOffset
        const lbRoundMatchups = lbMatchups.filter(
          (m) => m.round === lbDbRound
        )

        if (lbRoundMatchups.length > 0) {
          const { lbPosition, lbSlot } = computeLoserPlacement(
            wbEngineRound,
            matchup.position,
            wbRoundMatchCount,
            lbRoundMatchups.length
          )

          const targetLbMatchup = lbRoundMatchups.find(
            (m) => m.position === lbPosition
          )
          if (targetLbMatchup) {
            await tx.matchup.update({
              where: { id: targetLbMatchup.id },
              data: { [lbSlot]: loserId },
            })
          }
        }
      }
    }

    if (region === 'losers') {
      // LB champion check: is this the LB final?
      const isLbFinal =
        matchup.round === lbMaxRound && matchup.position === 1

      if (isLbFinal && matchup.nextMatchupId) {
        // LB champion goes to GF entrant2 (via nextMatchupId which should point to GF)
        // Already handled by standard nextMatchupId propagation above.
        // The slot is getSlotForPosition(1) = entrant1Id. But we want entrant2.
        // Fix: LB final position is 1, so getSlotForPosition(1) = entrant1Id.
        // But the GF matchup should have WB champ as entrant1 and LB champ as entrant2.
        // Override: explicitly set entrant2 for GF.
        // Undo the standard propagation first:
        const standardSlot = getSlotForPosition(matchup.position)
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { [standardSlot]: null, entrant2Id: winnerId },
        })
      }
    }

    if (region === 'grand_finals') {
      // Determine if this is GF match 1 or GF match 2 (reset)
      const gfMatch1 = gfMatchups[0]
      const isResetMatch = gfMatchups.length > 1 && matchup.id !== gfMatch1.id

      if (isResetMatch) {
        // GF match 2 (reset): winner is bracket champion
        await tx.bracket.update({
          where: { id: bracketId },
          data: { status: 'completed' },
        })
        return { winnerId, status: 'decided', resetCreated: false }
      }

      // GF match 1: check who won
      // entrant1 = WB champion, entrant2 = LB champion
      if (winnerId === matchup.entrant1Id) {
        // WB champion wins GF match 1 -> bracket complete (no reset needed)
        await tx.bracket.update({
          where: { id: bracketId },
          data: { status: 'completed' },
        })
        return { winnerId, status: 'decided', resetCreated: false }
      } else {
        // LB champion wins GF match 1 -> create reset match dynamically
        // Find the next available round for GF reset
        const gfMaxRound = Math.max(...gfMatchups.map((m) => m.round))
        const resetRound = gfMaxRound + 1

        await tx.matchup.create({
          data: {
            bracketId,
            round: resetRound,
            position: 1,
            bracketRegion: 'grand_finals',
            entrant1Id: matchup.entrant1Id, // WB champion
            entrant2Id: matchup.entrant2Id, // LB champion
            status: 'pending',
          },
        })
        return { winnerId, status: 'decided', resetCreated: true }
      }
    }

    return { winnerId, status: 'decided' }
  })
}
