import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getPollByIdDAL } from '@/lib/dal/poll'
import { prisma } from '@/lib/prisma'
import { PollDetailView } from '@/components/poll/poll-detail-view'
import type { PollStatus } from '@/lib/poll/types'

export default async function PollDetailPage({
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

  // Serialize dates for client component
  const serialized = {
    id: poll.id,
    question: poll.question,
    description: poll.description,
    pollType: poll.pollType,
    status: poll.status as PollStatus,
    allowVoteChange: poll.allowVoteChange,
    showLiveResults: poll.showLiveResults,
    rankingDepth: poll.rankingDepth,
    teacherId: poll.teacherId,
    sessionId: poll.sessionId,
    createdAt: poll.createdAt.toISOString(),
    updatedAt: poll.updatedAt.toISOString(),
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      imageUrl: o.imageUrl,
      position: o.position,
      pollId: o.pollId,
    })),
  }

  return <PollDetailView poll={serialized} sessions={serializedSessions} />
}
