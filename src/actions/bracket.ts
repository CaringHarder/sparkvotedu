'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  createBracketDAL,
  updateBracketStatusDAL,
  updateBracketEntrantsDAL,
  deleteBracketDAL,
} from '@/lib/dal/bracket'
import {
  createBracketSchema,
  entrantSchema,
  updateBracketStatusSchema,
  updateEntrantsSchema,
  deleteBracketSchema,
} from '@/lib/utils/validation'
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

  try {
    const result = await createBracketDAL(teacher.id, bracketData, entrants)

    if (result && 'error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')

    return {
      bracket: result ? { id: result.id, name: result.name } : null,
    }
  } catch {
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

  try {
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

  try {
    const result = await deleteBracketDAL(parsed.data.bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath('/brackets')

    return { success: true }
  } catch {
    return { error: 'Failed to delete bracket' }
  }
}
