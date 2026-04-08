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
        where: { firstName: { not: '' } },
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
  const sessions = await prisma.classSession.findMany({
    where: { teacherId, archivedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { participants: true, brackets: true, polls: true },
      },
    },
  })

  // D-06: Sort active first (by createdAt desc), then ended (by endedAt desc)
  return sessions.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1
    if (a.status === 'active' && b.status === 'active') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    // Both ended: sort by endedAt desc (most recent first)
    const aEnd = a.endedAt ? new Date(a.endedAt).getTime() : 0
    const bEnd = b.endedAt ? new Date(b.endedAt).getTime() : 0
    return bEnd - aEnd
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

/**
 * Archive a session by setting archivedAt timestamp.
 * Atomically auto-ends any active brackets and polls before archiving.
 * If the session wasn't already ended, it gets ended too.
 * Verifies teacher ownership before updating.
 * Throws if session not found or teacher doesn't own it.
 */
export async function archiveSession(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId },
  })

  if (!session) {
    throw new Error('Session not found or unauthorized')
  }

  return prisma.$transaction(async (tx) => {
    // Auto-end active brackets in this session
    await tx.bracket.updateMany({
      where: { sessionId, status: 'active' },
      data: { status: 'completed' },
    })

    // Auto-close active polls in this session
    await tx.poll.updateMany({
      where: { sessionId, status: 'active' },
      data: { status: 'closed' },
    })

    // Archive the session (also end it if still active)
    return tx.classSession.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        archivedAt: new Date(),
        endedAt: session.endedAt ?? new Date(),
      },
    })
  })
}

/**
 * Unarchive a session by clearing archivedAt.
 * Session returns to the main list as "ended" (activities remain in their final states).
 * Verifies teacher ownership and that session is currently archived.
 * Throws if session not found, unauthorized, or not archived.
 */
export async function unarchiveSession(sessionId: string, teacherId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId, archivedAt: { not: null } },
  })

  if (!session) {
    throw new Error('Session not found, unauthorized, or not archived')
  }

  return prisma.classSession.update({
    where: { id: sessionId },
    data: { archivedAt: null },
  })
}

/**
 * Permanently delete an archived session with full cascade.
 * ONLY archived sessions can be permanently deleted (two-step safety net).
 * Brackets and polls have optional sessionId with NO cascade delete,
 * so they must be explicitly deleted to avoid orphaned records.
 * Verifies teacher ownership and archived status.
 * Throws if session not found, unauthorized, or not archived.
 */
export async function deleteSessionPermanently(
  sessionId: string,
  teacherId: string
) {
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, teacherId, archivedAt: { not: null } },
  })

  if (!session) {
    throw new Error('Session not found, unauthorized, or not archived')
  }

  return prisma.$transaction(async (tx) => {
    // 1. Delete brackets in this session (cascades to entrants, matchups, votes, predictions)
    const brackets = await tx.bracket.findMany({
      where: { sessionId },
      select: { id: true },
    })
    for (const bracket of brackets) {
      await tx.bracket.delete({ where: { id: bracket.id } })
    }

    // 2. Delete polls in this session (cascades to options, poll_votes)
    const polls = await tx.poll.findMany({
      where: { sessionId },
      select: { id: true },
    })
    for (const poll of polls) {
      await tx.poll.delete({ where: { id: poll.id } })
    }

    // 3. Delete the session (cascades to student_participants -> votes, poll_votes, predictions)
    await tx.classSession.delete({ where: { id: sessionId } })
  })
}

/**
 * Get all archived sessions for a teacher with optional name search.
 * Sorted by archive date, newest first.
 * Includes counts for participants, brackets, and polls for card info density.
 */
export async function getArchivedSessions(
  teacherId: string,
  search?: string
) {
  return prisma.classSession.findMany({
    where: {
      teacherId,
      archivedAt: { not: null },
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { archivedAt: 'desc' },
    include: {
      _count: {
        select: { participants: true, brackets: true, polls: true },
      },
    },
  })
}

/**
 * Get a session with its brackets, polls, and participants.
 * Used by the session workspace page to render all tabs.
 * Verifies teacher ownership. Returns null if not found/unauthorized.
 */
export async function getSessionWithActivities(
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
        where: { firstName: { not: '' } },
        orderBy: { createdAt: 'asc' },
      },
      brackets: {
        where: { status: { not: 'archived' } },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { entrants: true } },
        },
      },
      polls: {
        where: { status: { not: 'archived' } },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { votes: true } },
        },
      },
      _count: {
        select: { participants: true, brackets: true, polls: true },
      },
    },
  })
}

/**
 * Migrate orphan brackets and polls (sessionId = null) to an auto-created "General" session.
 * Idempotent: safe to call multiple times. Reuses existing "General" session if present.
 * Returns the General session if orphans were found, or null if no orphans.
 */
export async function migrateOrphanActivities(teacherId: string) {
  const [orphanBrackets, orphanPolls] = await Promise.all([
    prisma.bracket.findMany({
      where: { teacherId, sessionId: null },
      select: { id: true },
    }),
    prisma.poll.findMany({
      where: { teacherId, sessionId: null },
      select: { id: true },
    }),
  ])

  if (orphanBrackets.length === 0 && orphanPolls.length === 0) {
    return null
  }

  // Find or create "General" session for this teacher
  let generalSession = await prisma.classSession.findFirst({
    where: { teacherId, name: 'General' },
  })
  if (!generalSession) {
    generalSession = await createClassSession(teacherId, 'General')
  }

  // Assign all orphans to the General session
  await prisma.$transaction([
    prisma.bracket.updateMany({
      where: { teacherId, sessionId: null },
      data: { sessionId: generalSession.id },
    }),
    prisma.poll.updateMany({
      where: { teacherId, sessionId: null },
      data: { sessionId: generalSession.id },
    }),
  ])

  return generalSession
}
