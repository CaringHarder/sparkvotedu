import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
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

  const totalRounds = Math.log2(bracket.size)

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

  return <BracketDetail bracket={serialized} totalRounds={totalRounds} sessions={serializedSessions} />
}
