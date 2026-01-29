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
 */
export async function createParticipant(
  sessionId: string,
  deviceId: string,
  fingerprint?: string
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
      deviceId,
      fingerprint: fingerprint ?? null,
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
