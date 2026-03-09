import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollByIdDAL, getSimplePollVoteCounts, getPollVoterParticipantIds } from '@/lib/dal/poll'
import { prisma } from '@/lib/prisma'
import type { PollStatus, PollWithOptions } from '@/lib/poll/types'
import { PollLiveClient } from './client'

export default async function PollLivePage({
  params,
}: {
  params: Promise<{ pollId: string }>
}) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const { pollId } = await params

  const poll = await getPollByIdDAL(pollId)

  // Verify poll exists and teacher owns it
  if (!poll || poll.teacherId !== teacher.id) {
    redirect('/activities')
  }

  // Only active, paused, and closed polls can have a live view
  if (poll.status !== 'active' && poll.status !== 'paused' && poll.status !== 'closed') {
    redirect(`/polls/${pollId}`)
  }

  // Get initial vote counts
  const initialVoteCounts = await getSimplePollVoteCounts(pollId)
  const initialTotalVotes = Object.values(initialVoteCounts).reduce(
    (sum, c) => sum + c,
    0
  )

  // Get session code for QR chip (if poll is assigned to a session)
  let sessionCode: string | null = null
  let sessionName: string | null = null
  let participantCount = 0
  let participants: Array<{ id: string; funName: string; firstName?: string; lastSeenAt: string; emoji?: string | null; lastInitial?: string | null }> = []
  let initialVoterIds: string[] = []
  if (poll.sessionId) {
    const [session, sessionParticipants, voterPids] = await Promise.all([
      prisma.classSession.findUnique({
        where: { id: poll.sessionId },
        select: { code: true, name: true, _count: { select: { participants: true } } },
      }),
      prisma.studentParticipant.findMany({
        where: { sessionId: poll.sessionId, banned: false },
        select: { id: true, funName: true, firstName: true, lastSeenAt: true, emoji: true, lastInitial: true },
        orderBy: { funName: 'asc' },
      }),
      getPollVoterParticipantIds(pollId),
    ])
    sessionCode = session?.code ?? null
    sessionName = session?.name ?? null
    participantCount = session?._count.participants ?? 0
    participants = sessionParticipants.map(p => ({
      id: p.id,
      funName: p.funName,
      firstName: p.firstName ?? undefined,
      lastSeenAt: p.lastSeenAt.toISOString(),
      emoji: p.emoji,
      lastInitial: p.lastInitial,
    }))
    initialVoterIds = voterPids
  }

  // Fetch teacher's name view preference
  const teacherPrefs = await prisma.teacher.findUnique({
    where: { id: teacher.id },
    select: { nameViewDefault: true },
  })
  const teacherNameViewDefault = teacherPrefs?.nameViewDefault ?? 'fun'

  // Serialize for client component
  const serialized: PollWithOptions = {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    pollType: poll.pollType as 'simple' | 'ranked',
    status: poll.status as PollStatus,
    allowVoteChange: poll.allowVoteChange,
    showLiveResults: poll.showLiveResults,
    rankingDepth: poll.rankingDepth,
    teacherId: poll.teacherId,
    sessionId: poll.sessionId,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      imageUrl: o.imageUrl,
      position: o.position,
      pollId: o.pollId,
    })),
  }

  return (
    <PollLiveClient
      poll={serialized}
      initialVoteCounts={initialVoteCounts}
      initialTotalVotes={initialTotalVotes}
      sessionCode={sessionCode}
      initialParticipantCount={participantCount}
      sessionName={sessionName}
      participants={participants}
      initialVoterIds={initialVoterIds}
      sessionId={poll.sessionId}
      teacherNameViewDefault={teacherNameViewDefault}
    />
  )
}
