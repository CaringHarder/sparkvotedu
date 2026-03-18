import { prisma } from '@/lib/prisma'
import { scorePredictions, tabulatePredictions } from '@/lib/bracket/predictive'
import { calculateBracketSizeWithByes } from '@/lib/bracket/byes'
import { broadcastBracketUpdate, broadcastActivityUpdate } from '@/lib/realtime/broadcast'
import type { PredictionData, PredictionScore, TabulationInput, TabulationResult } from '@/lib/bracket/types'

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

  if (bracket.bracketType !== 'predictive' && bracket.bracketType !== 'sports') {
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
  try {
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
        select: { id: true, funName: true, emoji: true },
      })
      const nameMap = new Map(participants.map((p) => [p.id, p.funName]))

      for (const score of scores) {
        score.participantName = nameMap.get(score.participantId) ?? ''
      }
    }

    return scores
  } catch (error) {
    console.error('[scoreBracketPredictions] Error scoring predictions for bracket', bracketId, error)
    return []
  }
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
 * Valid prediction status transitions for manual/vote_based modes.
 *
 * - draft -> predictions_open (teacher opens predictions)
 * - predictions_open -> active (teacher closes predictions, bracket begins)
 * - active -> completed (all matchups resolved)
 */
const MANUAL_PREDICTION_TRANSITIONS: Record<string, string[]> = {
  draft: ['predictions_open'],
  predictions_open: ['active'],
  active: ['completed'],
}

/**
 * Valid prediction status transitions for auto mode.
 *
 * - draft -> predictions_open (teacher opens predictions)
 * - predictions_open -> tabulating (prepare results -- handled by tabulateBracketPredictions)
 * - tabulating -> previewing (results ready for teacher preview -- handled by tabulateBracketPredictions)
 * - previewing -> revealing (teacher releases results)
 * - revealing -> completed (all rounds revealed)
 * - previewing -> predictions_open (teacher reopens for changes)
 */
const AUTO_PREDICTION_TRANSITIONS: Record<string, string[]> = {
  draft: ['predictions_open'],
  predictions_open: ['tabulating'],
  tabulating: ['previewing'],
  previewing: ['revealing', 'predictions_open'],
  revealing: ['completed'],
}

/**
 * Valid prediction status transitions for sports brackets.
 *
 * Sports brackets use predictiveResolutionMode 'auto' but skip tabulation
 * because games resolve via external API sync (ESPN/CBS), not internal
 * tabulation. Transitions mirror manual mode: predictions_open -> active.
 */
