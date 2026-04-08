import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getSessionWithActivities, getTeacherSessions } from '@/lib/dal/class-session'
import { SessionWorkspace } from '@/components/teacher/session-workspace'

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: SessionDetailPageProps) {
  const { sessionId } = await params
  const { tab } = await searchParams
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const [session, allSessions] = await Promise.all([
    getSessionWithActivities(sessionId, teacher.id),
    getTeacherSessions(teacher.id),
  ])
  if (!session) {
    redirect('/sessions')
  }

  const serializedSessions = allSessions.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    code: s.code,
    _count: { participants: s._count.participants },
  }))

  // D-09: Default tab = tab with most recently updated activity
  let defaultTab = 'brackets'
  if (session.brackets.length > 0 || session.polls.length > 0) {
    const latestBracket = session.brackets[0]?.updatedAt
    const latestPoll = session.polls[0]?.updatedAt
    if (latestPoll && (!latestBracket || latestPoll > latestBracket)) {
      defaultTab = 'polls'
    }
  }
  const activeTab = tab || defaultTab

  // Serialize dates for client component
  const serializedSession = {
    id: session.id,
    code: session.code,
    name: session.name,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    participants: session.participants.map((p) => ({
      id: p.id,
      funName: p.funName,
      firstName: p.firstName,
      lastInitial: p.lastInitial ?? null,
      emoji: p.emoji ?? null,
      banned: p.banned,
      rerollUsed: p.rerollUsed,
      lastSeenAt: p.lastSeenAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
    brackets: session.brackets.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      size: b.size,
      status: b.status,
      bracketType: b.bracketType,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      _count: b._count,
      sessionCode: session.code,
      sessionId: session.id,
      sessionName: session.name,
      viewingMode: b.viewingMode,
      roundRobinPacing: b.roundRobinPacing ?? null,
      predictiveMode: b.predictiveMode ?? null,
      predictiveResolutionMode: b.predictiveResolutionMode ?? null,
      sportGender: b.sportGender ?? null,
    })),
    polls: session.polls.map((p) => ({
      id: p.id,
      question: p.question,
      pollType: p.pollType,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
      sessionId: session.id,
      sessionCode: session.code,
      sessionName: session.name,
    })),
    _count: session._count,
  }

  return (
    <SessionWorkspace
      session={serializedSession}
      defaultTab={activeTab}
      sessions={serializedSessions}
    />
  )
}
