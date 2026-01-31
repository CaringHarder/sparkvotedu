'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  createPollDAL,
  updatePollDAL,
  deletePollDAL,
  updatePollStatusDAL,
  assignPollToSessionDAL,
  duplicatePollDAL,
  castSimplePollVoteDAL,
  castRankedPollVoteDAL,
  getSimplePollVoteCounts,
  getRankedPollVotes,
} from '@/lib/dal/poll'
import {
  createPollSchema,
  pollOptionSchema,
  deletePollSchema,
  updatePollStatusSchema,
  castPollVoteSchema,
  castRankedPollVoteSchema,
} from '@/lib/utils/validation'
import {
  broadcastPollVoteUpdate,
  broadcastPollUpdate,
  broadcastActivityUpdate,
} from '@/lib/realtime/broadcast'
import { canUsePollType, canUsePollOptionCount } from '@/lib/gates/features'
import { computeBordaScores } from '@/lib/poll/borda'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SubscriptionTier } from '@/lib/gates/tiers'

// Combined schema for poll creation with options
const createPollWithOptionsSchema = z.object({
  poll: createPollSchema,
  options: z.array(pollOptionSchema).min(2).max(32),
})

/**
 * Create a new poll with options.
 * Auth -> validate -> feature gate -> DAL -> revalidate -> return
 */
export async function createPoll(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = createPollWithOptionsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid poll data', issues: parsed.error.issues }
  }

  const { poll: pollData, options } = parsed.data

  // Feature gate: check poll type
  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const typeCheck = canUsePollType(tier, pollData.pollType)
  if (!typeCheck.allowed) {
    return { error: typeCheck.reason }
  }

  // Feature gate: check option count
  const optionCheck = canUsePollOptionCount(tier, options.length)
  if (!optionCheck.allowed) {
    return { error: optionCheck.reason }
  }

  try {
    const result = await createPollDAL(teacher.id, pollData, options)
    revalidatePath('/activities')
    return { poll: { id: result.id, question: result.question } }
  } catch {
    return { error: 'Failed to create poll' }
  }
}

// Schema for updating poll fields
const updatePollSchema = z.object({
  pollId: z.string().uuid(),
  question: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  pollType: z.enum(['simple', 'ranked']).optional(),
  allowVoteChange: z.boolean().optional(),
  showLiveResults: z.boolean().optional(),
  rankingDepth: z.number().int().positive().nullable().optional(),
})

/**
 * Update poll fields.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function updatePoll(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updatePollSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid poll data', issues: parsed.error.issues }
  }

  const { pollId, ...data } = parsed.data

  try {
    const result = await updatePollDAL(pollId, teacher.id, data)
    if (!result) {
      return { error: 'Poll not found' }
    }

    revalidatePath('/activities')
    revalidatePath(`/polls/${pollId}`)
    return { success: true }
  } catch {
    return { error: 'Failed to update poll' }
  }
}

/**
 * Delete a poll and all associated options and votes.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function deletePoll(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = deletePollSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid delete data', issues: parsed.error.issues }
  }

  try {
    const deleted = await deletePollDAL(parsed.data.pollId, teacher.id)
    if (!deleted) {
      return { error: 'Poll not found' }
    }

    revalidatePath('/activities')
    return { success: true }
  } catch {
    return { error: 'Failed to delete poll' }
  }
}

/**
 * Update poll status (forward-only transitions).
 * Auth -> validate -> DAL -> broadcast -> revalidate -> return
 *
 * When activating (status='active') and poll has a sessionId,
 * broadcasts an activity update to the session channel.
 * When closing, broadcasts poll_closed to the poll channel.
 */
