import { redirect } from 'next/navigation'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { getSessionWithParticipants } from '@/lib/dal/class-session'
import { SessionDetail } from './session-detail'

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const { sessionId } = await params
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    redirect('/login')
  }

  const session = await getSessionWithParticipants(sessionId, teacher.id)
  if (!session) {
    redirect('/sessions')
  }

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
      banned: p.banned,
      rerollUsed: p.rerollUsed,
      lastSeenAt: p.lastSeenAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
  }

  return <SessionDetail session={serializedSession} />
}
