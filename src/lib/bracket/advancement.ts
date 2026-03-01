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

  if (bracketType === 'round_robin') {
    // RR: all matchups must be decided (no single "final" matchup)
    const rrMatchups = await prisma.matchup.findMany({
      where: { bracketId },
      select: { status: true },
    })
    if (rrMatchups.length === 0) return null
    const allDecided = rrMatchups.every((m) => m.status === 'decided')
    if (!allDecided) return null
    // Return a truthy non-null value; actual winner computed by standings
    return 'rr_complete'
  }

  // SE / Predictive: highest-round matchup with winnerId
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
      const nextMatchup = allMatchups.find((m) => m.id === matchup.nextMatchupId)
      let slot: 'entrant1Id' | 'entrant2Id'
      let skipPropagation = false

      if (region === 'losers') {
        // Skip standard propagation for LB Final → Grand Finals.
        // LB champion goes to GF entrant2Id, handled explicitly in the
        // region-specific block below. Standard propagation would incorrectly
        // place LB champion in entrant1Id (position 1) and collide with
        // WB champion who should be in entrant1Id.
        if (nextMatchup?.bracketRegion === 'grand_finals') {
          skipPropagation = true
          slot = 'entrant2Id' // unused but required for typing
        } else {
          // In losers bracket, "major" rounds receive WB dropdowns into entrant2Id.
          // LB survivors from minor rounds must always go into entrant1Id to avoid
          // a slot collision with WB dropdowns.
          // Detect 1-to-1 transitions (minor→major): source and target rounds have
          // the same number of matchups.
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
        }
      } else {
        slot = getSlotForPosition(matchup.position)
      }

      if (!skipPropagation) {
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { [slot]: winnerId },
        })
      }
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
        // LB champion goes to GF entrant2Id.
        // Standard propagation was skipped above (skipPropagation=true for LB→GF).
        // Set entrant2Id directly — entrant1Id is reserved for WB champion and
        // must not be touched (it may already be populated if WB Final resolved first).
        await tx.matchup.update({
          where: { id: matchup.nextMatchupId },
          data: { entrant2Id: winnerId },
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

// ---------------------------------------------------------------------------
// Round-level undo engine functions
// ---------------------------------------------------------------------------

/**
 * Determine the most recently advanced round that is eligible for undo.
 *
 * Rules per bracket type:
 * - SE/Predictive: highest round where ALL matchups are 'decided' AND the next
 *   round (if any) has no 'voting' or 'decided' matchups. Returns null when no
 *   decided rounds exist or the next round has active voting.
 * - RR: same logic but uses the `roundRobinRound` field instead of `round`.
 * - DE: per-region detection. Returns `{ round, region }` for the most recently
 *   advanced region-round. Priority: grand_finals > losers > winners.
 *
 * @returns `{ round, region? }` or null if no undo is available
 */
export async function getMostRecentAdvancedRound(
  bracketId: string,
  bracketType: string
): Promise<{ round: number; region?: string } | null> {
  const allMatchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      status: true,
      bracketRegion: true,
      roundRobinRound: true,
      isBye: true,
    },
  })

  if (allMatchups.length === 0) return null

  if (bracketType === 'round_robin') {
    // RR: use roundRobinRound field
    const rrRounds = [...new Set(
      allMatchups
        .filter((m) => m.roundRobinRound != null)
        .map((m) => m.roundRobinRound as number)
    )].sort((a, b) => b - a) // descending

    for (const rrRound of rrRounds) {
      const roundMatchups = allMatchups.filter((m) => m.roundRobinRound === rrRound)
      const allDecided = roundMatchups.every((m) => m.status === 'decided')
      if (!allDecided) continue

      // Check if the next RR round has any voting/decided matchups
      const nextRrRound = rrRound + 1
      const nextRoundMatchups = allMatchups.filter((m) => m.roundRobinRound === nextRrRound)
      const nextRoundHasActive = nextRoundMatchups.some(
        (m) => m.status === 'voting' || m.status === 'decided'
      )
      if (nextRoundHasActive) return null

      return { round: rrRound }
    }
    return null
  }

  if (bracketType === 'double_elimination') {
    // DE: per-region detection
    const regions = ['grand_finals', 'losers', 'winners'] as const // priority order

    for (const region of regions) {
      const regionMatchups = allMatchups.filter((m) => m.bracketRegion === region)
      if (regionMatchups.length === 0) continue

      const regionRounds = [...new Set(regionMatchups.map((m) => m.round))].sort(
        (a, b) => b - a
      ) // descending

      for (const round of regionRounds) {
        const roundMatchups = regionMatchups.filter((m) => m.round === round)
        const allDecided = roundMatchups.every((m) => m.status === 'decided')
        if (!allDecided) continue

        // Check if the next round in this region has any voting/decided matchups
        const nextRound = round + 1
        const nextRoundMatchups = regionMatchups.filter((m) => m.round === nextRound)
        const nextRoundHasActive = nextRoundMatchups.some(
          (m) => m.status === 'voting' || m.status === 'decided'
        )
        if (nextRoundHasActive) continue

        return { round, region }
      }
    }
    return null
  }

  // SE / Predictive: standard round-based detection
  // Exclude bye matchups from round completeness checks
  const nonByeMatchups = allMatchups.filter((m) => !m.isBye)
  const rounds = [...new Set(nonByeMatchups.map((m) => m.round))].sort(
    (a, b) => b - a
  ) // descending

  for (const round of rounds) {
    const roundMatchups = nonByeMatchups.filter((m) => m.round === round)
    const allDecided = roundMatchups.every((m) => m.status === 'decided')
    if (!allDecided) continue

    // Check if the next round has any voting/decided matchups
    const nextRound = round + 1
    const nextRoundMatchups = nonByeMatchups.filter((m) => m.round === nextRound)
    const nextRoundHasActive = nextRoundMatchups.some(
      (m) => m.status === 'voting' || m.status === 'decided'
    )
    if (nextRoundHasActive) return null

    return { round }
  }

  return null
}