export async function updatePollStatus(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updatePollStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid status update data', issues: parsed.error.issues }
  }

  const { pollId, status } = parsed.data

  try {
    const result = await updatePollStatusDAL(pollId, teacher.id, status)

    if ('error' in result) {
      return { error: result.error }
    }

    // Broadcast based on new status
    if (status === 'active' && result.sessionId) {
      broadcastActivityUpdate(result.sessionId).catch(console.error)
    }

    if (status === 'closed') {
      broadcastPollUpdate(pollId, 'poll_closed').catch(console.error)
    }

    if (status === 'archived') {
      broadcastPollUpdate(pollId, 'poll_archived').catch(console.error)
    }

    revalidatePath('/activities')
    revalidatePath(`/polls/${pollId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to update poll status' }
  }
}

// Schema for assigning poll to session
const assignPollToSessionSchema = z.object({
  pollId: z.string().uuid(),
  sessionId: z.string().uuid(),
})

/**
 * Assign a poll to a class session.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function assignPollToSession(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = assignPollToSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  const { pollId, sessionId } = parsed.data

  try {
    // Verify session ownership
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: teacher.id },
      select: { id: true },
    })
    if (!session) {
      return { error: 'Session not found or not owned by you' }
    }

    const result = await assignPollToSessionDAL(pollId, teacher.id, sessionId)
    if (!result) {
      return { error: 'Poll not found' }
    }

    revalidatePath('/activities')
    revalidatePath(`/polls/${pollId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to assign poll to session' }
  }
}

// Schema for duplicating a poll
const duplicatePollInputSchema = z.object({
  pollId: z.string().uuid(),
})

/**
 * Duplicate a poll with its options (without votes).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function duplicatePoll(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = duplicatePollInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  try {
    const result = await duplicatePollDAL(parsed.data.pollId, teacher.id)
    if (!result) {
      return { error: 'Poll not found' }
    }

    revalidatePath('/activities')
    return { poll: { id: result.id, question: result.question } }
  } catch {
    return { error: 'Failed to duplicate poll' }
  }
}

/**
 * Cast a vote on a poll (simple or ranked).
 *
 * This is a STUDENT action -- no teacher auth required.
 * Validates: poll active, participant exists + not banned,
 * vote changeability, then delegates to appropriate DAL function.
 *
 * After voting, broadcasts updated counts (non-blocking).
 */
export async function castPollVote(input: unknown) {
  // Try simple vote first, then ranked
  const simpleResult = castPollVoteSchema.safeParse(input)
  const rankedResult = castRankedPollVoteSchema.safeParse(input)

  if (!simpleResult.success && !rankedResult.success) {
    return { error: 'Invalid vote data' }
  }

  // Determine vote type from parsed data
  const isRanked = rankedResult.success && rankedResult.data.rankings !== undefined
  const pollId = isRanked ? rankedResult.data.pollId : simpleResult.data!.pollId
  const participantId = isRanked
    ? rankedResult.data.participantId
    : simpleResult.data!.participantId

  try {
    // Check poll exists and is active
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        status: true,
        pollType: true,
        allowVoteChange: true,
        rankingDepth: true,
        options: { select: { id: true } },
      },
    })

    if (!poll) {
      return { error: 'Poll not found' }
    }

    if (poll.status !== 'active') {
      return { error: 'Poll is not active' }
    }

    // Check participant exists and is not banned
    const participant = await prisma.studentParticipant.findUnique({
      where: { id: participantId },
      select: { banned: true },
    })

    if (!participant) {
      return { error: 'Participant not found' }
    }

    if (participant.banned) {
      return { error: 'Participant is banned from voting' }
    }

    // Check vote changeability
    if (!poll.allowVoteChange) {
      const existingVote = await prisma.pollVote.findFirst({
        where: { pollId, participantId },
      })
      if (existingVote) {
        return { error: 'Vote already submitted (changes not allowed)' }
      }
    }

    // Cast vote based on poll type
    if (isRanked && poll.pollType === 'ranked') {
      await castRankedPollVoteDAL(pollId, participantId, rankedResult.data.rankings)
    } else if (simpleResult.success) {
      await castSimplePollVoteDAL(pollId, participantId, simpleResult.data.optionId)
    } else {
      return { error: 'Invalid vote data for this poll type' }
    }

    // Compute updated counts and broadcast (non-blocking)
    if (poll.pollType === 'simple') {
      const voteCounts = await getSimplePollVoteCounts(pollId)
      const totalVotes = Object.values(voteCounts).reduce((sum, c) => sum + c, 0)
      broadcastPollVoteUpdate(pollId, voteCounts, totalVotes).catch(console.error)
    } else {
      // For ranked polls, broadcast Borda scores as vote counts
      const { votes, totalUniqueVoters } = await getRankedPollVotes(pollId)
      const pointBase =
        poll.rankingDepth != null && poll.rankingDepth < poll.options.length
          ? poll.rankingDepth
          : poll.options.length
      const bordaScores = computeBordaScores(votes, pointBase)
      const scoreCounts: Record<string, number> = {}
      for (const score of bordaScores) {
        scoreCounts[score.optionId] = score.points
      }
      broadcastPollVoteUpdate(pollId, scoreCounts, totalUniqueVoters).catch(
        console.error
      )
    }

    return { success: true }
  } catch {
    return { error: 'Failed to cast vote' }
  }
}
