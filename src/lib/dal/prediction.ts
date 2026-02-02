import { prisma } from '@/lib/prisma'
import { scorePredictions } from '@/lib/bracket/predictive'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'
import { broadcastBracketUpdate, broadcastActivityUpdate } from '@/lib/realtime/broadcast'
import type { PredictionData, PredictionScore } from '@/lib/bracket/types'

/**
 * Submit (or replace) predictions for a participant in a predictive bracket.
 *
 * - Verifies bracket exists with predictionStatus 'predictions_open'
 * - Verifies participant exists and is not banned
 * - Filters out predictions targeting bye matchups
 * - Uses delete + createMany for idempotent upsert (edit support)
 *
 * Returns the count of predictions saved.
 */
export async function submitPredictions(
  bracketId: string,
  participantId: string,
  predictions: Array<{ matchupId: string; predictedWinnerId: string }>
): Promise<{ count: number } | { error: string }> {
  // Verify bracket exists and predictions are open
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { id: true, predictionStatus: true, bracketType: true },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.bracketType !== 'predictive') {
    return { error: 'Bracket is not a predictive bracket' }
  }

  if (bracket.predictionStatus !== 'predictions_open') {
    return { error: 'Predictions are not currently open' }
  }

  // Verify participant exists and is not banned
  const participant = await prisma.studentParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, banned: true },
  })

  if (!participant) {
    return { error: 'Participant not found' }
  }

  if (participant.banned) {
    return { error: 'Participant is banned' }
  }

  // Filter out predictions for bye matchups
  const byeMatchupIds = new Set(
    (
      await prisma.matchup.findMany({
        where: { bracketId, isBye: true },
        select: { id: true },
      })
    ).map((m) => m.id)
  )

  const validPredictions = predictions.filter(
    (p) => !byeMatchupIds.has(p.matchupId)
  )

  if (validPredictions.length === 0) {
    return { count: 0 }
  }

  // Delete existing predictions for this participant+bracket, then createMany (upsert pattern)
  await prisma.$transaction(async (tx) => {
    await tx.prediction.deleteMany({
      where: { bracketId, participantId },
    })

    await tx.prediction.createMany({
      data: validPredictions.map((p) => ({
        bracketId,
        participantId,
        matchupId: p.matchupId,
        predictedWinnerId: p.predictedWinnerId,
      })),
      skipDuplicates: true,
    })
  })

  return { count: validPredictions.length }
}

/**
 * Get all predictions for a specific participant in a bracket.
 * Includes the predicted winner entrant name for display.
 */
export async function getParticipantPredictions(
  bracketId: string,
  participantId: string
): Promise<PredictionData[]> {
  const predictions = await prisma.prediction.findMany({
    where: { bracketId, participantId },
    include: {
      predictedWinner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return predictions.map((p) => ({
    id: p.id,
    bracketId: p.bracketId,
    participantId: p.participantId,
    matchupId: p.matchupId,
    predictedWinnerId: p.predictedWinnerId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))
}

/**
 * Score all predictions in a bracket against resolved matchup outcomes.
 *
 * Uses the pure scoring engine from predictive.ts, then enriches
 * participantName from the database.
 */
export async function scoreBracketPredictions(
  bracketId: string
): Promise<PredictionScore[]> {
  // Fetch all predictions for this bracket
  const predictions = await prisma.prediction.findMany({
    where: { bracketId },
    select: {
      participantId: true,
      matchupId: true,
      predictedWinnerId: true,
    },
  })

  // Fetch all resolved matchups (decided with a winner)
  const resolvedMatchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      status: 'decided',
      winnerId: { not: null },
      isBye: false, // Exclude bye matchups from scoring
    },
    select: { id: true, round: true, winnerId: true },
  })

  // Calculate totalRounds from bracket size
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { size: true, maxEntrants: true },
  })

  if (!bracket) return []

  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = Math.ceil(Math.log2(effectiveSize))

  // Call the pure scoring engine
  const scores = scorePredictions(
    predictions.map((p) => ({
      participantId: p.participantId,
      matchupId: p.matchupId,
      predictedWinnerId: p.predictedWinnerId,
    })),
    resolvedMatchups.map((m) => ({
      id: m.id,
      round: m.round,
      winnerId: m.winnerId!,
    })),
    totalRounds
  )

  // Enrich with participant names
  if (scores.length > 0) {
    const participantIds = scores.map((s) => s.participantId)
    const participants = await prisma.studentParticipant.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, funName: true },
    })
    const nameMap = new Map(participants.map((p) => [p.id, p.funName]))

    for (const score of scores) {
      score.participantName = nameMap.get(score.participantId) ?? ''
    }
  }

  return scores
}

