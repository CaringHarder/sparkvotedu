'use server'

import { prisma } from '@/lib/prisma'
import { castVoteDAL, getVoteCountsForMatchup, hasVoted } from '@/lib/dal/vote'
import { broadcastVoteUpdate } from '@/lib/realtime/broadcast'
import { castVoteSchema } from '@/lib/utils/validation'

/**
 * Cast a vote for an entrant in a matchup.
 *
 * Validates input, checks matchup status is "voting", checks participant
 * is not banned, upserts vote via DAL, broadcasts updated counts, and
 * returns success/error.
 *
 * Flow: Zod parse -> matchup status check -> banned check -> DAL upsert
 *       -> broadcast (non-blocking) -> return result
 */
export async function castVote(input: unknown) {
  const parsed = castVoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid vote data', issues: parsed.error.issues }
  }

  const { matchupId, participantId, entrantId } = parsed.data

  try {
    // Fetch the matchup to verify status and get bracketId
    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
      select: {
        status: true,
        bracketId: true,
        bracket: { select: { sessionId: true, status: true } },
      },
    })

    if (!matchup) {
      return { error: 'Matchup not found' }
    }

    // Block votes when the bracket is paused (teacher paused voting)
    if (matchup.bracket.status === 'paused') {
      return { error: 'Voting is paused by your teacher' }
    }

    // Only allow voting on matchups in "voting" status
    if (matchup.status !== 'voting') {
      return { error: 'Matchup is not open for voting' }
    }

    // Check participant is not banned
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

    // Enforce one-vote-per-matchup: reject if this participant already has a
    // vote recorded for this matchup. Brackets do not support vote changes
    // (unlike polls, which have an explicit allowVoteChange flag). Without
    // this guard, the upsert below would silently overwrite an existing vote,
    // which lets the advanced bracket view bypass the client-side lock and
    // also lets races (e.g. viewingMode fetch delay) change an existing vote.
    const existing = await hasVoted(matchupId, participantId)
    if (existing) {
      // Idempotent: re-submitting the same vote is not an error.
      if (existing.entrantId === entrantId) {
        return { success: true, votedEntrantId: entrantId }
      }
      return { error: 'Vote already recorded' }
    }

    // Cast the vote via DAL (upsert for idempotent vote creation/update)
    await castVoteDAL(matchupId, participantId, entrantId)

    // Get updated vote counts for broadcast
    const voteCounts = await getVoteCountsForMatchup(matchupId)
    const totalVotes = Object.values(voteCounts).reduce((sum, c) => sum + c, 0)

    // Broadcast updated counts (non-blocking, errors logged not thrown)
    broadcastVoteUpdate(matchup.bracketId, matchupId, voteCounts, totalVotes, participantId).catch(
      console.error
    )

    return { success: true, votedEntrantId: entrantId }
  } catch {
    return { error: 'Failed to cast vote' }
  }
}
