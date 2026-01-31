import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/sessions/[sessionId]/activities
 *
 * Returns all active/completed brackets for a session, mapped to the
 * Activity interface consumed by useRealtimeActivities. This is a public
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
    const activities = await Promise.all(
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

    return NextResponse.json(activities)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