const SPORTS_PREDICTION_TRANSITIONS: Record<string, string[]> = {
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
      predictiveResolutionMode: true,
      status: true,
      sessionId: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.bracketType !== 'predictive' && bracket.bracketType !== 'sports') {
    return { error: 'Bracket is not a predictive bracket' }
  }

  // Use bracket.status as the effective prediction status when predictionStatus is null (draft)
  const currentStatus = bracket.predictionStatus ?? 'draft'
  const transitions =
    bracket.bracketType === 'sports'
      ? SPORTS_PREDICTION_TRANSITIONS
      : bracket.predictiveResolutionMode === 'auto'
        ? AUTO_PREDICTION_TRANSITIONS
        : MANUAL_PREDICTION_TRANSITIONS
  const allowed = transitions[currentStatus] ?? []

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

  // When predictions close (status='active') in vote_based mode, auto-open Round 1
  // matchups for voting. In manual mode, matchups stay pending -- teacher picks winners directly.
  // In auto mode, tabulation resolves matchups without voting rounds.
  if (status === 'active' && bracket.predictiveResolutionMode === 'vote_based') {
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

/**
 * Re-compute tabulation results (read-only) for a bracket in previewing status.
 *
 * Used to restore vote counts after component remount. Does NOT write anything
 * to the database -- purely re-derives TabulationResult[] from persisted
 * predictions and matchup state.
 *
 * For matchups that already have a winnerId set in the DB (from prior tabulation
 * or teacher override), the DB winnerId takes precedence over the pure engine result.
 */
export async function getTabulationResults(
  bracketId: string,
  teacherId: string
): Promise<{ results: TabulationResult[]; unresolvedCount: number } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      bracketType: true,
      predictiveResolutionMode: true,
      predictionStatus: true,
      size: true,
      maxEntrants: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.bracketType !== 'predictive' && bracket.bracketType !== 'sports') {
    return { error: 'Bracket is not a predictive bracket' }
  }

  if (bracket.predictiveResolutionMode !== 'auto') {
    return { error: 'Bracket is not in auto-resolution mode' }
  }

  const currentStatus = bracket.predictionStatus ?? 'draft'
  if (currentStatus !== 'previewing') {
    return { error: `Cannot fetch tabulation results from status '${currentStatus}'` }
  }

  // Fetch all predictions (same query as tabulateBracketPredictions)
  const predictions = await prisma.prediction.findMany({
    where: { bracketId },
    select: {
      participantId: true,
      matchupId: true,
      predictedWinnerId: true,
    },
  })

  // Fetch all matchups with entrant data + winnerId for override preservation
  const matchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      entrant1Id: true,
      entrant2Id: true,
      isBye: true,
      nextMatchupId: true,
      winnerId: true,
    },
  })

  // Build TabulationInput from matchups
  const tabulationInputs: TabulationInput[] = matchups.map((m) => ({
    matchupId: m.id,
    round: m.round,
    position: m.position,
    entrant1Id: m.entrant1Id,
    entrant2Id: m.entrant2Id,
    isBye: m.isBye,
    nextMatchupId: m.nextMatchupId,
  }))

  // Calculate total rounds
  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = Math.ceil(Math.log2(effectiveSize))

  // Call pure tabulation engine (read-only -- computes vote counts)
  const results = tabulatePredictions(predictions, tabulationInputs, totalRounds)

  // Build DB winnerId lookup for override preservation
  const dbWinnerById = new Map(
    matchups.filter((m) => m.winnerId != null).map((m) => [m.id, m.winnerId])
  )

  // For matchups that already have a winnerId in the DB (from prior tabulation
  // or teacher override), use that as the authoritative winner
  for (const result of results) {
    const dbWinnerId = dbWinnerById.get(result.matchupId)
    if (dbWinnerId) {
      result.winnerId = dbWinnerId
      result.status = 'resolved'
    }
  }

  // Compute unresolvedCount from results where status !== 'resolved'
  const unresolvedCount = results.filter(
    (r) => r.status !== 'resolved'
  ).length

  return { results, unresolvedCount }
}

// ---------------------------------------------------------------------------
// Auto-resolution DAL functions
// ---------------------------------------------------------------------------

/**
 * Determine which slot a matchup feeds into in the next matchup.
 * Queries sibling feeders and assigns by position order: lower → entrant1, higher → entrant2.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSlotByFeederOrder(
  db: any,
  matchupId: string,
  nextMatchupId: string,
  position: number
): Promise<'entrant1Id' | 'entrant2Id'> {
  const feeders = await db.matchup.findMany({
    where: { nextMatchupId },
    select: { id: true, position: true },
    orderBy: { position: 'asc' },
  })
  if (feeders.length >= 2) {
    return feeders[0].id === matchupId ? 'entrant1Id' : 'entrant2Id'
  }
  return position % 2 === 1 ? 'entrant1Id' : 'entrant2Id'
}

/**
 * Tabulate all predictions in a predictive auto-resolution bracket.
 *
 * Transitions: predictions_open -> tabulating -> previewing
 *
 * - Calls the pure tabulatePredictions engine with bracket matchups and predictions
 * - Writes tabulated winners to matchup.winnerId (keeps status 'pending' for preview)
 * - Propagates winners to next matchup entrant slots
 * - Returns results and count of unresolved (ties + no_predictions) matchups
 */
