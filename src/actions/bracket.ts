'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  createBracketDAL,
  updateBracketStatusDAL,
  updateBracketEntrantsDAL,
  deleteBracketDAL,
  getTeacherBracketCounts,
  renameBracketDAL,
  duplicateBracketDAL,
  archiveBracketDAL,
  unarchiveBracketDAL,
  deleteBracketPermanentlyDAL,
} from '@/lib/dal/bracket'
import { wireMatchupAdvancement } from '@/lib/dal/sports'
import {
  createBracketSchema,
  entrantSchema,
  updateBracketStatusSchema,
  updateEntrantsSchema,
  deleteBracketSchema,
  updateBracketViewingModeSchema,
  updateBracketSettingsSchema,
} from '@/lib/utils/validation'
import {
  canCreateBracket,
  canCreateLiveBracket,
  canCreateDraftBracket,
  canUseBracketType,
  canUseEntrantCount,
} from '@/lib/gates/features'
import type { SubscriptionTier } from '@/lib/gates/tiers'
import { broadcastActivityUpdate, broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Combined schema for bracket creation with entrants
const createBracketWithEntrantsSchema = z.object({
  bracket: createBracketSchema,
  entrants: z.array(entrantSchema),
})

/**
 * Create a new bracket with entrants and generated matchup structure.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function createBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = createBracketWithEntrantsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: 'Invalid bracket data',
      issues: parsed.error.issues,
    }
  }

  const { bracket: bracketData, entrants } = parsed.data

  // Validate entrants count matches bracket size
  if (entrants.length !== bracketData.size) {
    return {
      error: `Expected ${bracketData.size} entrants, got ${entrants.length}`,
    }
  }

  // Feature gate checks (server-side enforcement)
  const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
  const counts = await getTeacherBracketCounts(teacher.id)

  // Check total bracket limit
  const totalCheck = canCreateBracket(tier, counts.total)
  if (!totalCheck.allowed) {
    return { error: totalCheck.reason }
  }

  // Check draft bracket limit (new brackets are always created as draft)
  const draftCheck = canCreateDraftBracket(tier, counts.draft)
  if (!draftCheck.allowed) {
    return { error: draftCheck.reason }
  }

  // Check bracket type gate (server-side enforcement)
  const typeCheck = canUseBracketType(tier, bracketData.bracketType)
  if (!typeCheck.allowed) {
    return { error: typeCheck.reason }
  }

  // Check entrant count
  const entrantCheck = canUseEntrantCount(tier, bracketData.size)
  if (!entrantCheck.allowed) {
    return { error: entrantCheck.reason }
  }

  try {
    const result = await createBracketDAL(teacher.id, bracketData, entrants)

    if (result && 'error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')

    return {
      bracket: result ? { id: result.id, name: result.name } : null,
    }
  } catch (err) {
    console.error('createBracket failed:', err)
    return { error: 'Failed to create bracket' }
  }
}

/**
 * Update a bracket's status (forward-only transitions).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function updateBracketStatus(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updateBracketStatusSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: 'Invalid status update data',
      issues: parsed.error.issues,
    }
  }

  // Feature gate: check live bracket limit when activating (draft -> active)
  if (parsed.data.status === 'active') {
    const tier = (teacher.subscriptionTier ?? 'free') as SubscriptionTier
    const counts = await getTeacherBracketCounts(teacher.id)
    const liveCheck = canCreateLiveBracket(tier, counts.live)
    if (!liveCheck.allowed) {
      return { error: liveCheck.reason }
    }
  }

  try {
    // Read old status before transition (needed for resume detection)
    const bracketBefore = await prisma.bracket.findFirst({
      where: { id: parsed.data.bracketId, teacherId: teacher.id },
      select: { status: true, sessionId: true },
    })

    const result = await updateBracketStatusDAL(
      parsed.data.bracketId,
      teacher.id,
      parsed.data.status
    )

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')
    revalidatePath(`/brackets/${parsed.data.bracketId}`)

    // Dual-channel broadcast: notify session activity channel (Phase 21 pattern)
    // This enables useRealtimeActivities on student dashboard to auto-update
    if (['active', 'completed'].includes(parsed.data.status)) {
      const bracket = await prisma.bracket.findUnique({
        where: { id: parsed.data.bracketId },
        select: { sessionId: true },
      })
      if (bracket?.sessionId) {
        broadcastActivityUpdate(bracket.sessionId).catch(console.error)
      }
    }

    // Broadcast pause/resume events to bracket channel + activity channel
    if (parsed.data.status === 'paused') {
      broadcastBracketUpdate(parsed.data.bracketId, 'bracket_paused', {}).catch(console.error)
      if (bracketBefore?.sessionId) {
        broadcastActivityUpdate(bracketBefore.sessionId).catch(console.error)
      }
    }

    if (parsed.data.status === 'active' && bracketBefore?.status === 'paused') {
      broadcastBracketUpdate(parsed.data.bracketId, 'bracket_resumed', {}).catch(console.error)
      if (bracketBefore.sessionId) {
        broadcastActivityUpdate(bracketBefore.sessionId).catch(console.error)
      }
    }

    return { success: true }
  } catch {
    return { error: 'Failed to update bracket status' }
  }
}

/**
 * Replace all entrants in a draft bracket and regenerate matchups.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function updateBracketEntrants(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updateEntrantsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: 'Invalid entrants data',
      issues: parsed.error.issues,
    }
  }

  try {
    const result = await updateBracketEntrantsDAL(
      parsed.data.bracketId,
      teacher.id,
      parsed.data.entrants
    )

    if (result && 'error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${parsed.data.bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to update bracket entrants' }
  }
}

/**
 * Assign (or unassign) a bracket to a class session.
 * Auth -> validate -> ownership check -> update -> revalidate -> return
 */
export async function assignBracketToSession(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const schema = z.object({
    bracketId: z.string().uuid(),
    sessionId: z.string().uuid().nullable(),
  })

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  const { bracketId, sessionId } = parsed.data

  try {
    // Verify bracket ownership
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, teacherId: teacher.id },
      select: { id: true },
    })
    if (!bracket) {
      return { error: 'Bracket not found or not owned by you' }
    }

    // If assigning, verify session ownership
    if (sessionId) {
      const session = await prisma.classSession.findFirst({
        where: { id: sessionId, teacherId: teacher.id },
        select: { id: true },
      })
      if (!session) {
        return { error: 'Session not found or not owned by you' }
      }
    }

    await prisma.bracket.update({
      where: { id: bracketId },
      data: { sessionId },
    })

    revalidatePath('/brackets')
    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch (err) {
    console.error('Failed to assign bracket to session:', err)
    return { error: 'Failed to assign bracket to session' }
  }
}