/**
 * Undo a round of single-elimination advancement.
 *
 * Clears winners and votes in the target round, removes propagated entrants
 * from the next round, and cascades to all downstream rounds (clearing
 * entrants, winners, votes, and resetting status to 'pending').
 *
 * All mutations are atomic within a single Prisma $transaction.
 */
export async function undoRoundSE(
  bracketId: string,
  round: number
): Promise<{ undoneMatchups: number; clearedVotes: number; cascadedMatchups: number }> {
  return prisma.$transaction(
    async (tx: TransactionClient) => {
      // 1. Get all decided matchups in the target round
      const roundMatchups = await tx.matchup.findMany({
        where: { bracketId, round, status: 'decided' },
      })

      if (roundMatchups.length === 0) {
        return { undoneMatchups: 0, clearedVotes: 0, cascadedMatchups: 0 }
      }

      const roundMatchupIds = roundMatchups.map((m) => m.id)

      // 2. Delete all votes for these matchups
      const voteResult = await tx.vote.deleteMany({
        where: { matchupId: { in: roundMatchupIds } },
      })

      // 3. Clear winnerId and reset status to 'pending'
      await tx.matchup.updateMany({
        where: { id: { in: roundMatchupIds } },
        data: { winnerId: null, status: 'pending' },
      })

      // 4. Clear propagated entrants in the next round via nextMatchupId
      for (const matchup of roundMatchups) {
        if (matchup.nextMatchupId) {
          const slot = getSlotForPosition(matchup.position)
          await tx.matchup.update({
            where: { id: matchup.nextMatchupId },
            data: { [slot]: null },
          })
        }
      }

      // 5. Cascade: clear all downstream rounds (round > target)
      const downstreamMatchups = await tx.matchup.findMany({
        where: { bracketId, round: { gt: round } },
      })

      let cascadedMatchups = 0
      if (downstreamMatchups.length > 0) {
        const downstreamIds = downstreamMatchups.map((m) => m.id)

        // Delete all votes in downstream matchups
        await tx.vote.deleteMany({
          where: { matchupId: { in: downstreamIds } },
        })

        // Clear winners, entrants, and reset status on downstream matchups
        await tx.matchup.updateMany({
          where: { id: { in: downstreamIds } },
          data: {
            winnerId: null,
            entrant1Id: null,
            entrant2Id: null,
            status: 'pending',
          },
        })

        cascadedMatchups = downstreamMatchups.length
      }

      return {
        undoneMatchups: roundMatchups.length,
        clearedVotes: voteResult.count,
        cascadedMatchups,
      }
    },
    { timeout: 30000 }
  )
}

