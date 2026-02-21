'use server'

import { z } from 'zod'
import { findActiveSessionByCode } from '@/lib/dal/class-session'
import {
  findParticipantByDevice,
  findParticipantByFingerprint,
  findParticipantByRecoveryCode,
  createParticipant,
  updateParticipantDevice,
  rerollParticipantName,
  generateRecoveryCode as generateRecoveryCodeDAL,
} from '@/lib/dal/student-session'
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

// --- Helper ---

function toParticipantData(p: {
  id: string
  firstName: string
  funName: string
  rerollUsed: boolean
  recoveryCode: string | null
  sessionId: string
}): StudentParticipantData {
  return {
    id: p.id,
    firstName: p.firstName,
    funName: p.funName,
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