/**
 * Delete a bracket and all associated entrants and matchups.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function deleteBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = deleteBracketSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: 'Invalid delete data',
      issues: parsed.error.issues,
    }
  }

  // Read sessionId BEFORE delete (cascade removes the row)
  const bracket = await prisma.bracket.findFirst({
    where: { id: parsed.data.bracketId, teacherId: teacher.id },
    select: { sessionId: true },
  })
  const preDeleteSessionId = bracket?.sessionId

  try {
    const result = await deleteBracketDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')

    // Broadcast removal to students
    if (preDeleteSessionId) {
      broadcastActivityUpdate(preDeleteSessionId).catch(console.error)
    }

    return { success: true }
  } catch {
    return { error: 'Failed to delete bracket' }
  }
}

// Schema for renaming a bracket
const renameBracketSchema = z.object({
  bracketId: z.string().uuid(),
  name: z.string().min(1).max(200),
})

/**
 * Rename a bracket.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function renameBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = renameBracketSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid rename data', issues: parsed.error.issues }
  }

  try {
    const result = await renameBracketDAL(
      parsed.data.bracketId,
      teacher.id,
      parsed.data.name
    )

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')
    revalidatePath('/dashboard')

    return { success: true }
  } catch {
    return { error: 'Failed to rename bracket' }
  }
}

// Schema for duplicating a bracket
const duplicateBracketInputSchema = z.object({
  bracketId: z.string().uuid(),
})

/**
 * Duplicate a bracket with entrants (not matchups/votes).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function duplicateBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = duplicateBracketInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  try {
    const result = await duplicateBracketDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')

    return { bracket: { id: result.id } }
  } catch {
    return { error: 'Failed to duplicate bracket' }
  }
}

// Schema for archiving a bracket
const archiveBracketInputSchema = z.object({
  bracketId: z.string().uuid(),
})

/**
 * Archive a bracket.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function archiveBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = archiveBracketInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  try {
    const result = await archiveBracketDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')
    revalidatePath('/dashboard')

    // Read sessionId from the archived bracket for student broadcast
    const archivedBracket = await prisma.bracket.findUnique({
      where: { id: parsed.data.bracketId },
      select: { sessionId: true },
    })
    if (archivedBracket?.sessionId) {
      broadcastActivityUpdate(archivedBracket.sessionId).catch(console.error)
    }

    return { success: true }
  } catch {
    return { error: 'Failed to archive bracket' }
  }
}

// Schema for unarchiving a bracket
const unarchiveBracketInputSchema = z.object({
  bracketId: z.string().uuid(),
})

/**
 * Unarchive a bracket (recover from archive).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function unarchiveBracket(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = unarchiveBracketInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  try {
    const result = await unarchiveBracketDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')
    revalidatePath('/brackets/archived')

    return { success: true }
  } catch {
    return { error: 'Failed to unarchive bracket' }
  }
}

// Schema for permanently deleting a bracket
const deleteBracketPermanentlyInputSchema = z.object({
  bracketId: z.string().uuid(),
})

/**
 * Permanently delete an archived bracket.
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function deleteBracketPermanently(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = deleteBracketPermanentlyInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid data', issues: parsed.error.issues }
  }

  try {
    const result = await deleteBracketPermanentlyDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets/archived')

    return { success: true }
  } catch {
    return { error: 'Failed to permanently delete bracket' }
  }
}

/**
 * Update a bracket's viewing mode (simple/advanced).
 * Auth -> validate -> ownership check -> update -> broadcast -> revalidate -> return
 *
 * Works on all bracket states (draft, active, paused, completed) since
 * viewing mode is a display-only setting that doesn't affect bracket integrity.
 * No auto-adjustment of other settings when switching modes.
 */
