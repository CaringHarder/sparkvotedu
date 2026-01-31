import { prisma } from '@/lib/prisma'

/**
 * Cast or update a vote for a participant on a matchup.
 *
 * Uses upsert with the compound unique constraint (matchupId_participantId)
 * for race-safe idempotent vote creation/update. If the participant has
 * already voted on this matchup, their vote is updated to the new entrant.
 *
 * No auth checks -- enforced in server actions.
 */
export async function castVoteDAL(
  matchupId: string,
  participantId: string,
  entrantId: string
) {
  return prisma.vote.upsert({
    where: {
      matchupId_participantId: { matchupId, participantId },
    },
    create: {
      matchupId,
      participantId,
      entrantId,
    },
    update: {
      entrantId,
    },
  })
}

/**
 * Get vote counts per entrant for a matchup.
 *
 * Returns a Record<string, number> mapping entrantId -> vote count.
 * Uses groupBy for efficient aggregation at the database level.
 */
export async function getVoteCountsForMatchup(
  matchupId: string
): Promise<Record<string, number>> {
  const groups = await prisma.vote.groupBy({
    by: ['entrantId'],
    where: { matchupId },
    _count: { id: true },
  })

  return groups.reduce<Record<string, number>>((acc, group) => {
    acc[group.entrantId] = group._count.id
    return acc
  }, {})
}

/**
 * Check if a participant has voted on a matchup.
 *
 * Returns the vote record (with entrantId) if voted, null otherwise.
 * Useful for showing the participant's current selection in the UI.
 */
export async function hasVoted(
  matchupId: string,
  participantId: string
) {
  return prisma.vote.findUnique({
    where: {
      matchupId_participantId: { matchupId, participantId },
    },
    select: { entrantId: true },
  })
}

/**
 * Get a complete vote summary for a matchup.
 *
 * Fetches total vote count and per-entrant counts in parallel.
 * Returns { totalVotes, voteCounts } for UI consumption.
 */
export async function getMatchupVoteSummary(matchupId: string) {
  const [totalVotes, voteCounts] = await Promise.all([
    prisma.vote.count({ where: { matchupId } }),
    getVoteCountsForMatchup(matchupId),
  ])

  return { totalVotes, voteCounts }
}

/**
 * Get all participant IDs who have voted on a matchup.
 *
 * Used for participation grid display -- shows which students
 * have voted without revealing their choices.
 */
export async function getVoterParticipantIds(
  matchupId: string
): Promise<string[]> {
  const votes = await prisma.vote.findMany({
    where: { matchupId },
    select: { participantId: true },
  })

  return votes.map((v) => v.participantId)
}

/**
 * Get the current status and winner of a matchup.
 *
 * Returns { status, winnerId } for matchup lifecycle management.
 */
export async function getMatchupStatus(matchupId: string) {
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    select: { status: true, winnerId: true },
  })

  if (!matchup) {
    return null
  }

  return { status: matchup.status, winnerId: matchup.winnerId }
}

// Valid forward-only matchup status transitions
const VALID_MATCHUP_TRANSITIONS: Record<string, string[]> = {
  pending: ['voting'],
  voting: ['decided'],
  decided: [],
}

/**
 * Update a matchup's status with forward-only transition validation.
 *
 * Allowed transitions:
 * - pending -> voting (open for voting)
 * - voting -> decided (winner selected)
 *
 * Returns updated matchup or error.
 */
export async function updateMatchupStatus(
  matchupId: string,
  status: string
) {
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    select: { status: true },
  })

  if (!matchup) {
    return { error: 'Matchup not found' }
  }

  const allowed = VALID_MATCHUP_TRANSITIONS[matchup.status] ?? []
  if (!allowed.includes(status)) {
    return {
      error: `Cannot transition matchup from '${matchup.status}' to '${status}'`,
    }
  }

  return prisma.matchup.update({
    where: { id: matchupId },
    data: { status },
  })
}

/**
 * Batch open multiple matchups for voting within a transaction.
 *
 * Only updates matchups currently in "pending" status.
 * Returns the count of matchups opened.
 */
export async function openMatchupsForVoting(
  matchupIds: string[]
): Promise<{ opened: number }> {
  const result = await prisma.matchup.updateMany({
    where: {
      id: { in: matchupIds },
      status: 'pending',
    },
    data: { status: 'voting' },
  })

  return { opened: result.count }
}
