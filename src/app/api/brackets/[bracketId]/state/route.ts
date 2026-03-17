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
          select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true, tournamentSeed: true },
        },
        matchups: {
          include: {
            entrant1: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true, tournamentSeed: true } },
            entrant2: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true, tournamentSeed: true } },
            winner: { select: { id: true, name: true, seedPosition: true, externalTeamId: true, logoUrl: true, abbreviation: true, tournamentSeed: true } },
          },
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
        },
      },
    })

    if (!bracket) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 })
    }

    // Only fetch vote counts for matchups in 'voting' status (skip for predictive/sports brackets
    // where no matchups are voting -- avoids 134+ unnecessary DB queries per request)
    const votingMatchups = bracket.matchups.filter((m) => m.status === 'voting')
    const voteCountsMap: Record<string, Record<string, number>> = {}
    const voterIdsMap: Record<string, string[]> = {}
    if (votingMatchups.length > 0) {
      await Promise.all(
        votingMatchups.map(async (matchup) => {
          const [voteCounts, voterIds] = await Promise.all([
            getVoteCountsForMatchup(matchup.id),
            getVoterParticipantIds(matchup.id),
          ])
          voteCountsMap[matchup.id] = voteCounts
          voterIdsMap[matchup.id] = voterIds
        })
      )
    }

    const matchupsWithCounts = bracket.matchups.map((matchup) => ({
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
      voteCounts: voteCountsMap[matchup.id] ?? {},
      voterIds: voterIdsMap[matchup.id] ?? [],
      bracketRegion: matchup.bracketRegion,
      isBye: matchup.isBye,
      roundRobinRound: matchup.roundRobinRound,
      nextMatchupId: matchup.nextMatchupId,
      externalGameId: matchup.externalGameId,
      homeScore: matchup.homeScore,
      awayScore: matchup.awayScore,
      gameStatus: matchup.gameStatus,
      gameStartTime: matchup.gameStartTime?.toISOString() ?? null,
    }))

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
