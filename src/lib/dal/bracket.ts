import { prisma } from '@/lib/prisma'
import { generateMatchups } from '@/lib/bracket/engine'
import {
  generateMatchupsWithByes,
  calculateBracketSizeWithByes,
} from '@/lib/bracket/byes'
import {
  generateDoubleElimMatchups,
  generatePlayInRound,
  findR1PositionForSeed,
} from '@/lib/bracket/double-elim'
import { createRoundRobinBracketDAL } from '@/lib/dal/round-robin'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import type { MatchupSeed, MatchupSeedWithBye, BracketRegion } from '@/lib/bracket/types'

/**
 * Check whether a number is a power of two using bitwise AND.
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

/**
 * Determine which slot a matchup feeds into in the next round.
 * Odd positions (1, 3, 5...) -> entrant1Id, even positions (2, 4, 6...) -> entrant2Id.
 * Mirrors the logic in advancement.ts getSlotForPosition.
 */
function getSlotForPosition(position: number): 'entrant1Id' | 'entrant2Id' {
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
}

/**
 * Helper: Create matchup records and wire nextMatchupId within a transaction.
 *
 * 1. Creates all matchup records WITHOUT nextMatchupId.
 * 2. Builds a round-position -> matchupId lookup map.
 * 3. Updates each matchup's nextMatchupId via the map.
 * 4. Auto-advances bye matchups (sets winnerId + status, propagates to next round).
 *
 * Accepts both MatchupSeed and MatchupSeedWithBye -- isBye defaults to false.
 *
 * @param extraFields - Optional fields applied to every matchup in this batch
 *   (e.g., bracketRegion). Per-seed overrides from MatchupSeedWithBye take precedence.
 * @param roundOffset - Optional offset added to each matchup's round number before
 *   persisting. Used to avoid unique constraint collisions when storing multiple
 *   bracket regions (winners, losers, grand_finals) under the same bracketId.
 *   The nextMatchupPosition round references are also offset.
 */
async function createMatchupsInTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  bracketId: string,
  matchupSeeds: (MatchupSeed | MatchupSeedWithBye)[],
  entrantIdBySeed: Map<number, string>,
  extraFields?: Record<string, unknown>,
  roundOffset?: number
) {
  const offset = roundOffset ?? 0

  // Step 1: Create all matchup records (no nextMatchupId yet)
  const createdMatchups: { id: string; round: number; position: number }[] = []

  for (const seed of matchupSeeds) {
    const isBye = ('isBye' in seed && seed.isBye) ?? false
    const bracketRegion = ('bracketRegion' in seed && seed.bracketRegion)
      ? seed.bracketRegion
      : (extraFields?.bracketRegion ?? null)
    const matchup = await tx.matchup.create({
      data: {
        bracketId,
        round: seed.round + offset,
        position: seed.position,
        isBye,
        bracketRegion: bracketRegion as string | null,
        entrant1Id: seed.entrant1Seed
          ? (entrantIdBySeed.get(seed.entrant1Seed) ?? null)
          : null,
        entrant2Id: seed.entrant2Seed
          ? (entrantIdBySeed.get(seed.entrant2Seed) ?? null)
          : null,
      },
      select: { id: true, round: true, position: true },
    })
    createdMatchups.push(matchup)
  }

  // Step 2: Build lookup map: "${round}-${position}" -> matchupId
  // Round values in the map are already offset (from DB)
  const matchupMap = new Map<string, string>()
  for (const m of createdMatchups) {
    matchupMap.set(`${m.round}-${m.position}`, m.id)
  }

  // Step 3: Wire nextMatchupId for each matchup that has a nextMatchupPosition
  for (let i = 0; i < matchupSeeds.length; i++) {
    const seed = matchupSeeds[i]
    if (seed.nextMatchupPosition) {
      const nextRound = seed.nextMatchupPosition.round + offset
      const nextId = matchupMap.get(
        `${nextRound}-${seed.nextMatchupPosition.position}`
      )
      if (nextId) {
        await tx.matchup.update({
          where: { id: createdMatchups[i].id },
          data: { nextMatchupId: nextId },
        })
      }
    }
  }

  // Step 4: Auto-advance bye matchups
  // Find bye matchups where one entrant is present and the other is null
  for (let i = 0; i < matchupSeeds.length; i++) {
    const seed = matchupSeeds[i]
    const isBye = ('isBye' in seed && seed.isBye) ?? false
    if (!isBye) continue

    // Re-fetch the matchup to get entrant IDs and nextMatchupId
    const byeMatchup = await tx.matchup.findUnique({
      where: { id: createdMatchups[i].id },
      select: {
        id: true,
        entrant1Id: true,
        entrant2Id: true,
        nextMatchupId: true,
        position: true,
      },
    })
    if (!byeMatchup) continue

    // The present entrant is the winner (the other slot is null)
    const winnerId = byeMatchup.entrant1Id ?? byeMatchup.entrant2Id
    if (!winnerId) continue

    // Set winner and status to decided
    await tx.matchup.update({
      where: { id: byeMatchup.id },
      data: { winnerId, status: 'decided' },
    })

    // Propagate winner to next matchup
    if (byeMatchup.nextMatchupId) {
      const slot = getSlotForPosition(byeMatchup.position)
      await tx.matchup.update({
        where: { id: byeMatchup.nextMatchupId },
        data: { [slot]: winnerId },
      })
    }
  }

  return createdMatchups
}

