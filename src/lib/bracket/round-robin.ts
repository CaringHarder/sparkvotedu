import type { RoundRobinRound, RoundRobinStanding } from './types'

/**
 * Result of a single round-robin matchup.
 * winnerId is null for a tie.
 */
export interface RoundRobinResult {
  entrant1Id: string
  entrant2Id: string
  winnerId: string | null
}

/**
 * Generate a balanced round-robin schedule using the circle method.
 *
 * The circle method fixes one entrant (seed 1) and rotates the rest.
 * For even N: produces N-1 rounds with N/2 matchups each.
 * For odd N: adds a phantom BYE entrant, produces N rounds with (N-1)/2 matchups each
 *   (one entrant sits out per round).
 *
 * @param entrantCount - Number of entrants (3-8)
 * @returns Array of rounds, each containing matchups with 1-indexed seed numbers
 * @throws Error if entrantCount < 3 or > 8
 */
export function generateRoundRobinRounds(entrantCount: number): RoundRobinRound[] {
  if (entrantCount < 3) {
    throw new Error(`Round-robin requires at least 3 entrants, got ${entrantCount}`)
  }
  if (entrantCount > 8) {
    throw new Error(`Round-robin supports at most 8 entrants (28 matchups max), got ${entrantCount}`)
  }

  const isOdd = entrantCount % 2 === 1
  // If odd, add a phantom BYE entrant to make the count even
  const n = isOdd ? entrantCount + 1 : entrantCount
  const BYE_SEED = isOdd ? n : -1 // -1 means no BYE needed

  // Fix entrant 1, rotate the rest: [2, 3, ..., n]
  const rotating = Array.from({ length: n - 1 }, (_, i) => i + 2)

  const rounds: RoundRobinRound[] = []

  for (let r = 0; r < n - 1; r++) {
    // Build the current arrangement: fixed seed 1 + current rotation
    const current = [1, ...rotating]
    const matchups: Array<{ entrant1Seed: number; entrant2Seed: number }> = []

    // Pair i-th from top with i-th from bottom
    for (let i = 0; i < n / 2; i++) {
      const a = current[i]
      const b = current[n - 1 - i]

      // Skip pairings involving the BYE placeholder
      if (a === BYE_SEED || b === BYE_SEED) continue

      matchups.push({ entrant1Seed: a, entrant2Seed: b })
    }

    rounds.push({ roundNumber: r + 1, matchups })

    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop()!)
  }

  return rounds
}

/**
 * Calculate round-robin standings from completed match results.
 *
 * Scoring: Win = 3 points, Tie = 1 point, Loss = 0 points.
 * Ranking: Sort by points desc, then wins desc.
 * Head-to-head tiebreaker: If two entrants have equal points AND equal wins,
 *   the one who beat the other ranks higher.
 * Equal rank for unresolvable ties (e.g., circular head-to-head).
 *
 * @param results - Array of match results
 * @returns Sorted standings with 1-indexed rank
 */
