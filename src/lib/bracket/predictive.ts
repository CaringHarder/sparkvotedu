import type { PredictionScore, TabulationInput, TabulationResult } from './types'

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

/**
 * Tabulate predictions as votes to determine bracket winners round by round.
 *
 * Pure function -- no DB calls. Operates on prediction and matchup data only.
 * Uses round-by-round cascade: resolved winners from round N propagate as
 * entrants into round N+1 matchups via position parity (odd -> entrant1, even -> entrant2).
 *
 * For later rounds, only predictions referencing actual entrants (cascaded winners)
 * are counted -- predictions for eliminated entrants are ignored.
 *
 * @param predictions - Array of { participantId, matchupId, predictedWinnerId }
 * @param matchups - Array of TabulationInput describing bracket structure
 * @param totalRounds - Total number of rounds in the bracket
 * @returns TabulationResult[] for all non-bye matchups
 */
export function tabulatePredictions(
  predictions: Array<{ participantId: string; matchupId: string; predictedWinnerId: string }>,
  matchups: TabulationInput[],
  totalRounds: number
): TabulationResult[] {
  // Early return for empty predictions
  if (predictions.length === 0) {
    return []
  }

  // Deep copy matchups to avoid side effects on input
  const workingMatchups: TabulationInput[] = matchups.map((m) => ({ ...m }))

  // Filter out bye matchups
  const nonByeMatchups = workingMatchups.filter((m) => !m.isBye)

  // Build lookup: matchupId -> working matchup (for cascade mutation)
  const matchupById = new Map(workingMatchups.map((m) => [m.matchupId, m]))

  // Build prediction lookup: matchupId -> predictions for that matchup
  const predsByMatchup = new Map<string, Array<{ participantId: string; predictedWinnerId: string }>>()
  for (const pred of predictions) {
    const list = predsByMatchup.get(pred.matchupId)
    if (list) {
      list.push(pred)
    } else {
      predsByMatchup.set(pred.matchupId, [pred])
    }
  }

  const results: TabulationResult[] = []

  // Process round by round for cascade propagation
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatchups = nonByeMatchups.filter((m) => m.round === round)

    for (const matchup of roundMatchups) {
      const matchupPreds = predsByMatchup.get(matchup.matchupId) || []

      const entrant1Id = matchup.entrant1Id
      const entrant2Id = matchup.entrant2Id

      // Count votes only for actual entrants in this matchup
      let entrant1Votes = 0
      let entrant2Votes = 0

      for (const pred of matchupPreds) {
        if (entrant1Id && pred.predictedWinnerId === entrant1Id) {
          entrant1Votes++
        } else if (entrant2Id && pred.predictedWinnerId === entrant2Id) {
          entrant2Votes++
        }
        // Predictions for non-entrants (eliminated) are silently ignored
      }

      const totalVotes = entrant1Votes + entrant2Votes

      let winnerId: string | null = null
      let status: TabulationResult['status']

      if (totalVotes === 0) {
        status = 'no_predictions'
      } else if (entrant1Votes === entrant2Votes) {
        status = 'tie'
      } else {
        status = 'resolved'
        winnerId = entrant1Votes > entrant2Votes ? entrant1Id : entrant2Id
      }

      results.push({
        matchupId: matchup.matchupId,
        round: matchup.round,
        position: matchup.position,
        winnerId,
        entrant1Id,
        entrant2Id,
        entrant1Votes,
        entrant2Votes,
        totalVotes,
        status,
      })

      // Cascade winner to next matchup if resolved
      if (winnerId && matchup.nextMatchupId) {
        const nextMatchup = matchupById.get(matchup.nextMatchupId)
        if (nextMatchup) {
          // Determine slot by feeder order (lower position = entrant1)
          const feeders = nonByeMatchups
            .filter((m) => m.nextMatchupId === matchup.nextMatchupId)
            .sort((a, b) => a.position - b.position)
          const isFirstFeeder = feeders.length >= 2 ? feeders[0].matchupId === matchup.matchupId : matchup.position % 2 === 1
          if (isFirstFeeder) {
            nextMatchup.entrant1Id = winnerId
          } else {
            nextMatchup.entrant2Id = winnerId
          }
        }
      }
    }
  }

  return results
}
