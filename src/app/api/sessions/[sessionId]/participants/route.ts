import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/sessions/[sessionId]/participants
 *
 * Returns the participant list for a session owned by the authenticated teacher.
 * Used by useRealtimeParticipants to refresh sidebar on participant_joined events.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { sessionId } = await params

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { teacherId: true },
  })

  if (!session || session.teacherId !== teacher.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const participants = await prisma.studentParticipant.findMany({
    where: { sessionId },
    select: {
      id: true,
      funName: true,
      firstName: true,
      emoji: true,
      lastInitial: true,
    },
    orderBy: { funName: 'asc' },
  })

  return NextResponse.json({ participants })
}