/**
 * Get prediction statistics for a specific matchup.
 *
 * Only returns stats for resolved matchups (predictions are hidden until resolution).
 * Returns prediction counts grouped by predicted winner.
 */
export async function getMatchupPredictionStats(
  bracketId: string,
  matchupId: string
): Promise<{
  entrant1Predictions: number
  entrant2Predictions: number
  totalPredictions: number
} | null> {
  // Only return stats for resolved matchups
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    select: {
      status: true,
      bracketId: true,
      entrant1Id: true,
      entrant2Id: true,
    },
  })

  if (!matchup || matchup.bracketId !== bracketId || matchup.status !== 'decided') {
    return null
  }

  const predictions = await prisma.prediction.groupBy({
    by: ['predictedWinnerId'],
    where: { bracketId, matchupId },
    _count: { id: true },
  })

  let entrant1Predictions = 0
  let entrant2Predictions = 0
  let totalPredictions = 0

  for (const group of predictions) {
    const count = group._count.id
    totalPredictions += count
    if (group.predictedWinnerId === matchup.entrant1Id) {
      entrant1Predictions = count
    } else if (group.predictedWinnerId === matchup.entrant2Id) {
      entrant2Predictions = count
    }
  }

  return { entrant1Predictions, entrant2Predictions, totalPredictions }
}

/**
 * Get prediction stats for all resolved matchups in a bracket.
 *
 * Returns a Record keyed by matchupId with prediction distribution per entrant.
 * Only includes resolved (decided) matchups -- prediction distributions are hidden until resolution.
 */
export async function getAllMatchupPredictionStats(
  bracketId: string
): Promise<
  Record<
    string,
    {
      entrant1Id: string | null
      entrant2Id: string | null
      entrant1Name: string | null
      entrant2Name: string | null
      winnerId: string | null
      entrant1Predictions: number
      entrant2Predictions: number
      totalPredictions: number
    }
  >
> {
  // Fetch all resolved matchups
  const resolvedMatchups = await prisma.matchup.findMany({
    where: {
      bracketId,
      status: 'decided',
      winnerId: { not: null },
      isBye: false,
    },
    select: {
      id: true,
      entrant1Id: true,
      entrant2Id: true,
      winnerId: true,
      entrant1: { select: { name: true } },
      entrant2: { select: { name: true } },
    },
  })

  if (resolvedMatchups.length === 0) return {}

  // Fetch all predictions for resolved matchups in one query
  const matchupIds = resolvedMatchups.map((m) => m.id)
  const predictions = await prisma.prediction.groupBy({
    by: ['matchupId', 'predictedWinnerId'],
    where: { bracketId, matchupId: { in: matchupIds } },
    _count: { id: true },
  })

  // Build prediction count map: matchupId -> predictedWinnerId -> count
  const countMap = new Map<string, Map<string, number>>()
  for (const group of predictions) {
    if (!countMap.has(group.matchupId)) {
      countMap.set(group.matchupId, new Map())
    }
    countMap.get(group.matchupId)!.set(group.predictedWinnerId, group._count.id)
  }

  // Build result
  const result: Record<
    string,
    {
      entrant1Id: string | null
      entrant2Id: string | null
      entrant1Name: string | null
      entrant2Name: string | null
      winnerId: string | null
      entrant1Predictions: number
      entrant2Predictions: number
      totalPredictions: number
    }
  > = {}

  for (const matchup of resolvedMatchups) {
    const counts = countMap.get(matchup.id) ?? new Map()
    const e1Count = matchup.entrant1Id ? (counts.get(matchup.entrant1Id) ?? 0) : 0
    const e2Count = matchup.entrant2Id ? (counts.get(matchup.entrant2Id) ?? 0) : 0

    result[matchup.id] = {
      entrant1Id: matchup.entrant1Id,
      entrant2Id: matchup.entrant2Id,
      entrant1Name: matchup.entrant1?.name ?? null,
      entrant2Name: matchup.entrant2?.name ?? null,
      winnerId: matchup.winnerId,
      entrant1Predictions: e1Count,
      entrant2Predictions: e2Count,
      totalPredictions: e1Count + e2Count,
    }
  }

  return result
}

