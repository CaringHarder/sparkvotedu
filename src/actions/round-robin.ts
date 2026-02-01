'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  recordRoundRobinResult,
  advanceRoundRobinRound,
  getRoundRobinStandings,
} from '@/lib/dal/round-robin'
import { recordRoundRobinResultSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schema for advancing a round
const advanceRoundSchema = z.object({
  bracketId: z.string().uuid(),
  roundNumber: z.number().int().positive(),
})

/**
 * Record a round-robin matchup result (win/loss/tie).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function recordResult(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = recordRoundRobinResultSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid result data', issues: parsed.error.issues }
  }

  try {
    const result = await recordRoundRobinResult(
      parsed.data.matchupId,
      parsed.data.winnerId,
      teacher.id
    )

    if (result && 'error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${parsed.data.bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to record result' }
  }
}

/**
 * Advance a round-robin bracket to the next round (round-by-round pacing).
 * Auth -> validate -> DAL -> revalidate -> return
 */
export async function advanceRound(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = advanceRoundSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid advance data', issues: parsed.error.issues }
  }

  try {
    const result = await advanceRoundRobinRound(
      parsed.data.bracketId,
      parsed.data.roundNumber,
      teacher.id
    )

    if (result && 'error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${parsed.data.bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to advance round' }
  }
}

/**
 * Get round-robin standings for display.
 * Auth -> DAL -> return standings data
 */
export async function getRoundRobinStandingsAction(bracketId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  try {
    const standings = await getRoundRobinStandings(bracketId)
    return { standings }
  } catch {
    return { error: 'Failed to get standings' }
  }
}
