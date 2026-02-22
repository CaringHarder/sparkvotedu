import { prisma } from '@/lib/prisma'
import { generateClassCode } from '@/lib/student/class-codes'

/**
 * Create a new class session with a unique 6-digit code.
 * The code is guaranteed unique among active/paused sessions.
 */
export async function createClassSession(
  teacherId: string,
  name?: string
) {
  const code = await generateClassCode()

  return prisma.classSession.create({
    data: {
      code,
      status: 'active',
      teacherId,
      name: name ?? null,
    },
  })
}

/**
 * Find an active session by its 6-digit class code.
 * Includes teacher name for the student welcome screen.
 * Returns null if code is invalid or session is not active.
 */
export async function findActiveSessionByCode(code: string) {
  return prisma.classSession.findFirst({
    where: {
      code,
      status: 'active',
    },
    include: {
      teacher: {
        select: { name: true },
      },
    },
  })
}

/**
 * Find a session by its 6-digit class code regardless of status.
 * Includes teacher name for the student welcome/results screen.
 * Returns null if code is invalid.
 *
 * Unlike findActiveSessionByCode, this returns ended sessions too --
 * per locked decision: ended sessions should show results, not just "session ended".
 */
export async function findSessionByCode(code: string) {
  return prisma.classSession.findFirst({
    where: { code },
    include: {
      teacher: {
        select: { name: true },
      },
    },
  })
}

/**
 * Get a session with all its participants.
 * Verifies teacher ownership (authorization check).
 * Returns null if session not found or teacher doesn't own it.
 */
export async function getSessionWithParticipants(
  sessionId: string,
  teacherId: string
) {
  return prisma.classSession.findFirst({
    where: {
      id: sessionId,
      teacherId,
    },
    include: {
      participants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

/**
 * End a class session by setting status to 'ended' and recording endedAt.
 * Verifies teacher ownership before updating.
 * Throws if session not found or teacher doesn't own it.
 */
export async function endSession(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: {
      id: sessionId,
      teacherId,
    },
  })

  if (!session) {
    throw new Error('Session not found or unauthorized')
  }

  return prisma.classSession.update({
    where: { id: sessionId },
    data: {
      status: 'ended',
      endedAt: new Date(),
    },
  })
}

/**
 * Get all sessions for a teacher, ordered by most recent first.
 * Includes participant count for dashboard display.
 */
export async function getTeacherSessions(teacherId: string) {
  return prisma.classSession.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  })
}

/**
 * Update a session's name.
 * Verifies teacher ownership before updating.
 * Empty/whitespace-only name clears back to null.
 * Throws if session not found or teacher doesn't own it.
 */
export async function updateSessionName(
  sessionId: string,
  teacherId: string,
  name: string
) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  })
  if (!session) {
    throw new Error('Session not found or unauthorized')
  }
  return prisma.classSession.update({
    where: { id: sessionId },
    data: { name: name.trim() || null },
  })
}