export async function tabulateBracketPredictions(
  bracketId: string,
  teacherId: string
): Promise<{ results: TabulationResult[]; unresolvedCount: number } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      bracketType: true,
      predictiveResolutionMode: true,
      predictionStatus: true,
      size: true,
      maxEntrants: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if (bracket.bracketType !== 'predictive' && bracket.bracketType !== 'sports') {
    return { error: 'Bracket is not a predictive bracket' }
  }

  if (bracket.predictiveResolutionMode !== 'auto') {
    return { error: 'Bracket is not in auto-resolution mode' }
  }

  const currentStatus = bracket.predictionStatus ?? 'draft'
  if (currentStatus !== 'predictions_open' && currentStatus !== 'tabulating') {
    return { error: `Cannot tabulate from status '${currentStatus}'` }
  }

  // Transition to tabulating
  await prisma.bracket.update({
    where: { id: bracketId },
    data: { predictionStatus: 'tabulating' },
  })

  // Fetch all predictions
  const predictions = await prisma.prediction.findMany({
    where: { bracketId },
    select: {
      participantId: true,
      matchupId: true,
      predictedWinnerId: true,
    },
  })

  // Fetch all matchups with entrant data
  const matchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      entrant1Id: true,
      entrant2Id: true,
      isBye: true,
      nextMatchupId: true,
    },
  })

  // Build TabulationInput from matchups
  const tabulationInputs: TabulationInput[] = matchups.map((m) => ({
    matchupId: m.id,
    round: m.round,
    position: m.position,
    entrant1Id: m.entrant1Id,
    entrant2Id: m.entrant2Id,
    isBye: m.isBye,
    nextMatchupId: m.nextMatchupId,
  }))

  // Calculate total rounds
  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = Math.ceil(Math.log2(effectiveSize))

  // Call pure tabulation engine
  const results = tabulatePredictions(predictions, tabulationInputs, totalRounds)

  // Count unresolved matchups (ties + no_predictions)
  const unresolvedCount = results.filter(
    (r) => r.status === 'tie' || r.status === 'no_predictions'
  ).length

  // Write results atomically: matchup winners, next-matchup propagation, and status transition
  await prisma.$transaction(async (tx) => {
    for (const result of results) {
      if (result.winnerId) {
        // Set winnerId on matchup (keep status 'pending' for preview)
        await tx.matchup.update({
          where: { id: result.matchupId },
          data: { winnerId: result.winnerId },
        })

        // Propagate winner to next matchup entrant slot
        const matchup = matchups.find((m) => m.id === result.matchupId)
        if (matchup?.nextMatchupId) {
          const slot = await getSlotByFeederOrder(tx, matchup.id, matchup.nextMatchupId, matchup.position)
          await tx.matchup.update({
            where: { id: matchup.nextMatchupId },
            data: { [slot]: result.winnerId },
          })
        }
      }
    }

    // Transition to previewing
    await tx.bracket.update({
      where: { id: bracketId },
      data: { predictionStatus: 'previewing' },
    })
  })

  return { results, unresolvedCount }
}

/**
 * Override a matchup winner during the previewing phase.
 *
 * After override, the winner propagates to the next matchup slot.
 * Then all downstream rounds are cleared and re-tabulated because
 * entrants changed.
 */