/**
 * Get bracket counts for a teacher, grouped by status.
 * Returns { live, draft, total } for feature gate checks.
 */
export async function getTeacherBracketCounts(teacherId: string): Promise<{
  live: number
  draft: number
  total: number
}> {
  const [live, draft, total] = await Promise.all([
    prisma.bracket.count({ where: { teacherId, status: 'active' } }),
    prisma.bracket.count({ where: { teacherId, status: 'draft' } }),
    prisma.bracket.count({ where: { teacherId } }),
  ])

  return { live, draft, total }
}

/**
 * Create a new bracket with entrants and generated matchup structure.
 *
 * Uses the bracket engine to generate matchup seeds, then persists
 * the full bracket structure in a single transaction.
 */
export async function createBracketDAL(
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
    viewingMode?: string
    showSeedNumbers?: boolean
  },
  entrants: { name: string; seedPosition: number; logoUrl?: string | null }[]
) {
  // Validate entrants count matches bracket size (actual entrants, not bracket size including byes)
  if (entrants.length !== data.size) {
    return {
      error: `Expected ${data.size} entrants, got ${entrants.length}`,
    }
  }

  // Route round-robin brackets to their dedicated DAL
  if (data.bracketType === 'round_robin') {
    return createRoundRobinBracketDAL(teacherId, data, entrants)
  }

  // Route double-elimination brackets to dedicated creation logic
  if (data.bracketType === 'double_elimination') {
    return createDoubleElimBracketDAL(teacherId, data, entrants)
  }

  // Determine if byes are needed and generate appropriate matchup structure
  const needsByes = !isPowerOfTwo(data.size)
  let matchupSeeds: (MatchupSeed | MatchupSeedWithBye)[]
  let effectiveBracketSize: number | null = null

  if (needsByes) {
    const { bracketSize } = calculateBracketSizeWithByes(data.size)
    effectiveBracketSize = bracketSize
    matchupSeeds = generateMatchupsWithByes(data.size)
  } else {
    matchupSeeds = generateMatchups(data.size)
  }

  const bracket = await prisma.$transaction(async (tx) => {
    // 1. Create the bracket record
    // size = actual entrant count; maxEntrants = full bracket size (for diagram layout)
    const created = await tx.bracket.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        size: data.size,
        maxEntrants: effectiveBracketSize,
        status: 'draft',
        teacherId,
        sessionId: data.sessionId ?? null,
        bracketType: data.bracketType ?? 'single_elimination',
        roundRobinPacing: data.roundRobinPacing ?? null,
        roundRobinVotingStyle: data.roundRobinVotingStyle ?? null,
        roundRobinStandingsMode: data.roundRobinStandingsMode ?? null,
        predictiveMode: data.predictiveMode ?? null,
        predictiveResolutionMode: data.predictiveResolutionMode ?? null,
        playInEnabled: data.playInEnabled ?? false,
        viewingMode: data.viewingMode ?? 'advanced',
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
          logoUrl: entrant.logoUrl ?? null,
        },
      })
      entrantIdBySeed.set(entrant.seedPosition, record.id)
    }

    // 3. Create matchups and wire nextMatchupId
    await createMatchupsInTransaction(
      tx,
      created.id,
      matchupSeeds,
      entrantIdBySeed
    )

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
 * Create a double-elimination bracket with winners, losers, and grand finals regions.
 *
 * Structure:
 * - Winners bracket: standard single-elim structure (with byes if non-power-of-two)
 * - Losers bracket: alternating minor/major rounds (all entrant slots null, filled during advancement)
 * - Grand finals: single matchup (both slots null, filled by WB and LB champions)
 *
 * Round numbering uses offsets to avoid unique constraint collisions:
 * - Winners: rounds 1..wbRounds (no offset)
 * - Losers: rounds (wbRounds+1)..(wbRounds+lbRounds) (offset by wbRounds)
 * - Grand finals: round (wbRounds+lbRounds+1) (offset by wbRounds+lbRounds)
 *
 * Play-in support (playInEnabled=true):
 * - Adds round 0 matchups for lowest seeds that wire into WB R1
 * - Play-in matchups have real entrants (not auto-advanced)
 */
