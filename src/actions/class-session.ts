'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  createClassSession,
  endSession as endSessionDAL,
  getTeacherSessions as getTeacherSessionsDAL,
  getSessionWithParticipants as getSessionWithParticipantsDAL,
} from '@/lib/dal/class-session'
import {
  banParticipant as banParticipantDAL,
  removeParticipant as removeParticipantDAL,
} from '@/lib/dal/student-session'

// --- Server Actions (Teacher-facing, auth REQUIRED) ---

/**
 * Create a new class session with a unique 6-digit code.
 * Requires teacher authentication.
 */
export async function createSession(name?: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    const session = await createClassSession(teacher.id, name)
    return {
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
    }
  } catch {
    return { error: 'Failed to create session' }
  }
}

/**
 * End an active class session.
 * Requires teacher authentication and session ownership.
 */
export async function endSession(sessionId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    await endSessionDAL(sessionId, teacher.id)
    return { success: true }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Session not found or unauthorized'
    ) {
      return { error: 'Session not found or unauthorized' }
    }
    return { error: 'Failed to end session' }
  }
}

/**
 * Remove a student participant from a session.
 * Requires teacher authentication.
 */
export async function removeStudent(participantId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    await removeParticipantDAL(participantId)
    return { success: true }
  } catch {
    return { error: 'Failed to remove student' }
  }
}

/**
 * Ban a student participant from a session.
 * Banned students are rejected when they try to rejoin.
 * Requires teacher authentication.
 */
export async function banStudent(participantId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    await banParticipantDAL(participantId)
    return { success: true }
  } catch {
    return { error: 'Failed to ban student' }
  }
}

/**
 * Get all sessions for the authenticated teacher.
 * Requires teacher authentication.
 */
export async function getTeacherSessions() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    const sessions = await getTeacherSessionsDAL(teacher.id)
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        participantCount: s._count.participants,
      })),
    }
  } catch {
    return { error: 'Failed to fetch sessions' }
  }
}

/**
 * Get a session with all participants for the authenticated teacher.
 * Requires teacher authentication and session ownership.
 */
export async function getSessionWithParticipants(sessionId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    const session = await getSessionWithParticipantsDAL(sessionId, teacher.id)
    if (!session) {
      return { error: 'Session not found or unauthorized' }
    }
    return {
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        participants: session.participants.map((p) => ({
          id: p.id,
          funName: p.funName,
          banned: p.banned,
          rerollUsed: p.rerollUsed,
          lastSeenAt: p.lastSeenAt.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
      },
    }
  } catch {
    return { error: 'Failed to fetch session' }
  }
}