/**
 * Valid prediction status transitions.
 *
 * - draft -> predictions_open (teacher opens predictions)
 * - predictions_open -> active (teacher closes predictions, bracket begins)
 * - active -> completed (all matchups resolved)
 */
const VALID_PREDICTION_TRANSITIONS: Record<string, string[]> = {
  draft: ['predictions_open'],
  predictions_open: ['active'],
  active: ['completed'],
}

/**
 * Update a bracket's prediction status with forward-only transition validation.
 *
 * Ownership enforced via teacherId. Broadcasts prediction status change.
 */
export async function updatePredictionStatusDAL(
  bracketId: string,
  teacherId: string,
  status: string
): Promise<{ success: true } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      bracketType: true,
      predictionStatus: true,
      status: true,
      sessionId: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.bracketType !== 'predictive') {
    return { error: 'Bracket is not a predictive bracket' }
  }

  // Use bracket.status as the effective prediction status when predictionStatus is null (draft)
  const currentStatus = bracket.predictionStatus ?? 'draft'
  const allowed = VALID_PREDICTION_TRANSITIONS[currentStatus] ?? []

  if (!allowed.includes(status)) {
    return {
      error: `Cannot transition prediction status from '${currentStatus}' to '${status}'`,
    }
  }

  // Set bracket status alongside prediction status transitions:
  // - predictions_open: auto-activate so bracket appears in student session activities
  // - active: bracket stays active (predictions closed, live play begins)
  // - completed: bracket is done
  const updateData: { predictionStatus: string; status?: string } = {
    predictionStatus: status,
  }
  if (status === 'predictions_open') {
    updateData.status = 'active'
  }
  if (status === 'active') {
    updateData.status = 'active'
  }
  if (status === 'completed') {
    updateData.status = 'completed'
  }

  await prisma.bracket.update({
    where: { id: bracketId },
    data: updateData,
  })

  // When predictions close (status='active'), auto-open Round 1 matchups for voting
  // so the teacher can immediately go live and students can vote.
  if (status === 'active') {
    const round1Matchups = await prisma.matchup.findMany({
      where: { bracketId, round: 1, status: 'pending' },
      select: { id: true, entrant1Id: true, entrant2Id: true },
    })
    const readyIds = round1Matchups
      .filter((m) => m.entrant1Id != null && m.entrant2Id != null)
      .map((m) => m.id)
    if (readyIds.length > 0) {
      await prisma.matchup.updateMany({
        where: { id: { in: readyIds }, status: 'pending' },
        data: { status: 'voting' },
      })
      // Broadcast voting opened so student pages update
      broadcastBracketUpdate(bracketId, 'voting_opened', {
        matchupIds: readyIds,
      }).catch(console.error)
    }
  }

  // Broadcast prediction status change to bracket subscribers
  broadcastBracketUpdate(bracketId, 'prediction_status_changed', {
    predictionStatus: status,
  }).catch(console.error)

  // When predictions open, also broadcast activity update so student session page refreshes
  if (status === 'predictions_open' && bracket.sessionId) {
    broadcastActivityUpdate(bracket.sessionId).catch(console.error)
  }

  return { success: true }
}