async function createDoubleElimBracketDAL(
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
  entrants: { name: string; seedPosition: number; logoUrl?: string | null }[]
) {
  // Determine effective WB size (next power of 2 for byes)
  const needsByes = !isPowerOfTwo(data.size)
  const mainBracketSize = needsByes
    ? Math.pow(2, Math.ceil(Math.log2(data.size)))
    : data.size

  // Generate the three bracket regions
  const { winners, losers, grandFinals } = generateDoubleElimMatchups(mainBracketSize)

  // Generate bye-aware WB matchups if needed (replaces plain winners with bye-marked versions)
  let wbSeeds: (MatchupSeed | MatchupSeedWithBye)[]
  if (needsByes) {
    wbSeeds = generateMatchupsWithByes(data.size)
  } else {
    wbSeeds = winners
  }

  // Calculate round offsets for unique constraint compliance
  const wbRounds = Math.log2(mainBracketSize) // e.g., 3 for 8-team
  const lbRounds = losers.length > 0
    ? Math.max(...losers.map((m) => m.round))
    : 0
  const losersRoundOffset = wbRounds
  const gfRoundOffset = wbRounds + lbRounds

  // Handle play-in
  const playInEnabled = data.playInEnabled ?? false
  const playInCount = playInEnabled ? 8 : 0 // 8 extra entrants = 4 play-in matches
  const actualEntrantCount = playInEnabled ? data.size : data.size

  const bracket = await prisma.$transaction(async (tx) => {
    // 1. Create the bracket record
    const created = await tx.bracket.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        size: actualEntrantCount,
        maxEntrants: mainBracketSize,
        status: 'draft',
        teacherId,
        sessionId: data.sessionId ?? null,
        bracketType: 'double_elimination',
        playInEnabled,
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
          logoUrl: entrant.logoUrl ?? null,
        },
      })
      entrantIdBySeed.set(entrant.seedPosition, record.id)
    }

    // 3a. Create winners bracket matchups (round offset = 0)
    const wbMatchups = await createMatchupsInTransaction(
      tx,
      created.id,
      wbSeeds,
      entrantIdBySeed,
      { bracketRegion: 'winners' as BracketRegion },
      0
    )

    // 3b. Create losers bracket matchups (all entrants null, offset by wbRounds)
    const emptyEntrantMap = new Map<number, string>()
    const lbMatchups = await createMatchupsInTransaction(
      tx,
      created.id,
      losers,
      emptyEntrantMap,
      { bracketRegion: 'losers' as BracketRegion },
      losersRoundOffset
    )

    // 3c. Create grand finals matchup (offset by wbRounds + lbRounds)
    const gfMatchups = await createMatchupsInTransaction(
      tx,
      created.id,
      grandFinals,
      emptyEntrantMap,
      { bracketRegion: 'grand_finals' as BracketRegion },
      gfRoundOffset
    )

    // 3d. Wire LB final to grand finals
    // The LB final is the last losers bracket matchup (null nextMatchupPosition)
    // Find LB matchup with highest round and position 1
    if (lbMatchups.length > 0 && gfMatchups.length > 0) {
      const lbFinalDbRound = lbRounds + losersRoundOffset
      const lbFinal = lbMatchups.find(
        (m) => m.round === lbFinalDbRound && m.position === 1
      )
      if (lbFinal) {
        await tx.matchup.update({
          where: { id: lbFinal.id },
          data: { nextMatchupId: gfMatchups[0].id },
        })
      }
    }

    // 3e. Wire WB final to grand finals
    // The WB final is the last winners bracket matchup (highest round, position 1)
    if (wbMatchups.length > 0 && gfMatchups.length > 0) {
      const wbFinalDbRound = wbRounds
      const wbFinal = wbMatchups.find(
        (m) => m.round === wbFinalDbRound && m.position === 1
      )
      if (wbFinal) {
        await tx.matchup.update({
          where: { id: wbFinal.id },
          data: { nextMatchupId: gfMatchups[0].id },
        })
      }
    }

    // 3f. Handle play-in rounds if enabled
    if (playInEnabled && playInCount > 0) {
      const { playInMatchups, mainBracketSlotsToFill } = generatePlayInRound(
        mainBracketSize,
        playInCount
      )

      // Create play-in matchups at round 0 (no offset needed, round 0 is unique)
      const playInCreated = await createMatchupsInTransaction(
        tx,
        created.id,
        playInMatchups,
        entrantIdBySeed,
        { bracketRegion: 'winners' as BracketRegion },
        0 // round 0 doesn't collide with WB rounds which start at 1
      )

      // Wire each play-in matchup to the correct WB R1 matchup
      for (let i = 0; i < mainBracketSlotsToFill.length; i++) {
        const { mainBracketSeed } = mainBracketSlotsToFill[i]
        const r1Info = findR1PositionForSeed(mainBracketSeed, mainBracketSize)
        if (!r1Info) continue

        // Find the WB R1 matchup at this position (round 1, position = r1Info.position)
        const targetWbMatchup = wbMatchups.find(
          (m) => m.round === 1 && m.position === r1Info.position
        )
        if (!targetWbMatchup) continue

        // Wire the play-in matchup to the WB R1 matchup
        await tx.matchup.update({
          where: { id: playInCreated[i].id },
          data: { nextMatchupId: targetWbMatchup.id },
        })

        // Clear the entrant slot that the play-in winner will fill
        const slotToClear = r1Info.slot === 1 ? 'entrant1Id' : 'entrant2Id'
        await tx.matchup.update({
          where: { id: targetWbMatchup.id },
          data: { [slotToClear]: null },
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
 * Get a bracket with all its entrants and matchups.
 * Ownership enforced: only returns if the bracket belongs to the teacher.
 */
export async function getBracketWithDetails(
  bracketId: string,
  teacherId: string
) {
  return prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
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
 * Get all brackets for a teacher, ordered by most recent first.
 * Includes entrant count for list/card display.
 */
export async function getTeacherBrackets(teacherId: string) {
  return prisma.bracket.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { entrants: true } },
      session: { select: { id: true, code: true, status: true } },
    },
  })
}

// Valid forward-only status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'completed'],
  active: ['completed'],
  completed: [],
}

