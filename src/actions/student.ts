'use server'

import { z } from 'zod'
import {
  findActiveSessionByCode,
  findSessionByCode,
} from '@/lib/dal/class-session'
import {
  findParticipantByDevice,
  findParticipantByRecoveryCode,
  findParticipantsByFirstName,
  createParticipant,
  findReturningStudent,
  createReturningParticipant,
  updateParticipantDevice,
  updateFirstName,
  updateLastSeen,
  rerollParticipantName,
  generateRecoveryCode as generateRecoveryCodeDAL,
} from '@/lib/dal/student-session'
import { broadcastParticipantJoined } from '@/lib/realtime/broadcast'
import { firstNameSchema } from '@/lib/validations/first-name'
import { lastInitialSchema } from '@/lib/validations/last-initial'
import type {
  JoinResult,
  LookupResult,
  StudentParticipantData,
} from '@/types/student'

// --- Validation Schemas ---

const joinSessionSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
  deviceId: z.string().min(1, 'Device ID is required'),
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

const completeWizardSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  firstName: firstNameSchema,
  lastInitial: lastInitialSchema,
  emoji: z.string().min(1, 'Emoji is required'),
})

const createWizardSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
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
 * Two-step identity matching:
 * 1. deviceId (localStorage UUID) -- per-Chrome-profile
 * 2. Create new participant -- first-time student
 *
 * No authentication required -- students are anonymous.
 */
export async function joinSession(input: {
  code: string
  deviceId: string
}): Promise<JoinResult> {
  // Validate input
  const parsed = joinSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, deviceId } = parsed.data

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

  // Step 3: New student -- create participant
  const participant = await createParticipant(
    session.id,
    deviceId
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
 * Name-based identity flow:
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

// --- Cross-Session Identity Reclaim Actions ---

const lookupStudentSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Class code must be exactly 6 digits'),
  firstName: firstNameSchema,
  lastInitial: lastInitialSchema,
})

/**
 * Look up a returning student by firstName + lastInitial across all of a
 * teacher's non-archived sessions.
 *
 * - Zero matches: return { isNew: true } so UI can proceed with new student wizard
 * - One match: auto-reclaim silently (create participant in current session with matched identity)
 * - Multiple matches: return deduplicated candidates for disambiguation
 *
 * No authentication required -- students are anonymous.
 */
