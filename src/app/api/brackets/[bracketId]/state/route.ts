import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVoteCountsForMatchup, getVoterParticipantIds } from '@/lib/dal/vote'

// Prevent Next.js from caching GET responses on this route.
// Without this, the framework may serve stale bracket state after round advancement,
// causing vote counts to not update in realtime on the final round.
export const dynamic = 'force-dynamic'

/**
 * GET /api/brackets/[bracketId]/state
 *
 * Returns the current bracket state with matchups, vote counts, and entrants.
 * Used as the polling fallback endpoint for school networks that block WebSocket.
 *
 * This route is public (no auth required) -- students access it for real-time
 * bracket state updates when WebSocket is unavailable.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bracketId: string }> }
) {
  const { bracketId } = await params

  try {
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      include: {
        entrants: {
          orderBy: { seedPosition: 'asc' },
          select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true },
        },
        matchups: {
          include: {
            entrant1: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true } },
            entrant2: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true } },
            winner: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true } },
          },
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
        },
      },
    })

    if (!bracket) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
    }

    // Fetch vote counts and voter IDs for each matchup in parallel
    const matchupsWithCounts = await Promise.all(
      bracket.matchups.map(async (matchup) => {
        const [voteCounts, voterIds] = await Promise.all([
          getVoteCountsForMatchup(matchup.id),
          getVoterParticipantIds(matchup.id),
        ])
        return {
          id: matchup.id,
          round: matchup.round,
          position: matchup.position,
          status: matchup.status,
          entrant1Id: matchup.entrant1Id,
          entrant2Id: matchup.entrant2Id,
          winnerId: matchup.winnerId,
          entrant1: matchup.entrant1,
          entrant2: matchup.entrant2,
          winner: matchup.winner,
          voteCounts,
          voterIds,
          bracketRegion: matchup.bracketRegion,
          isBye: matchup.isBye,
          roundRobinRound: matchup.roundRobinRound,
          nextMatchupId: matchup.nextMatchupId,
          externalGameId: matchup.externalGameId,
          homeScore: matchup.homeScore,
          awayScore: matchup.awayScore,
          gameStatus: matchup.gameStatus,
          gameStartTime: matchup.gameStartTime?.toISOString() ?? null,
        }
      })
    )

    return NextResponse.json({
      id: bracket.id,
      name: bracket.name,
      status: bracket.status,
      viewingMode: bracket.viewingMode,
      showVoteCounts: bracket.showVoteCounts,
      showSeedNumbers: bracket.showSeedNumbers,
      votingTimerSeconds: bracket.votingTimerSeconds,
      bracketType: bracket.bracketType,
      predictionStatus: bracket.predictionStatus,
      predictiveMode: bracket.predictiveMode,
      predictiveResolutionMode: bracket.predictiveResolutionMode,
      roundRobinPacing: bracket.roundRobinPacing,
      roundRobinVotingStyle: bracket.roundRobinVotingStyle,
      roundRobinStandingsMode: bracket.roundRobinStandingsMode,
      maxEntrants: bracket.maxEntrants,
      playInEnabled: bracket.playInEnabled,
      revealedUpToRound: bracket.revealedUpToRound,
      entrants: bracket.entrants,
      matchups: matchupsWithCounts,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch bracket state' },
      { status: 500 }
    )
  }
}
