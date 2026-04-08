import { prisma } from '@/lib/prisma'

// Valid forward-only poll status transitions
const VALID_POLL_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'closed', 'archived'],
  paused: ['active', 'closed', 'archived'],
  closed: ['archived', 'draft'],
  archived: [],
}

/**
 * Get total poll count for a teacher.
 * Used for feature gate checks.
 */
export async function getTeacherPollCount(teacherId: string): Promise<number> {
  return prisma.poll.count({ where: { teacherId } })
}

/**
 * Create a new poll with options in a single transaction.
 * Follows createBracketDAL pattern: transaction for poll + options.
 */
export async function createPollDAL(
  teacherId: string,
  data: {
    question: string
    description?: string
    pollType: string
    allowVoteChange?: boolean
    showLiveResults?: boolean
    rankingDepth?: number | null
    sessionId?: string
  },
  options: { text: string; imageUrl?: string | null; position: number }[]
) {
  return prisma.$transaction(async (tx) => {
    const poll = await tx.poll.create({
      data: {
        question: data.question,
        description: data.description ?? null,
        pollType: data.pollType,
        allowVoteChange: data.allowVoteChange ?? true,
        showLiveResults: data.showLiveResults ?? false,
        rankingDepth: data.rankingDepth ?? null,
        status: 'draft',
        teacherId,
        ...(data.sessionId ? { sessionId: data.sessionId } : {}),
      },
    })

    for (const option of options) {
      await tx.pollOption.create({
        data: {
          text: option.text,
          imageUrl: option.imageUrl ?? null,
          position: option.position,
          pollId: poll.id,
        },
      })
    }

    // Return poll with options
    return tx.poll.findUniqueOrThrow({
      where: { id: poll.id },
      include: { options: { orderBy: { position: 'asc' } } },
    })
  })
}

/**
 * Get a poll by ID with its options.
 * Returns null if not found.
 */
export async function getPollByIdDAL(pollId: string) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: { position: 'asc' } } },
  })
}

/**
 * Get all polls for a teacher, ordered by most recent first.
 * Optional status filter array. Includes vote count.
 */
export async function getPollsByTeacherDAL(
  teacherId: string,
  statusFilter?: string[]
) {
  return prisma.poll.findMany({
    where: {
      teacherId,
      ...(statusFilter && statusFilter.length > 0
        ? { status: { in: statusFilter } }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      options: { orderBy: { position: 'asc' } },
      _count: { select: { votes: true } },
      session: { select: { id: true, code: true, name: true } },
    },
  })
}

/**
 * Get polls for a session (active + closed).
 * Includes options and vote counts.
 */
export async function getPollsBySessionDAL(sessionId: string) {
  return prisma.poll.findMany({
    where: {
      sessionId,
      status: { in: ['active', 'closed'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      options: { orderBy: { position: 'asc' } },
      _count: { select: { votes: true } },
    },
  })
}

/**
 * Update poll fields. Verifies teacher ownership.
 * Returns updated poll or null if not found/not owned.
 */
export async function updatePollDAL(
  pollId: string,
  teacherId: string,
  data: {
    question?: string
    description?: string | null
    pollType?: string
    allowVoteChange?: boolean
    showLiveResults?: boolean
    rankingDepth?: number | null
  }
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return null
  }

  return prisma.poll.update({
    where: { id: pollId },
    data,
    include: { options: { orderBy: { position: 'asc' } } },
  })
}

/**
 * Update poll options (text, imageUrl, position) in bulk.
 * Verifies teacher ownership. Uses a transaction to update each option.
 * Only updates options that belong to the poll.
 * Returns updated poll with options or null if not found/not owned.
 */
export async function updatePollOptionsDAL(
  pollId: string,
  teacherId: string,
  options: { id: string; text: string; imageUrl?: string | null; position: number }[]
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return null
  }

  // Collect IDs of options that should remain
  const optionIds = options.map((o) => o.id)

  return prisma.$transaction(async (tx) => {
    // Delete options no longer in the provided list FIRST
    // (before position updates to avoid @@unique([pollId, position]) violations)
    if (optionIds.length > 0) {
      await tx.pollOption.deleteMany({
        where: {
          pollId,
          id: { notIn: optionIds },
        },
      })
    }

    // Update remaining options
    for (const option of options) {
      await tx.pollOption.updateMany({
        where: { id: option.id, pollId },
        data: {
          text: option.text,
          imageUrl: option.imageUrl ?? null,
          position: option.position,
        },
      })
    }

    return tx.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: { options: { orderBy: { position: 'asc' } } },
    })
  })
}