export async function lookupStudent(input: {
  code: string
  firstName: string
  lastInitial: string
}): Promise<LookupResult> {
  // Validate input
  const parsed = lookupStudentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { code, firstName, lastInitial } = parsed.data

  // Find session by code (any status, to handle ended)
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

  // If session ended, return flag for results UI
  if (session.status === 'ended') {
    return { session: sessionInfo, sessionEnded: true }
  }

  // Search across all of this teacher's non-archived sessions
  const matches = await findReturningStudent(
    session.teacherId,
    firstName,
    lastInitial
  )

  // Zero matches -- new student
  if (matches.length === 0) {
    return { isNew: true, session: sessionInfo }
  }

  // Check if any match is already in the current session — return directly
  const currentSessionMatch = matches.find((m) => m.sessionId === session.id)
  if (currentSessionMatch) {
    const { prisma } = await import('@/lib/prisma')
    // Fetch full participant data for the existing participant
    const existing = await prisma.studentParticipant.findUnique({
      where: { id: currentSessionMatch.id },
    })
    if (existing) {
      broadcastParticipantJoined(session.id).catch(() => {})
      return {
        participant: toParticipantData(existing),
        session: sessionInfo,
        returning: true,
      }
    }
  }

  // Filter out current-session matches for cross-session reclaim logic
  const crossSessionMatches = matches.filter((m) => m.sessionId !== session.id)

  // If no cross-session matches remain, treat as already-in-session
  if (crossSessionMatches.length === 0) {
    return { isNew: true, session: sessionInfo }
  }

  // One match -- auto-reclaim silently
  if (crossSessionMatches.length === 1) {
    const match = crossSessionMatches[0]
    const newParticipant = await createReturningParticipant(
      session.id,
      { funName: match.funName, emoji: match.emoji },
      firstName,
      lastInitial,
      null
    )
    broadcastParticipantJoined(session.id).catch(() => {})
    return {
      participant: toParticipantData(newParticipant),
      session: sessionInfo,
      returning: true,
    }
  }

  // Multiple matches -- deduplicate by funName+emoji and return candidates
  const seen = new Set<string>()
  const uniqueMatches = crossSessionMatches.filter((m) => {
    const key = `${m.funName}|${m.emoji ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // After dedup, if only one unique identity remains, auto-reclaim
  if (uniqueMatches.length === 1) {
    const match = uniqueMatches[0]
    const newParticipant = await createReturningParticipant(
      session.id,
      { funName: match.funName, emoji: match.emoji },
      firstName,
      lastInitial,
      null
    )
    broadcastParticipantJoined(session.id).catch(() => {})
    return {
      participant: toParticipantData(newParticipant),
      session: sessionInfo,
      returning: true,
    }
  }

  return {
    candidates: uniqueMatches.map((m) => ({
      id: m.id,
      funName: m.funName,
      emoji: m.emoji,
    })),
    session: sessionInfo,
    allowNew: true,
  }
}

// --- Disambiguation Claim Action ---

const claimReturningSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  sessionCode: z.string().regex(/^\d{6}$/, 'Session code must be exactly 6 digits'),
  firstName: firstNameSchema,
  lastInitial: lastInitialSchema,
})

/**
 * Claim a returning student identity during disambiguation.
 *
 * When lookupStudent returns multiple candidates, the student picks one
 * ("That's me"). This action creates a new participant in the current
 * session with the selected identity's funName + emoji.
 *
 * Security: verifies the source participant belongs to one of this
 * teacher's sessions (prevents cross-teacher identity theft).
 *
 * No authentication required -- students are anonymous.
 */
export async function claimReturningIdentity(input: {
  participantId: string
  sessionCode: string
  firstName: string
  lastInitial: string
}): Promise<LookupResult> {
  // Validate input
  const parsed = claimReturningSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { participantId, sessionCode, firstName, lastInitial } = parsed.data

  // Find session by code
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

  // If session ended, reject
  if (session.status === 'ended') {
    return { error: 'Session has ended' }
  }

  // Look up the source participant to get their funName + emoji
  const { prisma } = await import('@/lib/prisma')
  const source = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
    include: {
      session: {
        select: { teacherId: true },
      },
    },
  })

  if (!source) {
    return { error: 'Participant not found' }
  }

  // Security: verify source belongs to same teacher
  if (source.session.teacherId !== session.teacherId) {
    return { error: 'Participant does not belong to this teacher' }
  }

  // Create participant in current session with the selected identity
  const newParticipant = await createReturningParticipant(
    session.id,
    { funName: source.funName, emoji: source.emoji },
    firstName,
    lastInitial,
    null
  )

  broadcastParticipantJoined(session.id).catch(() => {})

  return {
    participant: toParticipantData(newParticipant),
    session: sessionInfo,
    returning: true,
  }
}

// --- localStorage Auto-Rejoin Action ---

const rejoinStoredSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
})

/**
 * Rejoin a session using a stored localStorage identity.
 *
 * Verifies the participant still exists, belongs to the requested session,
 * is not banned, and the session is not archived. Updates lastSeenAt on
 * successful rejoin.
 *
 * No authentication required -- students are anonymous.
 */
export async function rejoinWithStoredIdentity(input: {
  participantId: string
  sessionId: string
}): Promise<JoinResult> {
  const parsed = rejoinStoredSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { participantId, sessionId } = parsed.data

  try {
    const { prisma } = await import('@/lib/prisma')
    const participant = await prisma.studentParticipant.findUnique({
      where: { id: participantId },
      include: {
        session: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            archivedAt: true,
            teacher: { select: { name: true } },
          },
        },
      },
    })

    if (!participant || participant.sessionId !== sessionId) {
      return { error: 'identity_not_found' }
    }

    if (participant.banned) {
      return { error: 'You have been removed from this session' }
    }

    if (participant.session.archivedAt) {
      return { error: 'This session has been archived' }
    }

    await updateLastSeen(participant.id)

    const sessionInfo = {
      id: participant.session.id,
      code: participant.session.code,
      name: participant.session.name,
      status: participant.session.status,
      teacherName: participant.session.teacher.name,
    }

    return {
      participant: toParticipantData(participant),
      session: sessionInfo,
      returning: true,
    }
  } catch {
    return { error: 'identity_not_found' }
  }
}

// --- Teacher Actions ---

/**
 * Teacher-initiated student name update.
 *
 * Auth: requires authenticated teacher who owns the session.
 * Broadcasts participant update so student sees the change in real time.
 */
export async function teacherUpdateStudentName(input: {
  participantId: string
  firstName: string
}): Promise<{ error?: string; success?: boolean }> {
  const { getAuthenticatedTeacher } = await import('@/lib/dal/auth')
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  // Validate firstName
  const result = firstNameSchema.safeParse(input.firstName)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { prisma } = await import('@/lib/prisma')
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: input.participantId },
    include: { session: { select: { teacherId: true, id: true } } },
  })

  if (!participant) {
    return { error: 'Participant not found' }
  }

  if (participant.session.teacherId !== teacher.id) {
    return { error: 'Not authorized to edit this student' }
  }

  await prisma.studentParticipant.update({
    where: { id: input.participantId },
    data: { firstName: result.data },
  })

  // Broadcast so student sees update in real time
  broadcastParticipantJoined(participant.session.id).catch(() => {})

  return { success: true }
}

// --- Wizard Actions ---

/**
 * Create a new participant with empty firstName for the join wizard.
 * The wizard collects profile info (name, initial, emoji) in later steps.
 *
 * No authentication required -- students are anonymous.
 */
export async function createWizardParticipant(input: {
  code: string
}): Promise<JoinResult> {
  const parsed = createWizardSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const session = await findSessionByCode(parsed.data.code)
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

  if (session.status === 'ended') {
    return { session: sessionInfo, sessionEnded: true }
  }

  const participant = await createParticipant(session.id, null, '')
  broadcastParticipantJoined(session.id).catch(() => {})

  return {
    participant: toParticipantData(participant),
    session: sessionInfo,
    returning: false,
  }
}

/**
 * Complete a wizard participant's profile with firstName, lastInitial, and emoji.
 * Called at the end of the new-student wizard after all steps are collected.
 *
 * No authentication required -- students are anonymous.
 */
export async function completeWizardProfile(input: {
  participantId: string
  firstName: string
  lastInitial: string
  emoji: string
}): Promise<{ participant?: StudentParticipantData; error?: string }> {
  const parsed = completeWizardSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { participantId, firstName, lastInitial, emoji } = parsed.data

  try {
    const { prisma } = await import('@/lib/prisma')
    const updated = await prisma.studentParticipant.update({
      where: { id: participantId },
      data: { firstName, lastInitial, emoji },
    })
    return { participant: toParticipantData(updated) }
  } catch {
    return { error: 'Failed to update profile' }
  }
}

// --- Emoji Migration Action ---

/**
 * Set the emoji for an existing participant (one-time migration).
 *
 * Validates that the emoji shortcode is in the EMOJI_POOL.
 * No authentication required -- students are anonymous.
 */
export async function setParticipantEmoji(
  participantId: string,
  emoji: string
): Promise<{ error?: string; success?: boolean }> {
  // Validate emoji is in pool
  const { EMOJI_POOL } = await import('@/lib/student/emoji-pool')
  const valid = EMOJI_POOL.some((e) => e.shortcode === emoji)
  if (!valid) {
    return { error: 'Invalid emoji selection' }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.studentParticipant.update({
      where: { id: participantId },
      data: { emoji },
    })
    return { success: true }
  } catch {
    return { error: 'Failed to set emoji' }
  }
}
