import type { MatchupSeed } from './types'

/**
 * Calculate the number of rounds in a single-elimination bracket.
 *
 * @param entrantCount - Number of entrants (must be power of 2: 4, 8, or 16)
 * @returns Number of rounds needed to determine a winner
 *
 * @example
 * calculateRounds(4)  // 2
 * calculateRounds(8)  // 3
 * calculateRounds(16) // 4
 */
export function calculateRounds(entrantCount: number): number {
  return Math.log2(entrantCount)
}

/**
 * Build the standard tournament seed order using recursive doubling.
 *
 * Starting from [1], each iteration doubles the list by pairing each
 * existing seed with (roundSize + 1 - seed). This produces the standard
 * single-elimination bracket seeding where top seeds face bottom seeds.
 *
 * @param bracketSize - Total number of entrants (4, 8, or 16)
 * @returns Array of seed numbers in bracket order
 *
 * @example
 * buildSeedOrder(4)  // [1, 4, 2, 3]
 * buildSeedOrder(8)  // [1, 8, 4, 5, 2, 7, 3, 6]
 */
function buildSeedOrder(bracketSize: number): number[] {
  let seeds = [1]
  let roundSize = 2

  while (roundSize <= bracketSize) {
    const expanded: number[] = []
    for (const seed of seeds) {
      expanded.push(seed)
      expanded.push(roundSize + 1 - seed)
    }
    seeds = expanded
    roundSize *= 2
  }

  return seeds
}

/**
 * Get the seed number for a specific slot in a first-round matchup.
 *
 * Uses standard single-elimination tournament seeding where:
 * - Size 4: Match 1 = 1v4, Match 2 = 2v3
 * - Size 8: Match 1 = 1v8, Match 2 = 4v5, Match 3 = 2v7, Match 4 = 3v6
 * - Size 16: Match 1 = 1v16, Match 2 = 8v9, etc.
 *
 * @param position - 1-indexed matchup position within the first round
 * @param bracketSize - Total number of entrants (4, 8, or 16)
 * @param slot - Which entrant slot (1 = top/higher seed, 2 = bottom/lower seed)
 * @returns The seed number for the given slot
 */
export function getStandardSeed(
  position: number,
  bracketSize: number,
  slot: 1 | 2
): number {
  const seedOrder = buildSeedOrder(bracketSize)
  const pairIndex = (position - 1) * 2
  return slot === 1 ? seedOrder[pairIndex] : seedOrder[pairIndex + 1]
}

/**
 * Generate all matchup seeds for a single-elimination bracket.
 *
 * Creates the full bracket structure with:
 * - Correct number of matchups per round (halving each round)
 * - First-round seed assignments via standard tournament seeding
 * - Null seeds for later rounds (filled by match winners)
 * - nextMatchupPosition references chaining each matchup to the next round
 * - Final matchup has nextMatchupPosition = null
 *
 * @param bracketSize - Total number of entrants (4, 8, or 16)
 * @returns Array of MatchupSeed objects describing the full bracket structure
 *
 * @example
 * generateMatchups(4) // 3 matchups: 2 in round 1, 1 final in round 2
 * generateMatchups(8) // 7 matchups: 4 in R1, 2 in R2, 1 final in R3
 */
export function generateMatchups(bracketSize: number): MatchupSeed[] {
  const rounds = calculateRounds(bracketSize)
  const matchups: MatchupSeed[] = []

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round)
    const isFirstRound = round === 1
    const isFinalRound = round === rounds

    for (let position = 1; position <= matchesInRound; position++) {
      const nextMatchupPosition = isFinalRound
        ? null
        : {
            round: round + 1,
            position: Math.ceil(position / 2),
          }

      matchups.push({
        round,
        position,
        entrant1Seed: isFirstRound
          ? getStandardSeed(position, bracketSize, 1)
          : null,
        entrant2Seed: isFirstRound
          ? getStandardSeed(position, bracketSize, 2)
          : null,
        nextMatchupPosition,
      })
    }
  }

  return matchups
}