export async function updateBracketViewingMode(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updateBracketViewingModeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid viewing mode data', issues: parsed.error.issues }
  }

  const { bracketId, viewingMode } = parsed.data

  try {
    // Ownership check: verify bracket belongs to this teacher
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { teacherId: true },
    })
    if (!bracket || bracket.teacherId !== teacher.id) {
      return { error: 'Bracket not found' }
    }

    // Update viewingMode in database
    await prisma.bracket.update({
      where: { id: bracketId },
      data: { viewingMode },
    })

    // Broadcast settings_changed event to connected students
    await broadcastBracketUpdate(bracketId, 'settings_changed', { viewingMode })

    // Revalidate paths
    revalidatePath('/activities')
    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to update bracket viewing mode' }
  }
}

/**
 * Update one or more bracket display settings (viewingMode, showSeedNumbers, showVoteCounts).
 * Consolidated action replacing per-field updates.
 * Auth -> validate -> ownership check -> update -> broadcast -> revalidate -> return
 */
export async function updateBracketSettings(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updateBracketSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid settings data', issues: parsed.error.issues }
  }

  const { bracketId, viewingMode, showSeedNumbers, showVoteCounts, finalFourPairing } = parsed.data

  try {
    // Ownership check: verify bracket belongs to this teacher
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { teacherId: true },
    })
    if (!bracket || bracket.teacherId !== teacher.id) {
      return { error: 'Bracket not found' }
    }

    // Build update data from only the defined (non-undefined) fields
    const updateData: Record<string, unknown> = {}
    if (viewingMode !== undefined) updateData.viewingMode = viewingMode
    if (showSeedNumbers !== undefined) updateData.showSeedNumbers = showSeedNumbers
    if (showVoteCounts !== undefined) updateData.showVoteCounts = showVoteCounts
    if (finalFourPairing !== undefined) updateData.finalFourPairing = finalFourPairing

    // Update database
    await prisma.bracket.update({
      where: { id: bracketId },
      data: updateData,
    })

    // Broadcast settings_changed event to connected students
    await broadcastBracketUpdate(bracketId, 'settings_changed', updateData)

    // Revalidate paths
    revalidatePath('/activities')
    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to update bracket settings' }
  }
}

/**
 * Repair nextMatchupId linkage for an existing sports bracket.
 * Uses position-based algorithm to compute correct advancement paths.
 * Auth -> validate -> ownership check -> repair -> return
 */
export async function repairBracketLinkage(bracketId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  // Validate bracketId format
  const parsed = z.string().uuid().safeParse(bracketId)
  if (!parsed.success) {
    return { error: 'Invalid bracket ID' }
  }

  try {
    // Verify bracket ownership and type
    const bracket = await prisma.bracket.findFirst({
      where: {
        id: bracketId,
        teacherId: teacher.id,
        bracketType: 'sports',
      },
      select: { id: true, finalFourPairing: true },
    })

    if (!bracket) {
      return { error: 'Sports bracket not found or not owned by you' }
    }

    // Run position-based linkage repair (no transaction — uses prisma directly)
    await wireMatchupAdvancement(bracketId, undefined, bracket.finalFourPairing)

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch (err) {
    console.error('repairBracketLinkage failed:', err)
    return { error: 'Failed to repair bracket linkage' }
  }
}