/**
 * Undo a round of round-robin advancement.
 *
 * Clears winners and votes for matchups in the specified `roundRobinRound`.
 * No cascade is needed because RR matchups are independent -- there is no
 * entrant propagation between rounds.
 *
 * All mutations are atomic within a single Prisma $transaction.
 */
export async function undoRoundRR(
  bracketId: string,
  roundRobinRound: number
): Promise<{ undoneMatchups: number; clearedVotes: number }> {
  return prisma.$transaction(
    async (tx: TransactionClient) => {
      // 1. Get all decided matchups for the target roundRobinRound
      const roundMatchups = await tx.matchup.findMany({
        where: { bracketId, roundRobinRound, status: 'decided' },
      })

      if (roundMatchups.length === 0) {
        return { undoneMatchups: 0, clearedVotes: 0 }
      }

      const roundMatchupIds = roundMatchups.map((m) => m.id)

      // 2. Delete all votes for these matchups
      const voteResult = await tx.vote.deleteMany({
        where: { matchupId: { in: roundMatchupIds } },
      })

      // 3. Clear winnerId and set status to 'pending'
      await tx.matchup.updateMany({
        where: { id: { in: roundMatchupIds } },
        data: { winnerId: null, status: 'pending' },
      })

      // 4. No cascade needed -- RR matchups are independent (no nextMatchupId, no entrant propagation)

      return {
        undoneMatchups: roundMatchups.length,
        clearedVotes: voteResult.count,
      }
    },
    { timeout: 30000 }
  )
}

/**
 * Undo a round of double-elimination advancement for a specific region.
 *
 * Handles cross-region cascade effects:
 * - Winners region: reverses loser placements into the losers bracket,
 *   cascades to downstream LB and GF matchups.
 * - Losers region: clears LB round results, cascades to downstream LB and GF.
 * - Grand finals: handles GF match 1 and reset match deletion.
 *
 * All mutations are atomic within a single Prisma $transaction.
 */
