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

    // Fetch brackets in this session that are active or completed
    const brackets = await prisma.bracket.findMany({
      where: {
        sessionId,
        status: { in: ['active', 'completed'] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        viewingMode: true,
        _count: {
          select: {
            matchups: { where: { status: 'voting' } },
          },
        },
      },
    })

    // For each bracket, check if participant has voted on current voting matchups
    const bracketActivities = await Promise.all(
      brackets.map(async (bracket) => {
        let hasVoted = false

        if (pid && bracket._count.matchups > 0) {
          // Check if participant has at least one vote on a voting matchup
          const voteCount = await prisma.vote.count({
            where: {
              participantId: pid,
              matchup: {
                bracketId: bracket.id,
                status: 'voting',
              },
            },
          })
          hasVoted = voteCount > 0
        }

        return {
          id: bracket.id,
          name: bracket.name,
          type: 'bracket' as const,
          participantCount: bracket._count.matchups, // number of active voting matchups
          hasVoted,
          status: bracket.status,
        }
      })
    )

    // Fetch polls in this session that are active or closed
    const polls = await prisma.poll.findMany({
      where: {
        sessionId,
        status: { in: ['active', 'closed'] },
      },
      select: {
        id: true,
        question: true,
        status: true,
        pollType: true,
        _count: { select: { votes: true } },
      },
    })

    // Map polls to Activity interface, check if participant has voted
    const pollActivities = await Promise.all(
      polls.map(async (poll) => {
        let hasVoted = false
        if (pid) {
          const voteCount = await prisma.pollVote.count({
            where: { pollId: poll.id, participantId: pid },
          })
          hasVoted = voteCount > 0
        }
        return {
          id: poll.id,
          name: poll.question,
          type: 'poll' as const,
          participantCount: poll._count.votes,
          hasVoted,
          status: poll.status,
        }
      })
    )

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