export async function overrideMatchupWinnerDAL(
  bracketId: string,
  teacherId: string,
  matchupId: string,
  winnerId: string
): Promise<{ success: true; results: TabulationResult[] } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      bracketType: true,
      predictiveResolutionMode: true,
      predictionStatus: true,
      size: true,
      maxEntrants: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if ((bracket.predictionStatus ?? 'draft') !== 'previewing') {
    return { error: 'Can only override winners during previewing' }
  }

  // Verify the matchup belongs to this bracket
  const matchup = await prisma.matchup.findFirst({
    where: { id: matchupId, bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      entrant1Id: true,
      entrant2Id: true,
      nextMatchupId: true,
    },
  })

  if (!matchup) {
    return { error: 'Matchup not found' }
  }

  // Verify winner is one of the entrants
  if (winnerId !== matchup.entrant1Id && winnerId !== matchup.entrant2Id) {
    return { error: 'Winner must be one of the matchup entrants' }
  }

  // Update the matchup winner
  await prisma.matchup.update({
    where: { id: matchupId },
    data: { winnerId },
  })

  // Propagate winner to next matchup slot
  if (matchup.nextMatchupId) {
    const slot = await getSlotByFeederOrder(prisma, matchup.id, matchup.nextMatchupId, matchup.position)
    await prisma.matchup.update({
      where: { id: matchup.nextMatchupId },
      data: { [slot]: winnerId },
    })
  }

  // Clear and re-tabulate downstream rounds
  // Fetch all matchups for downstream invalidation
  const allMatchups = await prisma.matchup.findMany({
    where: { bracketId },
    select: {
      id: true,
      round: true,
      position: true,
      entrant1Id: true,
      entrant2Id: true,
      isBye: true,
      nextMatchupId: true,
      winnerId: true,
    },
  })

  // Find rounds after the overridden matchup's round
  const downstreamRounds = allMatchups.filter(
    (m) => m.round > matchup.round && !m.isBye
  )

  if (downstreamRounds.length > 0) {
    // Clear winnerId for downstream matchups
    await prisma.matchup.updateMany({
      where: {
        bracketId,
        round: { gt: matchup.round },
        isBye: false,
      },
      data: { winnerId: null },
    })

    // Also clear entrant slots for rounds beyond the immediately next round
    // (since those entrants came from now-invalidated cascade propagation).
    // We keep round matchup.round+1 entrants since those are fed from
    // matchup.round winners (which we just updated).
    if (matchup.round + 1 < Math.ceil(Math.log2(bracket.maxEntrants ?? bracket.size))) {
      await prisma.matchup.updateMany({
        where: {
          bracketId,
          round: { gt: matchup.round + 1 },
          isBye: false,
        },
        data: { entrant1Id: null, entrant2Id: null },
      })
    }

    // Re-fetch updated matchups and re-run tabulation for downstream
    const updatedMatchups = await prisma.matchup.findMany({
      where: { bracketId },
      select: {
        id: true,
        round: true,
        position: true,
        entrant1Id: true,
        entrant2Id: true,
        isBye: true,
        nextMatchupId: true,
      },
    })

    const predictions = await prisma.prediction.findMany({
      where: { bracketId },
      select: {
        participantId: true,
        matchupId: true,
        predictedWinnerId: true,
      },
    })

    const effectiveSize = bracket.maxEntrants ?? bracket.size
    const totalRounds = Math.ceil(Math.log2(effectiveSize))

    const tabulationInputs: TabulationInput[] = updatedMatchups.map((m) => ({
      matchupId: m.id,
      round: m.round,
      position: m.position,
      entrant1Id: m.entrant1Id,
      entrant2Id: m.entrant2Id,
      isBye: m.isBye,
      nextMatchupId: m.nextMatchupId,
    }))

    // Re-tabulate only downstream rounds
    const reResults = tabulatePredictions(predictions, tabulationInputs, totalRounds)
    const downstreamResults = reResults.filter((r) => r.round > matchup.round)

    for (const result of downstreamResults) {
      if (result.winnerId) {
        await prisma.matchup.update({
          where: { id: result.matchupId },
          data: { winnerId: result.winnerId },
        })

        // Propagate to next slot
        const m = updatedMatchups.find((um) => um.id === result.matchupId)
        if (m?.nextMatchupId) {
          const slot = await getSlotByFeederOrder(prisma, m.id, m.nextMatchupId, m.position)
          await prisma.matchup.update({
            where: { id: m.nextMatchupId },
            data: { [slot]: result.winnerId },
          })
        }
      }
    }
  }

  // Re-fetch final matchup state and build TabulationResult[] for the client
  const finalMatchups = await prisma.matchup.findMany({
    where: { bracketId, isBye: false },
    select: {
      id: true,
      round: true,
      position: true,
      winnerId: true,
      entrant1Id: true,
      entrant2Id: true,
    },
  })

  const results: TabulationResult[] = finalMatchups.map((m) => ({
    matchupId: m.id,
    round: m.round,
    position: m.position,
    winnerId: m.winnerId,
    entrant1Id: m.entrant1Id,
    entrant2Id: m.entrant2Id,
    entrant1Votes: 0,
    entrant2Votes: 0,
    totalVotes: 0,
    status: m.winnerId ? ('resolved' as const) : ('tie' as const),
  }))

  return { success: true, results }
}

/**
 * Release tabulated results for progressive round reveal.
 *
 * Transitions: previewing -> revealing
 *
 * - Verifies ALL matchups have winnerId set (no ties or no_predictions remaining)
 * - Sets revealedUpToRound to 0, then auto-reveals round 1 via revealRoundDAL
 * - Teacher sees round 1 results immediately without needing an extra click
 */