export async function undoRoundDE(
  bracketId: string,
  round: number,
  region: 'winners' | 'losers' | 'grand_finals'
): Promise<{
  undoneMatchups: number
  clearedVotes: number
  cascadedMatchups: number
  deletedMatchups: number
}> {
  return prisma.$transaction(
    async (tx: TransactionClient) => {
      let totalUndone = 0
      let totalVotesCleared = 0
      let totalCascaded = 0
      let totalDeleted = 0

      // Fetch ALL matchups for the bracket (needed for cross-region cleanup)
      const allMatchups = await tx.matchup.findMany({
        where: { bracketId },
        select: {
          id: true,
          round: true,
          position: true,
          status: true,
          bracketRegion: true,
          entrant1Id: true,
          entrant2Id: true,
          winnerId: true,
          nextMatchupId: true,
        },
      })

      const wbMatchups = allMatchups.filter((m) => m.bracketRegion === 'winners')
      const lbMatchups = allMatchups.filter((m) => m.bracketRegion === 'losers')
      const gfMatchups = allMatchups
        .filter((m) => m.bracketRegion === 'grand_finals')
        .sort((a, b) => a.round - b.round)

      const wbMaxRound = wbMatchups.length > 0 ? Math.max(...wbMatchups.map((m) => m.round)) : 0
      const lbMaxRound = lbMatchups.length > 0 ? Math.max(...lbMatchups.map((m) => m.round)) : 0
      const losersRoundOffset = wbMaxRound

      // Helper: delete votes and clear a set of matchups
      async function clearMatchups(matchupIds: string[]) {
        if (matchupIds.length === 0) return 0
        await tx.vote.deleteMany({ where: { matchupId: { in: matchupIds } } })
        await tx.matchup.updateMany({
          where: { id: { in: matchupIds } },
          data: { winnerId: null, entrant1Id: null, entrant2Id: null, status: 'pending' },
        })
        return matchupIds.length
      }

      // Helper: delete votes and clear only winnerId/status (preserve entrants) for a set of matchups
      async function clearWinnersOnly(matchupIds: string[]) {
        if (matchupIds.length === 0) return 0
        await tx.vote.deleteMany({ where: { matchupId: { in: matchupIds } } })
        await tx.matchup.updateMany({
          where: { id: { in: matchupIds } },
          data: { winnerId: null, status: 'pending' },
        })
        return matchupIds.length
      }

      if (region === 'winners') {
        // --- Winners bracket undo ---

        // 1. Get WB matchups in target round with status 'decided'
        const targetMatchups = wbMatchups.filter(
          (m) => m.round === round && m.status === 'decided'
        )
        if (targetMatchups.length === 0) {
          return { undoneMatchups: 0, clearedVotes: 0, cascadedMatchups: 0, deletedMatchups: 0 }
        }

        const targetIds = targetMatchups.map((m) => m.id)

        // 2. Delete votes from target matchups
        const voteResult = await tx.vote.deleteMany({
          where: { matchupId: { in: targetIds } },
        })
        totalVotesCleared += voteResult.count

        // 3. Clear winnerId, set status to 'pending'
        await tx.matchup.updateMany({
          where: { id: { in: targetIds } },
          data: { winnerId: null, status: 'pending' },
        })
        totalUndone = targetMatchups.length

        // 4. Clear propagated entrants in next WB round (via nextMatchupId + getSlotForPosition)
        for (const matchup of targetMatchups) {
          if (matchup.nextMatchupId) {
            const slot = getSlotForPosition(matchup.position)
            await tx.matchup.update({
              where: { id: matchup.nextMatchupId },
              data: { [slot]: null },
            })
          }
        }

        // 5. Reverse loser placements in LB
        const wbEngineRound = round // WB has no offset
        const lbEngineRound = wbRoundToLbEngineRound(wbEngineRound)
        const lbDbRound = lbEngineRound + losersRoundOffset
        const lbTargetMatchups = lbMatchups.filter((m) => m.round === lbDbRound)

        if (wbEngineRound === 1) {
          // WB R1 losers fill both entrant1Id and entrant2Id on LB R1 matchups
          for (const lbm of lbTargetMatchups) {
            await tx.matchup.update({
              where: { id: lbm.id },
              data: { entrant1Id: null, entrant2Id: null },
            })
          }
        } else {
          // WB R(n>1) losers fill entrant2Id on LB major round matchups
          for (const lbm of lbTargetMatchups) {
            await tx.matchup.update({
              where: { id: lbm.id },
              data: { entrant2Id: null },
            })
          }
        }

        // 6. Check if undoing WB final: clear entrant2Id on LB final
        if (round === wbMaxRound) {
          const lbFinal = lbMatchups.find(
            (m) => m.round === lbMaxRound && m.position === 1
          )
          if (lbFinal) {
            await tx.matchup.update({
              where: { id: lbFinal.id },
              data: { entrant2Id: null },
            })
          }
        }

        // 7. Cascade: clear all LB matchups in rounds >= lbDbRound that were affected
        const lbCascadeMatchups = lbMatchups.filter((m) => m.round >= lbDbRound)
        const lbCascadeIds = lbCascadeMatchups.map((m) => m.id)
        totalCascaded += await clearMatchups(lbCascadeIds)

        // 7b. Clear all GF matchups. Delete GF reset matches (dynamically created).
        if (gfMatchups.length > 0) {
          const gfBaseRound = Math.min(...gfMatchups.map((m) => m.round))
          // Reset matches have no nextMatchupId and round > base GF round
          const resetMatchups = gfMatchups.filter(
            (m) => m.round > gfBaseRound
          )
          if (resetMatchups.length > 0) {
            const resetIds = resetMatchups.map((m) => m.id)
            await tx.vote.deleteMany({ where: { matchupId: { in: resetIds } } })
            await tx.matchup.deleteMany({ where: { id: { in: resetIds } } })
            totalDeleted += resetMatchups.length
          }

          // Clear GF match 1
          const gfMatch1Ids = gfMatchups
            .filter((m) => m.round === gfBaseRound)
            .map((m) => m.id)
          totalCascaded += await clearMatchups(gfMatch1Ids)
        }

        // 8. Cascade: clear all WB matchups in rounds > target round
        const wbCascadeMatchups = wbMatchups.filter((m) => m.round > round)
        if (wbCascadeMatchups.length > 0) {
          const wbCascadeIds = wbCascadeMatchups.map((m) => m.id)
          totalCascaded += await clearMatchups(wbCascadeIds)
        }
      } else if (region === 'losers') {
        // --- Losers bracket undo ---

        // 1. Get LB matchups in target round with status 'decided'
        const targetMatchups = lbMatchups.filter(
          (m) => m.round === round && m.status === 'decided'
        )
        if (targetMatchups.length === 0) {
          return { undoneMatchups: 0, clearedVotes: 0, cascadedMatchups: 0, deletedMatchups: 0 }
        }

        const targetIds = targetMatchups.map((m) => m.id)

        // 2. Delete votes, clear winnerId, set status to 'pending'
        const voteResult = await tx.vote.deleteMany({
          where: { matchupId: { in: targetIds } },
        })
        totalVotesCleared += voteResult.count

        await tx.matchup.updateMany({
          where: { id: { in: targetIds } },
          data: { winnerId: null, status: 'pending' },
        })
        totalUndone = targetMatchups.length

        // 3. Clear propagated entrants in next LB round via nextMatchupId
        for (const matchup of targetMatchups) {
          if (matchup.nextMatchupId) {
            // LB survivors go to entrant1Id in the next round
            // Use the same slot logic: minor->major = entrant1Id, major->minor = position-based
            const nextMatchup = allMatchups.find((m) => m.id === matchup.nextMatchupId)
            if (nextMatchup && nextMatchup.bracketRegion === 'grand_finals') {
              // LB final -> GF: clear entrant2Id
              await tx.matchup.update({
                where: { id: matchup.nextMatchupId },
                data: { entrant2Id: null },
              })
            } else {
              // Within LB: determine slot based on round count comparison
              const currentRoundCount = lbMatchups.filter((m) => m.round === matchup.round).length
              const nextRoundCount = nextMatchup
                ? lbMatchups.filter((m) => m.round === nextMatchup.round).length
                : 0

              if (currentRoundCount === nextRoundCount) {
                // 1-to-1 (minor->major): LB survivors go to entrant1Id
                await tx.matchup.update({
                  where: { id: matchup.nextMatchupId },
                  data: { entrant1Id: null },
                })
              } else {
                // 2-to-1 (major->minor): standard position-based slot
                const slot = getSlotForPosition(matchup.position)
                await tx.matchup.update({
                  where: { id: matchup.nextMatchupId },
                  data: { [slot]: null },
                })
              }
            }
          }
        }

        // 4. If undoing LB final: clear entrant2Id on GF matchup
        if (round === lbMaxRound) {
          for (const gfm of gfMatchups) {
            await tx.matchup.update({
              where: { id: gfm.id },
              data: { entrant2Id: null },
            })
          }
        }

        // 5. Cascade: clear all LB matchups in rounds > target round
        const lbCascadeMatchups = lbMatchups.filter((m) => m.round > round)
        if (lbCascadeMatchups.length > 0) {
          totalCascaded += await clearMatchups(lbCascadeMatchups.map((m) => m.id))
        }

        // 5b. Clear all GF matchups and delete any GF reset match
        if (gfMatchups.length > 0) {
          const gfBaseRound = Math.min(...gfMatchups.map((m) => m.round))
          const resetMatchups = gfMatchups.filter((m) => m.round > gfBaseRound)
          if (resetMatchups.length > 0) {
            const resetIds = resetMatchups.map((m) => m.id)
            await tx.vote.deleteMany({ where: { matchupId: { in: resetIds } } })
            await tx.matchup.deleteMany({ where: { id: { in: resetIds } } })
            totalDeleted += resetMatchups.length
          }

          const gfMatch1Ids = gfMatchups
            .filter((m) => m.round === gfBaseRound)
            .map((m) => m.id)
          totalCascaded += await clearMatchups(gfMatch1Ids)
        }
      } else if (region === 'grand_finals') {
        // --- Grand finals undo ---

        if (gfMatchups.length === 0) {
          return { undoneMatchups: 0, clearedVotes: 0, cascadedMatchups: 0, deletedMatchups: 0 }
        }

        const gfBaseRound = Math.min(...gfMatchups.map((m) => m.round))

        if (gfMatchups.length > 1) {
          // Multiple GF matchups exist (reset match was created)
          const gfHighestRound = Math.max(...gfMatchups.map((m) => m.round))

          if (round === gfHighestRound) {
            // Undoing the reset match: DELETE the reset matchup entirely
            const resetMatchups = gfMatchups.filter((m) => m.round === gfHighestRound)
            const resetIds = resetMatchups.map((m) => m.id)
            await tx.vote.deleteMany({ where: { matchupId: { in: resetIds } } })
            await tx.matchup.deleteMany({ where: { id: { in: resetIds } } })
            totalDeleted += resetMatchups.length
            totalUndone = resetMatchups.length
          } else {
            // Undoing GF match 1: clear winner, delete votes, set status to pending.
            // Also delete any existing reset match.
            const gfMatch1Ids = gfMatchups
              .filter((m) => m.round === gfBaseRound)
              .map((m) => m.id)
            const voteResult = await tx.vote.deleteMany({
              where: { matchupId: { in: gfMatch1Ids } },
            })
            totalVotesCleared += voteResult.count

            await tx.matchup.updateMany({
              where: { id: { in: gfMatch1Ids } },
              data: { winnerId: null, status: 'pending' },
            })
            totalUndone = gfMatch1Ids.length

            // Delete the reset match
            const resetMatchups = gfMatchups.filter((m) => m.round > gfBaseRound)
            if (resetMatchups.length > 0) {
              const resetIds = resetMatchups.map((m) => m.id)
              await tx.vote.deleteMany({ where: { matchupId: { in: resetIds } } })
              await tx.matchup.deleteMany({ where: { id: { in: resetIds } } })
              totalDeleted += resetMatchups.length
            }
          }
        } else {
          // Single GF matchup: clear winnerId, delete votes, set status to 'pending'
          const gfMatch = gfMatchups[0]
          const voteResult = await tx.vote.deleteMany({
            where: { matchupId: gfMatch.id },
          })
          totalVotesCleared += voteResult.count

          await tx.matchup.update({
            where: { id: gfMatch.id },
            data: { winnerId: null, status: 'pending' },
          })
          totalUndone = 1
        }
      }

      return {
        undoneMatchups: totalUndone,
        clearedVotes: totalVotesCleared,
        cascadedMatchups: totalCascaded,
        deletedMatchups: totalDeleted,
      }
    },
    { timeout: 30000 }
  )
}

