import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollByIdDAL, getSimplePollVoteCounts } from '@/lib/dal/poll'
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

  // Only active and closed polls can have a live view
  if (poll.status !== 'active' && poll.status !== 'closed') {
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
  if (poll.sessionId) {
    const session = await prisma.classSession.findUnique({
      where: { id: poll.sessionId },
      select: { code: true, name: true, _count: { select: { participants: true } } },
    })
    sessionCode = session?.code ?? null
    sessionName = session?.name ?? null
    participantCount = session?._count.participants ?? 0
  }

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
    />
  )
}
