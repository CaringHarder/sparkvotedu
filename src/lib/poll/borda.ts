/**
 * Borda Count Scoring Functions
 *
 * Borda count assigns points based on ranking position:
 * - With a point base of B, rank 1 gets (B - 1) points, rank 2 gets (B - 2), ..., rank B gets 0.
 * - Unranked options receive 0 points.
 *
 * For full rankings (all options ranked), the base is totalOptions.
 * For partial rankings (rankingDepth < totalOptions), the base is rankingDepth.
 * This prevents inflated scores when only a subset of options are ranked.
 */

export interface BordaScore {
  optionId: string
  points: number
}

export interface BordaLeaderboardEntry {
  optionId: string
  totalPoints: number
  maxPossiblePoints: number
  voterCount: number
}

/**
 * Compute Borda count scores from ranked votes.
 *
 * @param votes - Array of { optionId, rank } from all participants
 * @param pointBase - The scoring base. Use rankingDepth for partial rankings,
 *                    or totalOptions for full rankings. Rank 1 earns (pointBase - 1) points.
 * @returns Array of { optionId, points } sorted descending by points
 */
export function computeBordaScores(
  votes: { optionId: string; rank: number }[],
  pointBase: number
): BordaScore[] {
  const scores: Record<string, number> = {}

  for (const vote of votes) {
    const points = pointBase - vote.rank
    if (points >= 0) {
      scores[vote.optionId] = (scores[vote.optionId] ?? 0) + points
    }
  }

  return Object.entries(scores)
    .map(([optionId, points]) => ({ optionId, points }))
    .sort((a, b) => b.points - a.points)
}

/**
 * Compute Borda leaderboard with extended statistics.
 *
 * Returns each option's total points, maximum possible points, and voter count.
 * If rankingDepth is provided and less than totalOptions, uses rankingDepth as
 * the point base to avoid inflated scores for partial rankings.
 *
 * @param votes - Array of { optionId, rank, participantId } from all participants
 * @param totalOptions - Total number of options in the poll
 * @param totalVoters - Total number of participants who voted
 * @param rankingDepth - Optional depth limit (rank top N). Null means rank all.
 * @returns Array of leaderboard entries sorted descending by totalPoints
 */
export function computeBordaLeaderboard(
  votes: { optionId: string; rank: number; participantId: string }[],
  totalOptions: number,
  totalVoters: number,
  rankingDepth?: number | null
): BordaLeaderboardEntry[] {
  // Use rankingDepth as base when partial rankings are configured
  const pointBase =
    rankingDepth != null && rankingDepth < totalOptions
      ? rankingDepth
      : totalOptions

  const maxPerVoter = pointBase - 1
  const maxPossiblePoints = maxPerVoter * totalVoters

  const scores: Record<string, { points: number; voters: Set<string> }> = {}

  for (const vote of votes) {
    const points = pointBase - vote.rank
    if (points < 0) continue

    if (!scores[vote.optionId]) {
      scores[vote.optionId] = { points: 0, voters: new Set() }
    }
    scores[vote.optionId].points += points
    scores[vote.optionId].voters.add(vote.participantId)
  }

  return Object.entries(scores)
    .map(([optionId, { points, voters }]) => ({
      optionId,
      totalPoints: points,
      maxPossiblePoints: maxPossiblePoints,
      voterCount: voters.size,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}
