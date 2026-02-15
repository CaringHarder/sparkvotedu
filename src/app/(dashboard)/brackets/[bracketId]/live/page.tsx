import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { getMatchupVoteSummary, getVoterParticipantIds } from '@/lib/dal/vote'
import { getRoundRobinStandings } from '@/lib/dal/round-robin'
import { scoreBracketPredictions } from '@/lib/dal/prediction'
import { prisma } from '@/lib/prisma'
import { LiveDashboard } from '@/components/teacher/live-dashboard'
import type { BracketStatus, RoundRobinStanding, PredictionScore } from '@/lib/bracket/types'
import type { VoteCounts } from '@/types/vote'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ bracketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bracketId } = await params
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { name: true },
  })
  return {
    title: bracket ? `${bracket.name} - Live` : 'Live Dashboard',
  }
}

export default async function LiveDashboardPage({ params }: PageProps) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { bracketId } = await params

  const bracket = await getBracketWithDetails(bracketId, teacher.id)
  if (!bracket) {
    notFound()
  }

  // Redirect to bracket detail if bracket is still in draft
  // Allow 'active' AND 'completed' — the LiveDashboard handles completion
  // with winner reveal and celebration animations before the teacher navigates away.
  const status = bracket.status as BracketStatus
  if (status === 'draft') {
    redirect(`/brackets/${bracketId}`)
  }

  // Fetch session participants and code if bracket has a session
  let participants: Array<{ id: string; funName: string; lastSeenAt: Date }> = []
  let sessionCode: string | null = null

  if (bracket.sessionId) {
    const [sessionParticipants, session] = await Promise.all([
      prisma.studentParticipant.findMany({
        where: { sessionId: bracket.sessionId, banned: false },
        select: { id: true, funName: true, lastSeenAt: true },
      }),
      prisma.classSession.findUnique({
        where: { id: bracket.sessionId },
        select: { code: true },
      }),
    ])
    participants = sessionParticipants
    sessionCode = session?.code ?? null
  }

  // Fetch initial vote data for all matchups
  const initialVoteCounts: Record<string, VoteCounts> = {}
  const initialVoterIds: Record<string, string[]> = {}

  await Promise.all(
    bracket.matchups.map(async (matchup) => {
      const [summary, voterIds] = await Promise.all([
        getMatchupVoteSummary(matchup.id),
        getVoterParticipantIds(matchup.id),
      ])
      initialVoteCounts[matchup.id] = summary.voteCounts
      initialVoterIds[matchup.id] = voterIds
    })
  )

  // Type-aware totalRounds calculation
  let totalRounds: number
  if (bracket.bracketType === 'round_robin') {
    // RR doesn't use totalRounds in LiveDashboard (matchups grouped by roundRobinRound)
    totalRounds = 1
  } else if (bracket.bracketType === 'double_elimination') {
    // DE: totalRounds = WB rounds + LB rounds + GF rounds
    // The LiveDashboard uses region-based navigation, but totalRounds is still used for fallback checks
    const wbMatchups = bracket.matchups.filter((m) => m.bracketRegion === 'winners')
    const lbMatchups = bracket.matchups.filter((m) => m.bracketRegion === 'losers')
    const gfMatchups = bracket.matchups.filter((m) => m.bracketRegion === 'grand_finals')
    const wbRounds = wbMatchups.length > 0 ? Math.max(...wbMatchups.map((m) => m.round)) : 0
    const lbRounds = lbMatchups.length > 0
      ? Math.max(...lbMatchups.map((m) => m.round)) - Math.min(...lbMatchups.map((m) => m.round)) + 1
      : 0
    const gfRounds = gfMatchups.length > 0
      ? Math.max(...gfMatchups.map((m) => m.round)) - Math.min(...gfMatchups.map((m) => m.round)) + 1
      : 0
    totalRounds = wbRounds + lbRounds + gfRounds
  } else {
    // SE / Predictive: use maxEntrants for bye bracket support, else size
    const effectiveSize = bracket.maxEntrants ?? bracket.size
    totalRounds = Math.ceil(Math.log2(effectiveSize))
  }

  // Fetch standings for round-robin brackets
  let standings: RoundRobinStanding[] = []
  if (bracket.bracketType === 'round_robin') {
    standings = await getRoundRobinStandings(bracketId)
  }

  // Fetch prediction scores for predictive brackets
  let predictionScores: PredictionScore[] = []
  if (bracket.bracketType === 'predictive') {
    predictionScores = await scoreBracketPredictions(bracketId)
  }

  // Serialize all data for client component
  const serializedBracket = {
    id: bracket.id,
    name: bracket.name,
    description: bracket.description,
    bracketType: bracket.bracketType,
    size: bracket.size,
    status: bracket.status as BracketStatus,
    viewingMode: bracket.viewingMode,
    showVoteCounts: bracket.showVoteCounts,
    showSeedNumbers: bracket.showSeedNumbers,
    votingTimerSeconds: bracket.votingTimerSeconds,
    teacherId: bracket.teacherId,
    sessionId: bracket.sessionId,
    predictionStatus: bracket.predictionStatus,
    roundRobinPacing: bracket.roundRobinPacing,
    roundRobinVotingStyle: bracket.roundRobinVotingStyle,
    roundRobinStandingsMode: bracket.roundRobinStandingsMode,
    predictiveMode: bracket.predictiveMode,
    predictiveResolutionMode: bracket.predictiveResolutionMode,
    playInEnabled: bracket.playInEnabled,
    maxEntrants: bracket.maxEntrants,
    revealedUpToRound: bracket.revealedUpToRound ?? null,
    externalTournamentId: bracket.externalTournamentId ?? null,
    dataSource: bracket.dataSource ?? null,
    lastSyncAt: bracket.lastSyncAt?.toISOString() ?? null,
    sportGender: bracket.sportGender ?? null,
    createdAt: bracket.createdAt.toISOString(),
    updatedAt: bracket.updatedAt.toISOString(),
    entrants: bracket.entrants.map((e) => ({
      id: e.id,
      name: e.name,
      seedPosition: e.seedPosition,
      bracketId: e.bracketId,
      externalTeamId: e.externalTeamId ?? null,
      logoUrl: e.logoUrl ?? null,
      abbreviation: e.abbreviation ?? null,
    })),
    matchups: bracket.matchups.map((m) => ({
      id: m.id,
      round: m.round,
      position: m.position,
      status: m.status,
      bracketId: m.bracketId,
      entrant1Id: m.entrant1Id,
      entrant2Id: m.entrant2Id,
      winnerId: m.winnerId,
      nextMatchupId: m.nextMatchupId,
      bracketRegion: m.bracketRegion,
      isBye: m.isBye,
      roundRobinRound: m.roundRobinRound,
      externalGameId: m.externalGameId ?? null,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      gameStatus: m.gameStatus ?? null,
      gameStartTime: m.gameStartTime?.toISOString() ?? null,
      entrant1: m.entrant1
        ? { id: m.entrant1.id, name: m.entrant1.name, seedPosition: m.entrant1.seedPosition, bracketId: m.entrant1.bracketId, externalTeamId: m.entrant1.externalTeamId ?? null, logoUrl: m.entrant1.logoUrl ?? null, abbreviation: m.entrant1.abbreviation ?? null }
        : null,
      entrant2: m.entrant2
        ? { id: m.entrant2.id, name: m.entrant2.name, seedPosition: m.entrant2.seedPosition, bracketId: m.entrant2.bracketId, externalTeamId: m.entrant2.externalTeamId ?? null, logoUrl: m.entrant2.logoUrl ?? null, abbreviation: m.entrant2.abbreviation ?? null }
        : null,
      winner: m.winner
        ? { id: m.winner.id, name: m.winner.name, seedPosition: m.winner.seedPosition, bracketId: m.winner.bracketId, externalTeamId: m.winner.externalTeamId ?? null, logoUrl: m.winner.logoUrl ?? null, abbreviation: m.winner.abbreviation ?? null }
        : null,
    })),
  }

  const serializedParticipants = participants.map((p) => ({
    id: p.id,
    funName: p.funName,
    lastSeenAt: p.lastSeenAt.toISOString(),
  }))

  return (
    <LiveDashboard
      bracket={serializedBracket}
      totalRounds={totalRounds}
      participants={serializedParticipants}
      initialVoteCounts={initialVoteCounts}
      initialVoterIds={initialVoterIds}
      sessionCode={sessionCode}
      standings={standings}
      predictionScores={predictionScores}
    />
  )
}
