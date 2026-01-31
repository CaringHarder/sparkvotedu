import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/brackets/[bracketId]/votes?pid=<participantId>
 *
 * Returns the participant's votes for all matchups in a bracket.
 * Response: Record<matchupId, entrantId>
 *
 * This route is public (no auth required) -- students access it
 * to restore their vote state on page load.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bracketId: string }> }
) {
  const { bracketId } = await params
  const { searchParams } = new URL(request.url)
  const participantId = searchParams.get('pid')

  if (!participantId) {
    return NextResponse.json(
      { error: 'Missing pid query parameter' },
      { status: 400 }
    )
  }

  try {
    // Get all matchup IDs for this bracket
    const matchups = await prisma.matchup.findMany({
      where: { bracketId },
      select: { id: true },
    })

    const matchupIds = matchups.map((m) => m.id)

    // Get participant's votes for these matchups
    const votes = await prisma.vote.findMany({
      where: {
        participantId,
        matchupId: { in: matchupIds },
      },
      select: { matchupId: true, entrantId: true },
    })

    // Build record: matchupId -> entrantId
    const voteMap: Record<string, string> = {}
    for (const vote of votes) {
      voteMap[vote.matchupId] = vote.entrantId
    }

    return NextResponse.json(voteMap)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}
