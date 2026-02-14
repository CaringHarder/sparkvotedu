'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import {
  submitPredictions,
  getParticipantPredictions,
  scoreBracketPredictions,
  getAllMatchupPredictionStats,
  updatePredictionStatusDAL,
  tabulateBracketPredictions,
  overrideMatchupWinnerDAL,
  releaseResultsDAL,
  revealRoundDAL,
  reopenPredictionsDAL,
} from '@/lib/dal/prediction'
import { canUseBracketType } from '@/lib/gates/features'
import {
  submitPredictionSchema,
  updatePredictionStatusSchema,
  prepareResultsSchema,
  overrideMatchupWinnerSchema,
  revealRoundSchema,
} from '@/lib/utils/validation'
import { broadcastBracketUpdate } from '@/lib/realtime/broadcast'
import { revalidatePath } from 'next/cache'
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
 * Manual/vote_based transitions: draft -> predictions_open -> active -> completed
 * Auto transitions: draft -> predictions_open (then use prepareResults/releaseResults/revealNextRound)
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

// ---------------------------------------------------------------------------
// Auto-resolution lifecycle actions
// ---------------------------------------------------------------------------

/**
 * Prepare results for a predictive auto-resolution bracket.
 *
 * Auth -> validate -> feature gate -> DAL (tabulate) -> broadcast -> revalidate
 *
 * Tabulates all predictions into bracket winners. Teacher can then preview
 * and override before releasing.
 */
export async function prepareResults(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = prepareResultsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input data', issues: parsed.error.issues }
  }

  const { bracketId } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await tabulateBracketPredictions(bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    // Non-blocking broadcast
    broadcastBracketUpdate(bracketId, 'results_prepared', {
      unresolvedCount: result.unresolvedCount,
    }).catch(console.error)

    revalidatePath(`/brackets/${bracketId}`)

    return {
      success: true,
      results: result.results,
      unresolvedCount: result.unresolvedCount,
    }
  } catch {
    return { error: 'Failed to prepare results' }
  }
}

/**
 * Override a matchup winner during the previewing phase.
 *
 * Auth -> validate -> feature gate -> DAL -> revalidate
 *
 * Teacher can manually set the winner of any matchup. Downstream rounds
 * are automatically re-tabulated.
 */
export async function overrideWinner(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = overrideMatchupWinnerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid override data', issues: parsed.error.issues }
  }

  const { bracketId, matchupId, winnerId } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await overrideMatchupWinnerDAL(bracketId, teacher.id, matchupId, winnerId)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to override winner' }
  }
}

/**
 * Release tabulated results for progressive round reveal.
 *
 * Auth -> validate -> feature gate -> DAL -> broadcast -> revalidate
 *
 * Teacher confirms all winners are set and transitions to revealing.
 */
export async function releaseResults(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = prepareResultsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input data', issues: parsed.error.issues }
  }

  const { bracketId } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await releaseResultsDAL(bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    // Non-blocking broadcast
    broadcastBracketUpdate(bracketId, 'prediction_status_changed', {
      predictionStatus: 'revealing',
    }).catch(console.error)

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to release results' }
  }
}

/**
 * Reveal the next round of bracket results.
 *
 * Auth -> validate -> feature gate -> DAL -> revalidate
 *
 * Progressive round-by-round reveal. Broadcast is handled inside the DAL function.
 */
export async function revealNextRound(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = revealRoundSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid round data', issues: parsed.error.issues }
  }

  const { bracketId, round } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await revealRoundDAL(bracketId, teacher.id, round)

    if ('error' in result) {
      return { error: result.error }
    }

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true, isLastRound: result.isLastRound }
  } catch {
    return { error: 'Failed to reveal round' }
  }
}

/**
 * Reopen predictions from the previewing phase.
 *
 * Auth -> validate -> feature gate -> DAL -> broadcast -> revalidate
 *
 * Safety net for teachers who want students to revise their predictions
 * after seeing the tabulated results.
 */
export async function reopenPredictions(input: unknown) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = prepareResultsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input data', issues: parsed.error.issues }
  }

  const { bracketId } = parsed.data

  // Feature gate: predictive bracket type requires pro_plus
  const gate = canUseBracketType(
    teacher.subscriptionTier as SubscriptionTier,
    'predictive'
  )
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  try {
    const result = await reopenPredictionsDAL(bracketId, teacher.id)

    if ('error' in result) {
      return { error: result.error }
    }

    // Non-blocking broadcast
    broadcastBracketUpdate(bracketId, 'prediction_status_changed', {
      predictionStatus: 'predictions_open',
    }).catch(console.error)

    revalidatePath(`/brackets/${bracketId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to reopen predictions' }
  }
}
