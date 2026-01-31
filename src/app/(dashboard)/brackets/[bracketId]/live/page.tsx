import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getBracketWithDetails } from '@/lib/dal/bracket'
import { getMatchupVoteSummary, getVoterParticipantIds } from '@/lib/dal/vote'
import { prisma } from '@/lib/prisma'
import { LiveDashboard } from '@/components/teacher/live-dashboard'
import type { BracketStatus } from '@/lib/bracket/types'
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

  // Redirect to bracket detail if not active
  const status = bracket.status as BracketStatus
  if (status !== 'active') {
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

  const totalRounds = Math.log2(bracket.size)

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
    votingTimerSeconds: bracket.votingTimerSeconds,
    teacherId: bracket.teacherId,
    sessionId: bracket.sessionId,
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
    />
  )
}
