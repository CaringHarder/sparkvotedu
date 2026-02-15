import { prisma } from '@/lib/prisma'
import { scoreBracketPredictions } from '@/lib/dal/prediction'
import { getSimplePollVoteCounts, getRankedPollVotes } from '@/lib/dal/poll'
import { computeBordaScores } from '@/lib/poll/borda'
import type { PredictionScore } from '@/lib/bracket/types'

// ---------------------------------------------------------------------------
// Bracket Analytics
// ---------------------------------------------------------------------------

/**
 * Get participation stats for a bracket.
 *
 * Counts unique voters, total votes, non-bye matchups, and session
 * participant count (for participation rate). All queries run in
 * parallel via Promise.all.
 */
export async function getBracketParticipation(bracketId: string): Promise<{
  uniqueParticipants: number
  totalVotes: number
  totalMatchups: number
  sessionParticipantCount: number
}> {
  // Find bracket's sessionId for participation rate
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { sessionId: true },
  })

  const [uniqueVoters, totalVotes, totalMatchups, sessionParticipantCount] =
    await Promise.all([
      prisma.vote.findMany({
        where: { matchup: { bracketId } },
        select: { participantId: true },
        distinct: ['participantId'],
      }),
      prisma.vote.count({
        where: { matchup: { bracketId } },
      }),
      prisma.matchup.count({
        where: { bracketId, isBye: false },
      }),
      bracket?.sessionId
        ? prisma.studentParticipant.count({
            where: { sessionId: bracket.sessionId },
          })
        : Promise.resolve(0),
    ])

  return {
    uniqueParticipants: uniqueVoters.length,
    totalVotes,
    totalMatchups,
    sessionParticipantCount,
  }
}

/**
 * Get vote distribution for all non-bye matchups in a bracket.
 *
 * Uses a single groupBy query to avoid N+1. Returns a Record keyed
 * by matchupId with entrant names, vote counts, and winner info.
 */
export async function getBracketVoteDistribution(bracketId: string): Promise<
  Record<
    string,
    {
      matchupLabel: string
      round: number
      position: number
      entrant1: { id: string; name: string; votes: number }
      entrant2: { id: string | null; name: string | null; votes: number }
      winnerId: string | null
      totalVotes: number
    }
  >
> {
  const [matchups, voteGroups] = await Promise.all([
    prisma.matchup.findMany({
      where: { bracketId, isBye: false },
      select: {
        id: true,
        round: true,
        position: true,
        winnerId: true,
        entrant1: { select: { id: true, name: true } },
        entrant2: { select: { id: true, name: true } },
      },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    }),
    prisma.vote.groupBy({
      by: ['matchupId', 'entrantId'],
      where: { matchup: { bracketId } },
      _count: { id: true },
    }),
  ])

  // Build lookup: matchupId -> entrantId -> vote count
  const voteLookup = new Map<string, Map<string, number>>()
  for (const g of voteGroups) {
    if (!voteLookup.has(g.matchupId)) {
      voteLookup.set(g.matchupId, new Map())
    }
    voteLookup.get(g.matchupId)!.set(g.entrantId, g._count.id)
  }

  const result: Record<
    string,
    {
      matchupLabel: string
      round: number
      position: number
      entrant1: { id: string; name: string; votes: number }
      entrant2: { id: string | null; name: string | null; votes: number }
      winnerId: string | null
      totalVotes: number
    }
  > = {}

  for (const m of matchups) {
    const counts = voteLookup.get(m.id) ?? new Map<string, number>()
    const e1Votes = m.entrant1 ? (counts.get(m.entrant1.id) ?? 0) : 0
    const e2Votes = m.entrant2 ? (counts.get(m.entrant2.id) ?? 0) : 0

    result[m.id] = {
      matchupLabel: `R${m.round} M${m.position}`,
      round: m.round,
      position: m.position,
      entrant1: {
        id: m.entrant1?.id ?? '',
        name: m.entrant1?.name ?? '',
        votes: e1Votes,
      },
      entrant2: {
        id: m.entrant2?.id ?? null,
        name: m.entrant2?.name ?? null,
        votes: e2Votes,
      },
      winnerId: m.winnerId,
      totalVotes: e1Votes + e2Votes,
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Poll Analytics
// ---------------------------------------------------------------------------

/**
 * Get participation stats for a poll.
 *
 * Uses rank=1 for unique voter count (works for both simple and ranked polls).
 */
export async function getPollParticipation(pollId: string): Promise<{
  uniqueParticipants: number
  totalVotes: number
  sessionParticipantCount: number
}> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { sessionId: true },
  })

  const [uniqueVoters, totalVotes, sessionParticipantCount] =
    await Promise.all([
      prisma.pollVote.findMany({
        where: { pollId, rank: 1 },
        select: { participantId: true },
        distinct: ['participantId'],
      }),
      prisma.pollVote.count({
        where: { pollId, rank: 1 },
      }),
      poll?.sessionId
        ? prisma.studentParticipant.count({
            where: { sessionId: poll.sessionId },
          })
        : Promise.resolve(0),
    ])

  return {
    uniqueParticipants: uniqueVoters.length,
    totalVotes,
    sessionParticipantCount,
  }
}