/**
 * Update a bracket's status with forward-only transition validation.
 * Ownership enforced via teacherId filter.
 *
 * Allowed transitions:
 * - draft -> active (requires entrants.length === size)
 * - draft -> completed
 * - active -> completed
 */
export async function updateBracketStatusDAL(
  bracketId: string,
  teacherId: string,
  status: string
) {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    include: { _count: { select: { entrants: true } } },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  const allowed = VALID_TRANSITIONS[bracket.status] ?? []
  if (!allowed.includes(status)) {
    return {
      error: `Cannot transition from '${bracket.status}' to '${status}'`,
    }
  }

  // Additional validation: activating requires full entrant roster
  if (bracket.status === 'draft' && status === 'active') {
    if (bracket._count.entrants !== bracket.size) {
      return {
        error: `Bracket must have ${bracket.size} entrants to activate (has ${bracket._count.entrants})`,
      }
    }
  }

  const updated = await prisma.bracket.update({
    where: { id: bracketId },
    data: { status },
  })

  // Auto-open round 1 for round-robin brackets on activation
  if (bracket.status === 'draft' && status === 'active' && updated.bracketType === 'round_robin') {
    await prisma.matchup.updateMany({
      where: {
        bracketId: bracket.id,
        roundRobinRound: 1,
        status: 'pending',
      },
      data: { status: 'voting' },
    })

    // Broadcast round_advanced event so students get the update
    broadcastBracketUpdate(bracketId, 'round_advanced', { round: 1 }).catch(console.error)
  }

  return updated
}

