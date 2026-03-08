import { prisma } from '@/lib/prisma'
import { generateFunName } from '@/lib/student/fun-names'
import { nanoid } from 'nanoid'

/**
 * Find a participant by their device ID within a session.
 * Uses the @@unique([sessionId, deviceId]) compound index.
 * Returns null if no match found.
 */
export async function findParticipantByDevice(
  sessionId: string,
  deviceId: string
) {
  return prisma.studentParticipant.findUnique({
    where: {
      sessionId_deviceId: { sessionId, deviceId },
    },
  })
}

/**
 * Find a non-banned participant by fingerprint within a session.
 * This is the secondary identity lookup when localStorage was cleared
 * but the browser fingerprint still matches.
 * Returns null if no match found.
 */
export async function findParticipantByFingerprint(
  sessionId: string,
  fingerprint: string
) {
  return prisma.studentParticipant.findFirst({
    where: {
      sessionId,
      fingerprint,
      banned: false,
    },
  })
}

/**
 * Find a participant by their recovery code.
 * Includes the session for context when restoring identity on a new device.
 * Returns null if code is invalid.
 */
export async function findParticipantByRecoveryCode(recoveryCode: string) {
  return prisma.studentParticipant.findFirst({
    where: { recoveryCode },
    include: { session: true },
  })
}

/**
 * Create a new participant in a session with a unique alliterative fun name.
 * Fetches existing names in the session to ensure uniqueness.
 * deviceId accepts null for name-based join flow (no device fingerprinting).
 * lastInitial and emoji are optional for backward compatibility.
 */
export async function createParticipant(
  sessionId: string,
  deviceId: string | null,
  fingerprint?: string,
  firstName: string = '',
  lastInitial: string | null = null,
  emoji: string | null = null
) {
  // Fetch existing fun names for this session
  const existing = await prisma.studentParticipant.findMany({
    where: { sessionId },
    select: { funName: true },
  })
  const existingNames = new Set(existing.map((p) => p.funName))

  const funName = generateFunName(existingNames)

  return prisma.studentParticipant.create({
    data: {
      sessionId,
      funName,
      firstName,
      deviceId,
      fingerprint: fingerprint ?? null,
      lastInitial,
      emoji,
    },
  })
}

/**
 * Update a participant's device ID.
 * Used when localStorage was cleared but the fingerprint matched,
 * so the student gets re-associated with a new device ID.
 * Also updates lastSeenAt.
 */
export async function updateParticipantDevice(
  participantId: string,
  deviceId: string
) {
  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: {
      deviceId,
      lastSeenAt: new Date(),
    },
  })
}

/**
 * Reroll a participant's fun name (single-use).
 * Generates a new unique name within the session and marks reroll as used.
 * Throws if the participant has already used their reroll.
 */
export async function rerollParticipantName(participantId: string) {
  const participant = await prisma.studentParticipant.findUniqueOrThrow({
    where: { id: participantId },
  })

  if (participant.rerollUsed) {
    throw new Error('Reroll already used')
  }

  // Fetch existing fun names for this session
  const existing = await prisma.studentParticipant.findMany({
    where: { sessionId: participant.sessionId },
    select: { funName: true },
  })
  const existingNames = new Set(existing.map((p) => p.funName))

  const newFunName = generateFunName(existingNames)

  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: {
      funName: newFunName,
      rerollUsed: true,
    },
  })
}

/**
 * Generate or retrieve a recovery code for a participant.
 * If a recovery code already exists, returns the existing one.
 * Otherwise generates a new 8-character uppercase alphanumeric code.
 */
export async function generateRecoveryCode(
  participantId: string
): Promise<string> {
  const participant = await prisma.studentParticipant.findUniqueOrThrow({
    where: { id: participantId },
  })

  if (participant.recoveryCode) {
    return participant.recoveryCode
  }

  const recoveryCode = nanoid(8).toUpperCase()

  await prisma.studentParticipant.update({
    where: { id: participantId },
    data: { recoveryCode },
  })

  return recoveryCode
}

/**
 * Ban a participant from the session.
 * Banned participants are rejected when they try to rejoin.
 */
export async function banParticipant(participantId: string) {
  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: { banned: true },
  })
}

/**
 * Remove a participant from the session entirely.
 * Deletes the record from the database.
 */
export async function removeParticipant(participantId: string): Promise<void> {
  await prisma.studentParticipant.delete({
    where: { id: participantId },
  })
}

/**
 * Find non-banned participants by first name within a session.
 * Uses case-insensitive matching so "alice", "Alice", and "ALICE" all match.
 * Returns id, firstName, and funName for disambiguation UI.
 */
export async function findParticipantsByFirstName(
  sessionId: string,
  firstName: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      sessionId,
      firstName: { equals: firstName, mode: 'insensitive' },
      banned: false,
    },
    select: { id: true, firstName: true, funName: true, emoji: true },
  })
}

/**
 * Update a participant's first name.
 * Returns the updated participant record.
 */
export async function updateFirstName(
  participantId: string,
  firstName: string
) {
  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: { firstName },
  })
}

/**
 * Update a participant's lastSeenAt timestamp to now.
 * Used when a student reclaims their identity.
 */
export async function updateLastSeen(participantId: string) {
  return prisma.studentParticipant.update({
    where: { id: participantId },
    data: { lastSeenAt: new Date() },
  })
}

/**
 * Find returning students by firstName + lastInitial across ALL of a teacher's
 * non-archived sessions. Used for cross-device identity reclaim.
 *
 * Returns matches ordered by lastSeenAt desc (most recent first) so the
 * "latest emoji wins" for auto-reclaim on single match.
 */
export async function findReturningStudent(
  teacherId: string,
  firstName: string,
  lastInitial: string
) {
  return prisma.studentParticipant.findMany({
    where: {
      firstName: { equals: firstName, mode: 'insensitive' },
      lastInitial: { equals: lastInitial, mode: 'insensitive' },
      banned: false,
      session: {
        teacherId,
        archivedAt: null,
      },
    },
    select: {
      id: true,
      funName: true,
      emoji: true,
      sessionId: true,
      lastSeenAt: true,
    },
    orderBy: { lastSeenAt: 'desc' },
  })
}

/**
 * Create a returning participant in a target session, copying the identity
 * (funName + emoji) from a previous session's participant.
 *
 * Handles funName collision within the target session by generating a new name.
 */
export async function createReturningParticipant(
  sessionId: string,
  source: { funName: string; emoji: string | null },
  firstName: string,
  lastInitial: string,
  deviceId: string | null
) {
  // Fetch existing fun names for this session to check collision
  const existing = await prisma.studentParticipant.findMany({
    where: { sessionId },
    select: { funName: true },
  })
  const existingNames = new Set(existing.map((p) => p.funName))

  // Use original funName if available, generate new if collision
  const funName = existingNames.has(source.funName)
    ? generateFunName(existingNames)
    : source.funName

  return prisma.studentParticipant.create({
    data: {
      sessionId,
      funName,
      firstName,
      lastInitial,
      emoji: source.emoji,
      deviceId,
      fingerprint: null,
    },
  })
}
