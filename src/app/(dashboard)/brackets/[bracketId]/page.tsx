import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { getRoundRobinStandings } from '@/lib/dal/round-robin'
import { scoreBracketPredictions } from '@/lib/dal/prediction'
import { prisma } from '@/lib/prisma'
import { BracketDetail } from '@/components/bracket/bracket-detail'
import type { BracketStatus } from '@/lib/bracket/types'

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
  // For single-elim/predictive with byes, use maxEntrants (effective bracket size)
  const isRoundRobin = bracket.bracketType === 'round_robin'
  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = isRoundRobin
    ? (bracket.size % 2 === 0 ? bracket.size - 1 : bracket.size)
    : Math.ceil(Math.log2(effectiveSize))

  // Fetch standings for round-robin brackets
  const standings = isRoundRobin ? await getRoundRobinStandings(bracket.id) : []

  // Fetch prediction leaderboard for predictive brackets (active or completed)
  const isPredictive = bracket.bracketType === 'predictive'
  const predictionScores =
    isPredictive && (bracket.status === 'active' || bracket.status === 'completed')
      ? await scoreBracketPredictions(bracket.id)
      : []

  // Fetch teacher's active sessions for session assignment
  const sessions = await prisma.classSession.findMany({
    where: { teacherId: teacher.id, status: 'active' },
    select: { id: true, code: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    code: s.code,
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
    createdAt: bracket.createdAt.toISOString(),
    updatedAt: bracket.updatedAt.toISOString(),
    entrants: bracket.entrants.map((e) => ({
      id: e.id,
      name: e.name,
      seedPosition: e.seedPosition,
      bracketId: e.bracketId,
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
      entrant1: m.entrant1
        ? { id: m.entrant1.id, name: m.entrant1.name, seedPosition: m.entrant1.seedPosition, bracketId: m.entrant1.bracketId }
        : null,
      entrant2: m.entrant2
        ? { id: m.entrant2.id, name: m.entrant2.name, seedPosition: m.entrant2.seedPosition, bracketId: m.entrant2.bracketId }
        : null,
      winner: m.winner
        ? { id: m.winner.id, name: m.winner.name, seedPosition: m.winner.seedPosition, bracketId: m.winner.bracketId }
        : null,
    })),
  }

  return (
    <BracketDetail
      bracket={serialized}
      totalRounds={totalRounds}
      sessions={serializedSessions}
      standings={standings}
      predictionScores={predictionScores}
    />
  )
}
