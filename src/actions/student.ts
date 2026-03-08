'use server'

import { z } from 'zod'
import {
  findActiveSessionByCode,
  findSessionByCode,
} from '@/lib/dal/class-session'
import {
  findParticipantByDevice,
  findParticipantByFingerprint,
  findParticipantByRecoveryCode,
  findParticipantsByFirstName,
  createParticipant,
  updateParticipantDevice,
  updateFirstName,
  updateLastSeen,
  rerollParticipantName,
  generateRecoveryCode as generateRecoveryCodeDAL,
} from '@/lib/dal/student-session'
import { broadcastParticipantJoined } from '@/lib/realtime/broadcast'
import { firstNameSchema } from '@/lib/validations/first-name'
import type {
  JoinResult,
  StudentParticipantData,
} from '@/types/student'

// --- Validation Schemas ---

const joinSessionSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
  deviceId: z.string().min(1, 'Device ID is required'),
  fingerprint: z.string().optional(),
})

const recoverIdentitySchema = z.object({
  recoveryCode: z.string().min(1, 'Recovery code is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
})

const joinByNameSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
  firstName: firstNameSchema,
})

const claimIdentitySchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  sessionCode: z.string().regex(/^\d{6}$/, 'Session code must be exactly 6 digits'),
})

const updateNameSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  firstName: firstNameSchema,
})

// --- Helper ---

function toParticipantData(p: {
  id: string
  firstName: string
  funName: string
  emoji?: string | null
  lastInitial?: string | null
  rerollUsed: boolean
  recoveryCode: string | null
  sessionId: string
}): StudentParticipantData {
  return {
    id: p.id,
    firstName: p.firstName,
    funName: p.funName,
    emoji: p.emoji ?? null,
    lastInitial: p.lastInitial ?? null,
    rerollUsed: p.rerollUsed,
    recoveryCode: p.recoveryCode,
    sessionId: p.sessionId,
  }
}

// --- Server Actions ---

/**
 * Join a class session using a 6-digit code and device identity.
 *
 * Three-layer identity matching:
 * 1. deviceId (localStorage UUID) -- most reliable, per-Chrome-profile
 * 2. fingerprint (FingerprintJS) -- fallback when localStorage cleared
 * 3. Create new participant -- first-time student
 *
 * No authentication required -- students are anonymous.
 */
export async function joinSession(input: {
  code: string
  deviceId: string
  fingerprint?: string
}): Promise<JoinResult> {
  // Validate input
  const parsed = joinSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, deviceId, fingerprint } = parsed.data

  // Step 1: Find active session by code
  const session = await findActiveSessionByCode(code)
  if (!session) {
    return { error: 'Invalid or expired class code' }
  }

  const sessionInfo = {
    id: session.id,
    code: session.code,
    name: session.name,
    status: session.status,
    teacherName: session.teacher.name,
  }

  // Step 2: Check deviceId match (primary identity)
  const byDevice = await findParticipantByDevice(session.id, deviceId)
  if (byDevice) {
    if (byDevice.banned) {
      return { error: 'You have been removed from this session' }
    }
    return {
      participant: toParticipantData(byDevice),
      session: sessionInfo,
      returning: true,
    }
  }

  // Step 3: Check fingerprint match (secondary identity)
  if (fingerprint) {
    const byFingerprint = await findParticipantByFingerprint(
      session.id,
      fingerprint
    )
    if (byFingerprint) {
      // localStorage was cleared but fingerprint matches -- update deviceId
      const updated = await updateParticipantDevice(
        byFingerprint.id,
        deviceId
      )
      return {
        participant: toParticipantData(updated),
        session: sessionInfo,
        returning: true,
      }
    }
  }

  // Step 4: New student -- create participant
  const participant = await createParticipant(
    session.id,
    deviceId,
    fingerprint
  )
  broadcastParticipantJoined(session.id).catch(() => {})
  return {
    participant: toParticipantData(participant),
    session: sessionInfo,
    returning: false,
  }
}

/**
 * Reroll the student's fun name (single-use).
 * No authentication required.
 */
export async function rerollName(
  participantId: string
): Promise<{ participant?: StudentParticipantData; error?: string }> {
  try {
    const updated = await rerollParticipantName(participantId)
    return { participant: toParticipantData(updated) }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Reroll already used'
    ) {
      return { error: 'You already used your reroll' }
    }
    return { error: 'Failed to reroll name' }
  }
}

/**
 * Get or generate a recovery code for the student.
 * No authentication required.
 */
export async function getRecoveryCode(
  participantId: string
): Promise<{ recoveryCode?: string; error?: string }> {
  try {
    const recoveryCode = await generateRecoveryCodeDAL(participantId)
    return { recoveryCode }
  } catch {
    return { error: 'Failed to generate recovery code' }
  }
}

/**
 * Recover a student's identity on a new device using a recovery code.
 * Updates the participant's deviceId to the new device and invalidates
 * the old recovery code (single-use for security).
 * No authentication required.
 */
