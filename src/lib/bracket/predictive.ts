import type { PredictionScore } from './types'

/**
 * Get points awarded for a correct prediction in a given round.
 * Uses standard doubling system: 1-2-4-8-16-32 (Math.pow(2, round - 1)).
 *
 * Round 1 = 1 point, Round 2 = 2, Round 3 = 4, etc.
 * This is the most popular scoring system (ESPN, CBS, Yahoo, NCAA.com).
 */
export function getPointsForRound(round: number): number {
  return Math.pow(2, round - 1)
}

/**
 * Score participant predictions against resolved bracket matchup outcomes.
 *
 * Pure function -- no DB calls. Operates on IDs only.
 * participantName is set to empty string (the DAL layer fills it from the DB).
 *
 * @param predictions - Array of { participantId, matchupId, predictedWinnerId }
 * @param resolvedMatchups - Array of { id, round, winnerId } for decided matchups
 * @param totalRounds - Total rounds in the bracket (unused in scoring formula but
 *                      available for future advanced scoring modes)
 * @returns PredictionScore[] sorted by totalPoints desc, then correctPicks desc
 */
export function scorePredictions(
  predictions: Array<{ participantId: string; matchupId: string; predictedWinnerId: string }>,
  resolvedMatchups: Array<{ id: string; round: number; winnerId: string }>,
  totalRounds: number
): PredictionScore[] {
  // Early return for empty inputs
  if (predictions.length === 0 || resolvedMatchups.length === 0) {
    return []
  }

  // Build lookup map: matchupId -> { round, winnerId }
  const matchupMap = new Map(
    resolvedMatchups.map((m) => [m.id, { round: m.round, winnerId: m.winnerId }])
  )

  // Accumulate per-participant scores
  const scoresMap = new Map<string, PredictionScore>()

  for (const pred of predictions) {
    const matchup = matchupMap.get(pred.matchupId)
    if (!matchup) continue // Matchup not resolved or doesn't exist -- skip

    // Get or create score entry for this participant
    let score = scoresMap.get(pred.participantId)
    if (!score) {
      score = {
        participantId: pred.participantId,
        participantName: '', // Caller fills from DB
        totalPoints: 0,
        correctPicks: 0,
        totalPicks: 0,
        pointsByRound: {},
      }
      scoresMap.set(pred.participantId, score)
    }

    // Initialize round breakdown if needed
    if (!score.pointsByRound[matchup.round]) {
      score.pointsByRound[matchup.round] = { correct: 0, total: 0, points: 0 }
    }

    // Count this as a resolved pick
    score.totalPicks++
    score.pointsByRound[matchup.round].total++

    // Check if prediction is correct
    const isCorrect = pred.predictedWinnerId === matchup.winnerId
    if (isCorrect) {
      const roundPoints = getPointsForRound(matchup.round)
      score.totalPoints += roundPoints
      score.correctPicks++
      score.pointsByRound[matchup.round].correct++
      score.pointsByRound[matchup.round].points += roundPoints
    }
  }

  // Sort: totalPoints descending, then correctPicks descending (tiebreaker)
  return Array.from(scoresMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints
    }
    return b.correctPicks - a.correctPicks
  })
}
