import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSimplePollVoteCounts, getRankedPollVotes } from '@/lib/dal/poll'
import { computeBordaScores } from '@/lib/poll/borda'

/**
 * GET /api/polls/[pollId]/state
 *
 * Returns the current poll state with options, vote counts, and Borda scores.
 * Used as the polling fallback endpoint for school networks that block WebSocket.
 *
 * This route is public (no auth required) -- students access it for real-time
 * poll state updates when WebSocket is unavailable.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { position: 'asc' },
          select: { id: true, text: true, imageUrl: true, position: true },
        },
      },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Dynamic participant count for session
    let participantCount = 0
    if (poll.sessionId) {
      participantCount = await prisma.studentParticipant.count({
        where: { sessionId: poll.sessionId, banned: false },
      })
    }

    let voteCounts: Record<string, number> = {}
    let totalVotes = 0
    let bordaScores: { optionId: string; points: number }[] | undefined

    if (poll.pollType === 'simple') {
      voteCounts = await getSimplePollVoteCounts(pollId)
      totalVotes = Object.values(voteCounts).reduce((sum, c) => sum + c, 0)
    } else if (poll.pollType === 'ranked') {
      const { votes, totalUniqueVoters } = await getRankedPollVotes(pollId)
      totalVotes = totalUniqueVoters

      // Compute Borda scores using rankingDepth as base for partial rankings
      const pointBase =
        poll.rankingDepth != null && poll.rankingDepth < poll.options.length
          ? poll.rankingDepth
          : poll.options.length
      bordaScores = computeBordaScores(votes, pointBase)

      // Also provide simple vote counts (rank=1 selections) for fallback display
      voteCounts = await getSimplePollVoteCounts(pollId)
    }

    return NextResponse.json({
      id: poll.id,
      question: poll.question,
      status: poll.status,
      pollType: poll.pollType,
      allowVoteChange: poll.allowVoteChange,
      showLiveResults: poll.showLiveResults,
      rankingDepth: poll.rankingDepth,
      options: poll.options,
      voteCounts,
      totalVotes,
      participantCount,
      ...(bordaScores ? { bordaScores } : {}),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch poll state' },
      { status: 500 }
    )
  }
}