/**
 * Get vote distribution for a poll.
 *
 * For simple polls: uses getSimplePollVoteCounts with option text mapping.
 * For ranked polls: computes Borda scores using existing engine.
 */
export async function getPollVoteDistribution(
  pollId: string,
  pollType: string
): Promise<{
  options: Array<{
    optionId: string
    optionText: string
    votes: number
    percentage: number
  }>
  totalVotes: number
}> {
  // Fetch options for text mapping
  const pollOptions = await prisma.pollOption.findMany({
    where: { pollId },
    select: { id: true, text: true },
    orderBy: { position: 'asc' },
  })

  const textMap = new Map(pollOptions.map((o) => [o.id, o.text]))

  if (pollType === 'ranked') {
    // Ranked poll: use Borda scores
    const { votes } = await getRankedPollVotes(pollId)
    const rankingDepth = votes.length > 0
      ? Math.max(...votes.map((v) => v.rank))
      : pollOptions.length
    const bordaScores = computeBordaScores(votes, rankingDepth)

    const totalPoints = bordaScores.reduce((sum, s) => sum + s.points, 0)

    const options = pollOptions.map((opt) => {
      const score = bordaScores.find((s) => s.optionId === opt.id)
      const points = score?.points ?? 0
      return {
        optionId: opt.id,
        optionText: opt.text,
        votes: points,
        percentage: totalPoints > 0
          ? Math.round((points / totalPoints) * 100)
          : 0,
      }
    })

    return { options, totalVotes: totalPoints }
  }

  // Simple poll: use existing vote counts
  const voteCounts = await getSimplePollVoteCounts(pollId)
  const total = Object.values(voteCounts).reduce((sum, c) => sum + c, 0)

  const options = pollOptions.map((opt) => {
    const count = voteCounts[opt.id] ?? 0
    return {
      optionId: opt.id,
      optionText: opt.text,
      votes: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  })

  return { options, totalVotes: total }
}

// ---------------------------------------------------------------------------
// Predictive Bracket Analytics
// ---------------------------------------------------------------------------

/**
 * Get predictive bracket analytics: prediction counts and scored leaderboard.
 *
 * Reuses existing scoreBracketPredictions for the scoring engine.
 */
export async function getPredictiveAnalytics(bracketId: string): Promise<{
  predictionCount: number
  uniquePredictors: number
  scores: PredictionScore[]
}> {
  const [predictionCount, uniquePredictors, scores] = await Promise.all([
    prisma.prediction.count({ where: { bracketId } }),
    prisma.prediction
      .findMany({
        where: { bracketId },
        select: { participantId: true },
        distinct: ['participantId'],
      })
      .then((r) => r.length),
    scoreBracketPredictions(bracketId),
  ])

  return {
    predictionCount,
    uniquePredictors,
    scores,
  }
}
