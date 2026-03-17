import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/sessions/[sessionId]/activities
 *
 * Returns all active/completed brackets and polls for a session, mapped to
 * the Activity interface consumed by useRealtimeActivities. This is a public
 * route (students access without auth) -- already whitelisted in proxy:
 * "if (pathname.startsWith('/api/sessions/')) return true"
 *
 * Query params:
 *   pid - participant ID (optional, for hasVoted check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const pid = request.nextUrl.searchParams.get('pid')

  try {
    // Verify session exists
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    })

    if (!session) {
      return NextResponse.json([], { status: 200 })
    }

    // Fetch brackets in this session that are active/completed,
    // OR predictive brackets with predictions_open (handles edge cases
    // where bracket was opened before auto-activate fix)
    const brackets = await prisma.bracket.findMany({
      where: {
        sessionId,
        OR: [
          { status: { in: ['active', 'paused', 'completed'] } },
          { predictionStatus: 'predictions_open' },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        viewingMode: true,
        bracketType: true,
        predictionStatus: true,
        _count: {
          select: {
            matchups: { where: { status: 'voting' } },
          },
        },
      },
    })

    // Batch check: which brackets has the participant voted in? (single query)
    const votedBracketIds = new Set<string>()
    if (pid && brackets.some((b) => b._count.matchups > 0)) {
      const votedBrackets = await prisma.vote.findMany({
        where: {
          participantId: pid,
          matchup: {
            bracketId: { in: brackets.map((b) => b.id) },
            status: 'voting',
          },
        },
        select: { matchup: { select: { bracketId: true } } },
        distinct: ['matchupId'],
      })
      for (const v of votedBrackets) {
        votedBracketIds.add(v.matchup.bracketId)
      }
    }

    const bracketActivities = brackets.map((bracket) => ({
      id: bracket.id,
      name: bracket.name,
      type: 'bracket' as const,
      participantCount: bracket._count.matchups,
      hasVoted: votedBracketIds.has(bracket.id),
      status: bracket.status,
      bracketType: bracket.bracketType,
      predictionStatus: bracket.predictionStatus,
    }))

    // Fetch polls in this session that are active or closed
    const polls = await prisma.poll.findMany({
      where: {
        sessionId,
        status: { in: ['active', 'paused', 'closed'] },
      },
      select: {
        id: true,
        question: true,
        status: true,
        pollType: true,
        _count: { select: { votes: true } },
      },
    })

    // Batch check: which polls has the participant voted in? (single query)
    const votedPollIds = new Set<string>()
    if (pid && polls.length > 0) {
      const votedPolls = await prisma.pollVote.findMany({
        where: {
          participantId: pid,
          pollId: { in: polls.map((p) => p.id) },
        },
        select: { pollId: true },
        distinct: ['pollId'],
      })
      for (const v of votedPolls) {
        votedPollIds.add(v.pollId)
      }
    }

    const pollActivities = polls.map((poll) => ({
      id: poll.id,
      name: poll.question,
      type: 'poll' as const,
      participantCount: poll._count.votes,
      hasVoted: votedPollIds.has(poll.id),
      status: poll.status,
    }))

    // Merge bracket and poll activities, active first
    const allActivities = [...bracketActivities, ...pollActivities].sort(
      (a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        return 0
      }
    )

    return NextResponse.json(allActivities)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