/**
 * Delete a poll. Verifies teacher ownership.
 * Cascade handles options and votes.
 * Returns true if deleted, false if not found/not owned.
 */
export async function deletePollDAL(
  pollId: string,
  teacherId: string
): Promise<boolean> {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return false
  }

  await prisma.poll.delete({ where: { id: pollId } })
  return true
}

/**
 * Rename a poll (update the question field).
 * Ownership enforced via teacherId filter.
 * Returns updated poll or error.
 */
export async function renamePollDAL(
  pollId: string,
  teacherId: string,
  question: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return { error: 'Poll not found' }
  }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { question },
  })

  return updated
}

/**
 * Update poll status with forward-only transition validation.
 * Verifies teacher ownership.
 *
 * Valid transitions:
 * - draft -> active
 * - active -> closed
 * - closed -> archived
 * - closed -> draft (reopen)
 *
 * Returns updated poll or throws error for invalid transition.
 */
export async function updatePollStatusDAL(
  pollId: string,
  teacherId: string,
  newStatus: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return { error: 'Poll not found' }
  }

  const allowed = VALID_POLL_TRANSITIONS[poll.status] ?? []
  if (!allowed.includes(newStatus)) {
    return {
      error: `Cannot transition poll from '${poll.status}' to '${newStatus}'`,
    }
  }

  return prisma.poll.update({
    where: { id: pollId },
    data: { status: newStatus },
    include: { options: { orderBy: { position: 'asc' } } },
  })
}

/**
 * Assign a poll to a session. Verifies teacher ownership.
 * Returns updated poll or null if not found/not owned.
 */
export async function assignPollToSessionDAL(
  pollId: string,
  teacherId: string,
  sessionId: string | null
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
  })

  if (!poll) {
    return null
  }

  return prisma.poll.update({
    where: { id: pollId },
    data: { sessionId },
  })
}

/**
 * Duplicate a poll with its options (without votes).
 * New poll is always draft status with " (Copy)" appended to question.
 * Verifies teacher ownership of the source poll.
 */
export async function duplicatePollDAL(pollId: string, teacherId: string, targetSessionId?: string) {
  const sourcePoll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId },
    include: { options: { orderBy: { position: 'asc' } } },
  })

  if (!sourcePoll) {
    return null
  }

  return prisma.$transaction(async (tx) => {
    const newPoll = await tx.poll.create({
      data: {
        question: `${sourcePoll.question} (Copy)`,
        description: sourcePoll.description,
        pollType: sourcePoll.pollType,
        allowVoteChange: sourcePoll.allowVoteChange,
        showLiveResults: sourcePoll.showLiveResults,
        rankingDepth: sourcePoll.rankingDepth,
        status: 'draft',
        teacherId,
        sessionId: targetSessionId ?? null,
      },
    })

    for (const option of sourcePoll.options) {
      await tx.pollOption.create({
        data: {
          text: option.text,
          imageUrl: option.imageUrl,
          position: option.position,
          pollId: newPoll.id,
        },
      })
    }

    return tx.poll.findUniqueOrThrow({
      where: { id: newPoll.id },
      include: { options: { orderBy: { position: 'asc' } } },
    })
  })
}

/**
 * Get all archived polls for a teacher, ordered by most recently updated.
 * Used by the /polls/archived page.
 */
export async function getArchivedPollsDAL(teacherId: string) {
  return prisma.poll.findMany({
    where: { teacherId, status: 'archived' },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { votes: true } },
    },
  })
}

/**
 * Unarchive a poll by transitioning it to 'closed' status.
 * Bypasses VALID_POLL_TRANSITIONS intentionally (same pattern as sessions).
 * Ownership enforced via teacherId filter.
 */
export async function unarchivePollDAL(
  pollId: string,
  teacherId: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId, status: 'archived' },
  })

  if (!poll) {
    return { error: 'Poll not found or not archived' }
  }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { status: 'closed' },
  })

  return updated
}

/**
 * Reopen a closed poll by transitioning to paused with allowVoteChange locked to false.
 *
 * Bypasses VALID_POLL_TRANSITIONS intentionally (same pattern as unarchive).
 * Sets allowVoteChange=false so already-voted students cannot change their vote
 * when the poll is resumed.
 *
 * Ownership enforced via teacherId filter.
 */