export function calculateRoundRobinStandings(results: RoundRobinResult[]): RoundRobinStanding[] {
  if (results.length === 0) return []

  // Accumulate W/L/T for each entrant
  const stats = new Map<string, { wins: number; losses: number; ties: number; points: number }>()

  function ensureEntrant(id: string) {
    if (!stats.has(id)) {
      stats.set(id, { wins: 0, losses: 0, ties: 0, points: 0 })
    }
  }

  // Build head-to-head lookup: h2h.get("a|b") = "a" means a beat b; null means tie
  const h2h = new Map<string, string | null>()

  for (const result of results) {
    ensureEntrant(result.entrant1Id)
    ensureEntrant(result.entrant2Id)

    const s1 = stats.get(result.entrant1Id)!
    const s2 = stats.get(result.entrant2Id)!

    // Store head-to-head result (bidirectional key)
    const key1 = `${result.entrant1Id}|${result.entrant2Id}`
    const key2 = `${result.entrant2Id}|${result.entrant1Id}`
    h2h.set(key1, result.winnerId)
    h2h.set(key2, result.winnerId)

    if (result.winnerId === null) {
      // Tie
      s1.ties++
      s1.points += 1
      s2.ties++
      s2.points += 1
    } else if (result.winnerId === result.entrant1Id) {
      s1.wins++
      s1.points += 3
      s2.losses++
    } else {
      // winnerId === entrant2Id
      s2.wins++
      s2.points += 3
      s1.losses++
    }
  }

  // Convert to standings array
  const standings: RoundRobinStanding[] = Array.from(stats.entries()).map(([id, s]) => ({
    entrantId: id,
    entrantName: id, // Pure function: no DB lookup, use ID as name
    wins: s.wins,
    losses: s.losses,
    ties: s.ties,
    points: s.points,
    rank: 0, // Will be assigned below
  }))

  // Sort: points desc, wins desc
  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.wins !== b.wins) return b.wins - a.wins
    return 0 // Same points and wins -- need head-to-head
  })

  // Assign ranks with head-to-head tiebreaker
  // Group consecutive entries with same points and wins
  let i = 0
  while (i < standings.length) {
    // Find the end of this tied group
    let j = i + 1
    while (
      j < standings.length &&
      standings[j].points === standings[i].points &&
      standings[j].wins === standings[i].wins
    ) {
      j++
    }

    if (j - i === 1) {
      // No tie, assign rank directly
      standings[i].rank = i + 1
      i = j
      continue
    }

    // Tied group from i to j-1: try to resolve with head-to-head
    const group = standings.slice(i, j)
    const { sorted, fullyResolved } = resolveHeadToHead(group, h2h)

    // Place resolved entries back and assign ranks
    for (let k = 0; k < sorted.length; k++) {
      standings[i + k] = sorted[k]
    }

    if (fullyResolved) {
      // Each entry in the resolved group gets a unique rank
      for (let k = 0; k < sorted.length; k++) {
        standings[i + k].rank = i + k + 1
      }
    } else {
      // Unresolvable tie: all entries in group share the same rank
      for (let k = 0; k < sorted.length; k++) {
        standings[i + k].rank = i + 1
      }
    }

    i = j
  }

  return standings
}

/**
 * Resolve a tied group using head-to-head results.
 * For pairs: the one who beat the other ranks higher.
 * For larger groups: attempt pairwise resolution; assign equal rank if circular.
 *
 * Returns the sorted group and whether the tie was fully resolved.
 */
function resolveHeadToHead(
  group: RoundRobinStanding[],
  h2h: Map<string, string | null>
): { sorted: RoundRobinStanding[]; fullyResolved: boolean } {
  if (group.length === 2) {
    const [a, b] = group
    const key = `${a.entrantId}|${b.entrantId}`
    const winner = h2h.get(key)

    if (winner === a.entrantId) {
      return { sorted: [a, b], fullyResolved: true }
    } else if (winner === b.entrantId) {
      return { sorted: [b, a], fullyResolved: true }
    } else {
      // Tie or no h2h result -- unresolvable
      return { sorted: group, fullyResolved: false }
    }
  }

  // For groups of 3+: compute h2h win count within the group
  const h2hWins = new Map<string, number>()
  for (const entry of group) {
    h2hWins.set(entry.entrantId, 0)
  }

  const groupIds = new Set(group.map((g) => g.entrantId))

  for (let a = 0; a < group.length; a++) {
    for (let b = a + 1; b < group.length; b++) {
      const key = `${group[a].entrantId}|${group[b].entrantId}`
      const winner = h2h.get(key)
      if (winner && groupIds.has(winner)) {
        h2hWins.set(winner, (h2hWins.get(winner) ?? 0) + 1)
      }
    }
  }

  // Check if h2h wins can differentiate all members
  const winCounts = Array.from(h2hWins.values())
  const uniqueWinCounts = new Set(winCounts)

  if (uniqueWinCounts.size === group.length) {
    // All different h2h win counts -- sort by h2h wins desc
    const sorted = [...group].sort(
      (a, b) => (h2hWins.get(b.entrantId) ?? 0) - (h2hWins.get(a.entrantId) ?? 0)
    )
    return { sorted, fullyResolved: true }
  }

  // Circular or unresolvable -- return as-is with equal rank
  return { sorted: group, fullyResolved: false }
}
