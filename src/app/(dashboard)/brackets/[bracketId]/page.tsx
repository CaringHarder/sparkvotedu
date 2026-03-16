import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { getRoundRobinStandings } from '@/lib/dal/round-robin'
import { scoreBracketPredictions } from '@/lib/dal/prediction'
import { prisma } from '@/lib/prisma'
import { BracketDetail } from '@/components/bracket/bracket-detail'
import type { BracketStatus, PredictionScore } from '@/lib/bracket/types'

export default async function BracketDetailPage({
  params,
}: {
  params: Promise<{ bracketId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { bracketId } = await params

  const bracket = await getBracketWithDetails(bracketId, teacher.id)
  if (!bracket) {
    redirect('/brackets')
  }

  // For round-robin, totalRounds is N-1 (even) or N (odd), not log2
  // For sports brackets, use size (64) not maxEntrants (68) — First Four is round 0, separate
  // For single-elim/predictive with byes, use maxEntrants (effective bracket size)
  const isRoundRobin = bracket.bracketType === 'round_robin'
  const isSports = bracket.bracketType === 'sports'
  const effectiveSize = isSports ? bracket.size : (bracket.maxEntrants ?? bracket.size)
  const totalRounds = isRoundRobin
    ? (bracket.size % 2 === 0 ? bracket.size - 1 : bracket.size)
    : Math.ceil(Math.log2(effectiveSize))

  // Fetch standings for round-robin brackets
  const standings = isRoundRobin ? await getRoundRobinStandings(bracket.id) : []

  // Fetch prediction leaderboard for predictive brackets (active or completed)
  const isPredictive = bracket.bracketType === 'predictive'
  let predictionScores: PredictionScore[] = []
  try {
    predictionScores =
      isPredictive && (bracket.status === 'active' || bracket.status === 'completed')
        ? await scoreBracketPredictions(bracket.id)
        : []
  } catch (error) {
    console.error('[BracketDetailPage] Failed to load prediction scores:', error)
    predictionScores = []
  }

  // Fetch teacher's active sessions for session assignment
  const sessions = await prisma.classSession.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    select: { id: true, code: true, createdAt: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    createdAt: s.createdAt.toISOString(),
  }))

  // Serialize dates and relations for client component
  const serialized = {
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
      tournamentSeed: e.tournamentSeed ?? null,
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
        ? { id: m.entrant1.id, name: m.entrant1.name, seedPosition: m.entrant1.seedPosition, bracketId: m.entrant1.bracketId, externalTeamId: m.entrant1.externalTeamId ?? null, logoUrl: m.entrant1.logoUrl ?? null, abbreviation: m.entrant1.abbreviation ?? null, tournamentSeed: m.entrant1.tournamentSeed ?? null }
        : null,
      entrant2: m.entrant2
        ? { id: m.entrant2.id, name: m.entrant2.name, seedPosition: m.entrant2.seedPosition, bracketId: m.entrant2.bracketId, externalTeamId: m.entrant2.externalTeamId ?? null, logoUrl: m.entrant2.logoUrl ?? null, abbreviation: m.entrant2.abbreviation ?? null, tournamentSeed: m.entrant2.tournamentSeed ?? null }
        : null,
      winner: m.winner
        ? { id: m.winner.id, name: m.winner.name, seedPosition: m.winner.seedPosition, bracketId: m.winner.bracketId, externalTeamId: m.winner.externalTeamId ?? null, logoUrl: m.winner.logoUrl ?? null, abbreviation: m.winner.abbreviation ?? null, tournamentSeed: m.winner.tournamentSeed ?? null }
        : null,
    })),
  }

  // Look up session name for metadata bar
  let sessionName: string | null = null
  if (bracket.sessionId) {
    const matchedSession = serializedSessions.find((s) => s.id === bracket.sessionId)
    if (matchedSession) {
      sessionName = matchedSession.name
    } else {
      // Session may be ended (not in active list) -- query directly
      const endedSession = await prisma.classSession.findUnique({
        where: { id: bracket.sessionId },
        select: { name: true },
      })
      sessionName = endedSession?.name ?? null
    }
  }

  return (
    <BracketDetail
      bracket={serialized}
      totalRounds={totalRounds}
      sessions={serializedSessions}
      standings={standings}
      predictionScores={predictionScores}
      sessionName={sessionName}
    />
  )
}