/**
 * Undo a round of predictive bracket advancement.
 *
 * Clears matchup winners and downstream propagation without deleting student
 * predictions (predictions are preserved per CONTEXT.md locked decision).
 *
 * For vote_based resolution mode, votes are also deleted. For manual/auto
 * modes, there are no votes to delete.
 *
 * If the bracket is in 'revealing' state and revealedUpToRound >= the target
 * round, revealedUpToRound is adjusted. If predictionStatus is 'completed',
 * it is set back to 'revealing'.
 *
 * All mutations are atomic within a single Prisma $transaction.
 */
export async function undoRoundPredictive(
  bracketId: string,
  round: number
): Promise<{ undoneMatchups: number; clearedVotes: number; cascadedMatchups: number }> {
  return prisma.$transaction(
    async (tx: TransactionClient) => {
      // Fetch bracket info for resolution mode and prediction status
      const bracket = await tx.bracket.findUnique({
        where: { id: bracketId },
        select: {
          predictiveResolutionMode: true,
          predictionStatus: true,
          revealedUpToRound: true,
        },
      })

      if (!bracket) {
        throw new Error('Bracket not found')
      }

      const isVoteBased = bracket.predictiveResolutionMode === 'vote_based'

      // 1. Get non-bye matchups in the target round with status 'decided'
      const roundMatchups = await tx.matchup.findMany({
        where: {
          bracketId,
          round,
          status: 'decided',
          isBye: false,
        },
      })

      if (roundMatchups.length === 0) {
        return { undoneMatchups: 0, clearedVotes: 0, cascadedMatchups: 0 }
      }

      const roundMatchupIds = roundMatchups.map((m) => m.id)
      let totalVotesCleared = 0

      // 2. Clear winnerId and set status to 'pending' on target round matchups
      await tx.matchup.updateMany({
        where: { id: { in: roundMatchupIds } },
        data: { winnerId: null, status: 'pending' },
      })

      // 3. IMPORTANT: Do NOT delete from the predictions table

      // 4. For vote_based mode, delete votes from target round
      if (isVoteBased) {
        const voteResult = await tx.vote.deleteMany({
          where: { matchupId: { in: roundMatchupIds } },
        })
        totalVotesCleared += voteResult.count
      }

      // 5. Clear propagated entrants in next round (same as SE: nextMatchupId + getSlotForPosition)
      for (const matchup of roundMatchups) {
        if (matchup.nextMatchupId) {
          const slot = getSlotForPosition(matchup.position)
          await tx.matchup.update({
            where: { id: matchup.nextMatchupId },
            data: { [slot]: null },
          })
        }
      }

      // 6. Cascade to downstream rounds: clear winnerId, entrant1Id, entrant2Id,
      //    set status to 'pending' for all non-bye matchups in rounds > target round
      const downstreamMatchups = await tx.matchup.findMany({
        where: { bracketId, round: { gt: round }, isBye: false },
      })

      let cascadedMatchups = 0
      if (downstreamMatchups.length > 0) {
        const downstreamIds = downstreamMatchups.map((m) => m.id)

        // Delete votes from downstream matchups (if vote_based)
        if (isVoteBased) {
          const downstreamVotes = await tx.vote.deleteMany({
            where: { matchupId: { in: downstreamIds } },
          })
          totalVotesCleared += downstreamVotes.count
        }

        // Clear winners, entrants, and reset status on downstream matchups
        await tx.matchup.updateMany({
          where: { id: { in: downstreamIds } },
          data: {
            winnerId: null,
            entrant1Id: null,
            entrant2Id: null,
            status: 'pending',
          },
        })

        cascadedMatchups = downstreamMatchups.length
      }

      // 7. Adjust bracket prediction status / revealedUpToRound
      const updateData: Record<string, unknown> = {}

      if (bracket.predictionStatus === 'completed') {
        // Bracket was completed, set back to 'revealing'
        updateData.predictionStatus = 'revealing'
        updateData.status = 'active' // un-complete the bracket
      }

      if (
        bracket.revealedUpToRound != null &&
        bracket.revealedUpToRound >= round
      ) {
        // Adjust revealedUpToRound to one below the target round
        updateData.revealedUpToRound = round === 1 ? null : round - 1
      }

      if (Object.keys(updateData).length > 0) {
        await tx.bracket.update({
          where: { id: bracketId },
          data: updateData,
        })
      }

      return {
        undoneMatchups: roundMatchups.length,
        clearedVotes: totalVotesCleared,
        cascadedMatchups,
      }
    },
    { timeout: 30000 }
  )
}
