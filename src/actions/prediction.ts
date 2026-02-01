'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  submitPredictions,
  getParticipantPredictions,
  scoreBracketPredictions,
  getAllMatchupPredictionStats,
  updatePredictionStatusDAL,
} from '@/lib/dal/prediction'
import { canUseBracketType } from '@/lib/gates/features'
import {
  submitPredictionSchema,
  updatePredictionStatusSchema,
} from '@/lib/utils/validation'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { SubscriptionTier } from '@/lib/gates/tiers'

/**
 * Submit predictions for a predictive bracket.
 *
 * UNAUTHENTICATED student action (like castVote).
 * Validates participant exists, not banned, bracket predictionStatus is 'predictions_open'.
 */
export async function submitPrediction(input: unknown) {
  const parsed = submitPredictionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid prediction data', issues: parsed.error.issues }
  }

  const { bracketId, participantId, predictions } = parsed.data

  try {
    const result = await submitPredictions(bracketId, participantId, predictions)

    if ('error' in result) {
      return { error: result.error }
    }

    // Non-blocking broadcast
    broadcastBracketUpdate(bracketId, 'prediction_status_changed', {
      type: 'prediction_submitted',
      participantId,
    }).catch(console.error)

    return { success: true, count: result.count }
  } catch {
    return { error: 'Failed to submit predictions' }
  }
}

/**
 * Update prediction status (teacher action).
 *
 * Auth -> validate -> feature gate -> DAL -> revalidate
 *
 * Transitions: draft -> predictions_open -> active -> completed
 */
export async function updatePredictionStatus(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = updatePredictionStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid status data', issues: parsed.error.issues }
  }

  const { bracketId, status } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await updatePredictionStatusDAL(bracketId, teacher.id, status)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to update prediction status' }
  }
}

/**
 * Get leaderboard (scored predictions) for a predictive bracket.
 *
 * Accessible by both teachers (authenticated) and students (via participantId).
 */
export async function getLeaderboard(bracketId: string) {
  // Validate bracketId
  const idSchema = z.string().uuid()
  const parsed = idSchema.safeParse(bracketId)
  if (!parsed.success) {
    return { error: 'Invalid bracket ID' }
  }

  try {
    const scores = await scoreBracketPredictions(bracketId)
    return { scores }
  } catch {
    return { error: 'Failed to get leaderboard' }
  }
}

/**
 * Get prediction stats for all resolved matchups in a bracket.
 *
 * Returns per-matchup prediction distribution (how many predicted each entrant).
 * Only includes resolved matchups -- prediction data is hidden until resolution.
 */
export async function getMatchupStats(bracketId: string) {
  const idSchema = z.string().uuid()
  const parsed = idSchema.safeParse(bracketId)
  if (!parsed.success) {
    return { error: 'Invalid bracket ID' }
  }

  try {
    const stats = await getAllMatchupPredictionStats(bracketId)
    return { stats }
  } catch {
    return { error: 'Failed to get matchup stats' }
  }
}

/**
 * Get predictions for the current student participant.
 *
 * UNAUTHENTICATED student action (uses participantId).
 */
export async function getMyPredictions(bracketId: string, participantId: string) {
  const schema = z.object({
    bracketId: z.string().uuid(),
    participantId: z.string().uuid(),
  })

  const parsed = schema.safeParse({ bracketId, participantId })
  if (!parsed.success) {
    return { error: 'Invalid parameters' }
  }

  try {
    const predictions = await getParticipantPredictions(bracketId, participantId)
    return { predictions }
  } catch {
    return { error: 'Failed to get predictions' }
  }
}
