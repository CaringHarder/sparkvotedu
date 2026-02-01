import { prisma } from '@/lib/prisma'
import { generateMatchups } from '@/lib/bracket/engine'
import type { MatchupSeed } from '@/lib/bracket/types'

/**
 * Helper: Create matchup records and wire nextMatchupId within a transaction.
 *
 * 1. Creates all matchup records WITHOUT nextMatchupId.
 * 2. Builds a round-position -> matchupId lookup map.
 * 3. Updates each matchup's nextMatchupId via the map.
 */
async function createMatchupsInTransaction(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  bracketId: string,
  matchupSeeds: MatchupSeed[],
  entrantIdBySeed: Map<number, string>
) {
  // Step 1: Create all matchup records (no nextMatchupId yet)
  const createdMatchups: { id: string; round: number; position: number }[] = []

  for (const seed of matchupSeeds) {
    const matchup = await tx.matchup.create({
      data: {
        bracketId,
        round: seed.round,
        position: seed.position,
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
  const matchupMap = new Map<string, string>()
  for (const m of createdMatchups) {
    matchupMap.set(`${m.round}-${m.position}`, m.id)
  }

  // Step 3: Wire nextMatchupId for each matchup that has a nextMatchupPosition
  for (let i = 0; i < matchupSeeds.length; i++) {
    const seed = matchupSeeds[i]
    if (seed.nextMatchupPosition) {
      const nextId = matchupMap.get(
        `${seed.nextMatchupPosition.round}-${seed.nextMatchupPosition.position}`
      )
      if (nextId) {
        await tx.matchup.update({
          where: { id: createdMatchups[i].id },
          data: { nextMatchupId: nextId },
        })
      }
    }
  }
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
  },
  entrants: { name: string; seedPosition: number }[]
) {
  // Validate entrants count matches bracket size
  if (entrants.length !== data.size) {
    return {
      error: `Expected ${data.size} entrants, got ${entrants.length}`,
    }
  }

  // Generate matchup structure from engine
  const matchupSeeds = generateMatchups(data.size)

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

    // 3. Create matchups and wire nextMatchupId
    await createMatchupsInTransaction(
      tx,
      created.id,
      matchupSeeds,
      entrantIdBySeed
    )

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

  return prisma.bracket.update({
    where: { id: bracketId },
    data: { status },
  })
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
  entrants: { name: string; seedPosition: number }[]
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

  // Generate new matchup structure
  const matchupSeeds = generateMatchups(bracket.size)

  await prisma.$transaction(async (tx) => {
    // 1. Delete existing matchups (must delete before entrants due to FK)
    await tx.matchup.deleteMany({ where: { bracketId } })

    // 2. Delete existing entrants
    await tx.bracketEntrant.deleteMany({ where: { bracketId } })

    // 3. Create new entrants and build seed -> id map
    const entrantIdBySeed = new Map<number, string>()
    for (const entrant of entrants) {
      const record = await tx.bracketEntrant.create({
        data: {
          name: entrant.name,
          seedPosition: entrant.seedPosition,
          bracketId,
        },
      })
      entrantIdBySeed.set(entrant.seedPosition, record.id)
    }

    // 4. Create new matchups and wire nextMatchupId
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