export async function releaseResultsDAL(
  bracketId: string,
  teacherId: string
): Promise<{ success: true } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      bracketType: true,
      predictionStatus: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if ((bracket.predictionStatus ?? 'draft') !== 'previewing') {
    return { error: 'Can only release results from previewing status' }
  }

  // Verify all non-bye matchups have winnerId set
  const unresolvedMatchups = await prisma.matchup.count({
    where: {
      bracketId,
      isBye: false,
      winnerId: null,
    },
  })

  if (unresolvedMatchups > 0) {
    return { error: 'All matchups must have winners before release' }
  }

  // Transition to revealing with revealedUpToRound = 0
  await prisma.bracket.update({
    where: { id: bracketId },
    data: {
      predictionStatus: 'revealing',
      revealedUpToRound: 0,
    },
  })

  // Auto-reveal round 1 immediately (teacher should not need to click again)
  await revealRoundDAL(bracketId, teacherId, 1)

  return { success: true }
}

/**
 * Reveal the next round of results during progressive reveal.
 *
 * - Verifies round is the next sequential round (revealedUpToRound + 1)
 * - Updates non-bye matchups for that round from 'pending' to 'decided'
 * - Increments revealedUpToRound
 * - Broadcasts reveal_round or reveal_complete
 */
export async function revealRoundDAL(
  bracketId: string,
  teacherId: string,
  round: number
): Promise<{ success: true; isLastRound: boolean } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      predictionStatus: true,
      revealedUpToRound: true,
      size: true,
      maxEntrants: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if ((bracket.predictionStatus ?? 'draft') !== 'revealing') {
    return { error: 'Can only reveal rounds during revealing status' }
  }

  const currentRevealed = bracket.revealedUpToRound ?? 0
  if (round !== currentRevealed + 1) {
    return { error: `Must reveal round ${currentRevealed + 1} next (requested ${round})` }
  }

  // Update matchups for this round to 'decided'
  await prisma.matchup.updateMany({
    where: {
      bracketId,
      round,
      isBye: false,
      status: 'pending',
    },
    data: { status: 'decided' },
  })

  // Calculate total rounds to determine if this is the last
  const effectiveSize = bracket.maxEntrants ?? bracket.size
  const totalRounds = Math.ceil(Math.log2(effectiveSize))
  const isLastRound = round >= totalRounds

  // Update revealedUpToRound
  await prisma.bracket.update({
    where: { id: bracketId },
    data: { revealedUpToRound: round },
  })

  // If last round, transition to completed
  if (isLastRound) {
    await prisma.bracket.update({
      where: { id: bracketId },
      data: {
        predictionStatus: 'completed',
        status: 'completed',
      },
    })
    broadcastBracketUpdate(bracketId, 'reveal_complete', { round }).catch(console.error)
  } else {
    broadcastBracketUpdate(bracketId, 'reveal_round', { round }).catch(console.error)
  }

  return { success: true, isLastRound }
}

/**
 * Reopen predictions during the previewing phase.
 *
 * Transitions: previewing -> predictions_open
 *
 * - Clears all non-bye matchup winnerId values
 * - Clears non-bye matchup entrant slots for rounds > 1 (reset propagated entrants)
 * - Resets revealedUpToRound to null
 */
export async function reopenPredictionsDAL(
  bracketId: string,
  teacherId: string
): Promise<{ success: true } | { error: string }> {
  const bracket = await prisma.bracket.findFirst({
    where: { id: bracketId, teacherId },
    select: {
      id: true,
      predictionStatus: true,
    },
  })

  if (!bracket) {
    return { error: 'Bracket not found' }
  }

  if ((bracket.predictionStatus ?? 'draft') !== 'previewing') {
    return { error: 'Can only reopen predictions from previewing status' }
  }

  // Clear all non-bye matchup winnerId values
  await prisma.matchup.updateMany({
    where: { bracketId, isBye: false },
    data: { winnerId: null },
  })

  // Clear entrant slots for rounds > 1 (those were propagated from tabulation)
  await prisma.matchup.updateMany({
    where: {
      bracketId,
      round: { gt: 1 },
      isBye: false,
    },
    data: { entrant1Id: null, entrant2Id: null },
  })

  // Reset bracket to predictions_open
  await prisma.bracket.update({
    where: { id: bracketId },
    data: {
      predictionStatus: 'predictions_open',
      revealedUpToRound: null,
    },
  })

  return { success: true }
}