export async function reopenPollDAL(
  pollId: string,
  teacherId: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId, status: 'closed' },
    select: { id: true, sessionId: true },
  })

  if (!poll) {
    return { error: 'Poll not found or not closed' }
  }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: { status: 'paused', allowVoteChange: false },
  })

  return updated
}

/**
 * Permanently delete an archived poll and all related data (cascade).
 * Only archived polls can be permanently deleted.
 * Ownership enforced via teacherId filter.
 */
export async function deletePollPermanentlyDAL(
  pollId: string,
  teacherId: string
) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, teacherId, status: 'archived' },
  })

  if (!poll) {
    return { error: 'Poll not found or not archived' }
  }

  await prisma.poll.delete({ where: { id: pollId } })

  return { success: true }
}

/**
 * Get distinct participant IDs who have voted on a poll.
 *
 * Uses rank=1 filter to get one row per voter (works for both simple polls
 * where rank is always 1, and ranked polls where each voter has a rank=1 entry).
 * Used by the polling fallback API to provide voter indicators.
 */
export async function getPollVoterParticipantIds(pollId: string): Promise<string[]> {
  const votes = await prisma.pollVote.findMany({
    where: { pollId, rank: 1 },
    select: { participantId: true },
    distinct: ['participantId'],
  })
  return votes.map((v) => v.participantId)
}

// ---------------------------------------------------------------------------
// Vote functions
// ---------------------------------------------------------------------------

/**
 * Cast a simple poll vote. Uses upsert with compound unique
 * (pollId_participantId_rank where rank=1) for idempotent handling.
 */
export async function castSimplePollVoteDAL(
  pollId: string,
  participantId: string,
  optionId: string
) {
  return prisma.pollVote.upsert({
    where: {
      pollId_participantId_rank: { pollId, participantId, rank: 1 },
    },
    create: { pollId, participantId, optionId, rank: 1 },
    update: { optionId },
  })
}

/**
 * Cast ranked poll votes. Delete-then-insert in a transaction.
 * rankings: [{ optionId, rank }] where rank 1 = top choice.
 */
export async function castRankedPollVoteDAL(
  pollId: string,
  participantId: string,
  rankings: { optionId: string; rank: number }[]
) {
  await prisma.$transaction(async (tx) => {
    // Delete existing rankings for this participant
    await tx.pollVote.deleteMany({
      where: { pollId, participantId },
    })

    // Insert new rankings
    for (const ranking of rankings) {
      await tx.pollVote.create({
        data: {
          pollId,
          participantId,
          optionId: ranking.optionId,
          rank: ranking.rank,
        },
      })
    }
  })
}

// ---------------------------------------------------------------------------
// Aggregation functions
// ---------------------------------------------------------------------------

/**
 * Get simple poll vote counts per option.
 * Uses groupBy on optionId where rank=1.
 * Returns Record<optionId, count>.
 */
export async function getSimplePollVoteCounts(
  pollId: string
): Promise<Record<string, number>> {
  // Fetch all option IDs for this poll to ensure zeros are included
  const options = await prisma.pollOption.findMany({
    where: { pollId },
    select: { id: true },
  })

  const groups = await prisma.pollVote.groupBy({
    by: ['optionId'],
    where: { pollId, rank: 1 },
    _count: { id: true },
  })

  // Start with all options at zero, then overlay actual counts
  const counts: Record<string, number> = {}
  for (const opt of options) {
    counts[opt.id] = 0
  }
  for (const g of groups) {
    counts[g.optionId] = g._count.id
  }
  return counts
}

/**
 * Get raw ranked poll vote data for Borda computation.
 * Returns vote data and total unique voters count.
 */
export async function getRankedPollVotes(pollId: string): Promise<{
  votes: { optionId: string; rank: number; participantId: string }[]
  totalUniqueVoters: number
}> {
  const votes = await prisma.pollVote.findMany({
    where: { pollId },
    select: { optionId: true, rank: true, participantId: true },
  })

  const uniqueVoters = new Set(votes.map((v) => v.participantId))

  return {
    votes,
    totalUniqueVoters: uniqueVoters.size,
  }
}

/**
 * Get existing votes for a participant (for vote restoration).
 * Returns array of { optionId, rank }.
 */
export async function getPollParticipantVote(
  pollId: string,
  participantId: string
): Promise<{ optionId: string; rank: number }[]> {
  return prisma.pollVote.findMany({
    where: { pollId, participantId },
    select: { optionId: true, rank: true },
    orderBy: { rank: 'asc' },
  })
}