export async function recoverIdentity(
  recoveryCode: string,
  deviceId: string
): Promise<JoinResult> {
  // Validate input
  const parsed = recoverIdentitySchema.safeParse({ recoveryCode, deviceId })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Find participant by recovery code
  const result = await findParticipantByRecoveryCode(
    parsed.data.recoveryCode
  )
  if (!result) {
    return { error: 'Invalid recovery code' }
  }

  // Update deviceId to new device
  const updated = await updateParticipantDevice(result.id, parsed.data.deviceId)

  // Build session info from the included session relation
  const sessionInfo = {
    id: result.session.id,
    code: result.session.code,
    name: result.session.name,
    status: result.session.status,
    teacherName: null, // Teacher name not included in recovery flow
  }

  return {
    participant: toParticipantData(updated),
    session: sessionInfo,
    returning: true,
  }
}

// --- Name-Based Identity Actions ---

/**
 * Join a class session using a 6-digit code and first name.
 *
 * Name-based identity flow (replaces device-fingerprint approach):
 * 1. Find session by code (active or ended)
 * 2. If ended, return sessionEnded flag so UI can show results
 * 3. If active, do case-insensitive name lookup for duplicates
 * 4. If no duplicates, create new participant
 * 5. If duplicates, return candidate list for disambiguation
 *
 * No authentication required -- students are anonymous.
 */
export async function joinSessionByName(input: {
  code: string
  firstName: string
}): Promise<JoinResult> {
  // Validate input
  const parsed = joinByNameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, firstName } = parsed.data

  // Step 1: Find session by code (any status)
  const session = await findSessionByCode(code)
  if (!session) {
    return { error: 'Invalid class code' }
  }

  const sessionInfo = {
    id: session.id,
    code: session.code,
    name: session.name,
    status: session.status,
    teacherName: session.teacher.name,
  }

  // Step 2: If session ended, return flag for results UI
  if (session.status === 'ended') {
    return {
      session: sessionInfo,
      sessionEnded: true,
    }
  }

  // Step 3: Case-insensitive name lookup
  const existing = await findParticipantsByFirstName(session.id, firstName)

  // Step 4: No matches -- create new participant (deviceId null for name-based flow)
  if (existing.length === 0) {
    const participant = await createParticipant(
      session.id,
      null,
      undefined,
      firstName
    )
    broadcastParticipantJoined(session.id).catch(() => {})
    return {
      participant: toParticipantData(participant),
      session: sessionInfo,
      returning: false,
    }
  }

  // Step 5: Duplicates found -- return candidates for disambiguation
  return {
    duplicates: existing.map((p) => ({ id: p.id, funName: p.funName, emoji: p.emoji ?? null })),
    session: sessionInfo,
  }
}

/**
 * Claim an existing participant identity during disambiguation.
 *
 * When a student's first name matches multiple participants, the UI
 * shows their fun names and lets them pick. This action reclaims
 * the selected identity.
 *
 * Security: verifies the participant belongs to the session with
 * the given code (prevents claiming participants from other sessions).
 *
 * No authentication required -- students are anonymous.
 */
export async function claimIdentity(input: {
  participantId: string
  sessionCode: string
}): Promise<JoinResult> {
  // Validate input
  const parsed = claimIdentitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { participantId, sessionCode } = parsed.data

  // Find the session by code
  const session = await findSessionByCode(sessionCode)
  if (!session) {
    return { error: 'Invalid class code' }
  }

  const sessionInfo = {
    id: session.id,
    code: session.code,
    name: session.name,
    status: session.status,
    teacherName: session.teacher.name,
  }

  // Find participant by ID and verify it belongs to this session
  const { prisma } = await import('@/lib/prisma')
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
  })

  if (!participant) {
    return { error: 'Participant not found' }
  }

  if (participant.sessionId !== session.id) {
    return { error: 'Participant does not belong to this session' }
  }

  if (participant.banned) {
    return { error: 'You have been removed from this session' }
  }

  // Update lastSeenAt
  const updated = await updateLastSeen(participantId)

  return {
    participant: toParticipantData(updated),
    session: sessionInfo,
    returning: true,
  }
}

/**
 * Update a participant's first name.
 *
 * Validates the new name and checks for collisions within the session.
 * If another (non-self) participant already has this name (case-insensitive),
 * returns an error.
 *
 * No authentication required -- students are anonymous.
 */
export async function updateParticipantName(input: {
  participantId: string
  firstName: string
}): Promise<{ participant?: StudentParticipantData; error?: string }> {
  // Validate input
  const parsed = updateNameSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { participantId, firstName } = parsed.data

  // Look up participant to get sessionId
  const { prisma } = await import('@/lib/prisma')
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
  })

  if (!participant) {
    return { error: 'Participant not found' }
  }

  // Check for name collision (case-insensitive, excluding self)
  const existing = await findParticipantsByFirstName(
    participant.sessionId,
    firstName
  )
  const collision = existing.some((p) => p.id !== participantId)
  if (collision) {
    return {
      error:
        'That name is already taken in this session. Try a different name.',
    }
  }

  // Update the first name
  const updated = await updateFirstName(participantId, firstName)

  return { participant: toParticipantData(updated) }
}
