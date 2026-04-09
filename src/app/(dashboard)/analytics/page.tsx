import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { AnalyticsHub } from '@/components/analytics/analytics-hub'

export default async function AnalyticsHubPage() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  // Fetch sessions with their analytics-eligible activities
  const sessionsPromise = prisma.classSession.findMany({
    where: { teacherId: teacher.id },
    include: {
      brackets: {
        where: { status: { in: ['active', 'completed'] } },
        select: {
          id: true,
          name: true,
          bracketType: true,
          status: true,
          size: true,
          _count: { select: { matchups: { where: { isBye: false } } } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      polls: {
        where: { status: { in: ['active', 'closed', 'archived'] } },
        select: {
          id: true,
          question: true,
          pollType: true,
          status: true,
          _count: { select: { votes: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const orphanBracketsPromise = prisma.bracket.findMany({
    where: {
      teacherId: teacher.id,
      sessionId: null,
      status: { in: ['active', 'completed'] },
    },
    select: {
      id: true,
      name: true,
      bracketType: true,
      status: true,
      size: true,
      _count: { select: { matchups: { where: { isBye: false } } } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const orphanPollsPromise = prisma.poll.findMany({
    where: {
      teacherId: teacher.id,
      sessionId: null,
      status: { in: ['active', 'closed', 'archived'] },
    },
    select: {
      id: true,
      question: true,
      pollType: true,
      status: true,
      _count: { select: { votes: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const [sessions, orphanBrackets, orphanPolls] = await Promise.all([
    sessionsPromise,
    orphanBracketsPromise,
    orphanPollsPromise,
  ])

  // Filter to sessions that have at least one bracket or poll
  const nonEmptySessions = sessions.filter(
    (s) => s.brackets.length > 0 || s.polls.length > 0
  )

  // Serialize to plain objects for the client boundary
  const serializedSessions = nonEmptySessions.map((s) => ({
    id: s.id,
    name: s.name,
    brackets: s.brackets,
    polls: s.polls,
  }))

  return (
    <AnalyticsHub
      sessions={serializedSessions}
      orphanBrackets={orphanBrackets}
      orphanPolls={orphanPolls}
    />
  )
}