/**
 * Replace all entrants in a draft bracket and regenerate matchups.
 * Ownership enforced via teacherId filter.
 *
 * Guards:
 * - Bracket must be in 'draft' status
 * - Entrant count must match bracket size
 */
export async function updateBracketEntrantsDAL(
  bracketId: string,
  teacherId: string,
  entrants: { name: string; seedPosition: number; logoUrl?: string | null }[]
) {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.status !== 'draft') {
    return { error: 'Cannot edit entrants of non-draft bracket' }
  }

  if (entrants.length !== bracket.size) {
    return {
      error: `Expected ${bracket.size} entrants, got ${entrants.length}`,
    }
  }

  // Determine if byes are needed and generate appropriate matchup structure
  const needsByes = !isPowerOfTwo(bracket.size)
  let matchupSeeds: (MatchupSeed | MatchupSeedWithBye)[]
  let effectiveBracketSize: number | null = null

  if (needsByes) {
    const { bracketSize } = calculateBracketSizeWithByes(bracket.size)
    effectiveBracketSize = bracketSize
    matchupSeeds = generateMatchupsWithByes(bracket.size)
  } else {
    matchupSeeds = generateMatchups(bracket.size)
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete existing matchups (must delete before entrants due to FK)
    await tx.matchup.deleteMany({ where: { bracketId } })

    // 2. Delete existing entrants
    await tx.bracketEntrant.deleteMany({ where: { bracketId } })

    // 2b. Update maxEntrants if byes needed
    if (effectiveBracketSize !== null) {
      await tx.bracket.update({
        where: { id: bracketId },
        data: { maxEntrants: effectiveBracketSize },
      })
    }

    // 3. Create new entrants and build seed -> id map
    const entrantIdBySeed = new Map<number, string>()
    for (const entrant of entrants) {
      const record = await tx.bracketEntrant.create({
        data: {
          name: entrant.name,
          seedPosition: entrant.seedPosition,
          bracketId,
          logoUrl: entrant.logoUrl ?? null,
        },
      })
      entrantIdBySeed.set(entrant.seedPosition, record.id)
    }

    // 4. Create new matchups, wire nextMatchupId, and auto-advance byes
    await createMatchupsInTransaction(tx, bracketId, matchupSeeds, entrantIdBySeed)
  })

  // Return updated bracket with new relations
  return prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
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
 * Delete a bracket and all related entrants and matchups (cascade).
 * Ownership enforced via teacherId filter.
 */
export async function deleteBracketDAL(
  bracketId: string,
  teacherId: string
) {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  await prisma.bracket.delete({ where: { id: bracketId } })

  return { success: true }
}
