import { generateMatchups } from './engine'
import type { MatchupSeedWithBye } from './types'

/**
 * Calculate the bracket size, number of byes, and which seeds receive byes
 * for a non-power-of-two entrant count.
 *
 * - bracketSize: next power of 2 >= entrantCount
 * - numByes: bracketSize - entrantCount (0 for power-of-two inputs)
 * - byeSeeds: top seeds (1 through numByes) that receive byes
 *
 * @param entrantCount - Number of actual entrants (3 to 128)
 * @returns Bracket sizing info with bye assignments
 *
 * @example
 * calculateBracketSizeWithByes(5) // { bracketSize: 8, numByes: 3, byeSeeds: [1, 2, 3] }
 * calculateBracketSizeWithByes(8) // { bracketSize: 8, numByes: 0, byeSeeds: [] }
 */
export function calculateBracketSizeWithByes(entrantCount: number): {
  bracketSize: number
  numByes: number
  byeSeeds: number[]
} {
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(entrantCount)))
  const numByes = bracketSize - entrantCount
  const byeSeeds = Array.from({ length: numByes }, (_, i) => i + 1)
  return { bracketSize, numByes, byeSeeds }
}

/**
 * Generate all matchup seeds for a bracket with automatic bye placement.
 *
 * Uses the full power-of-two bracket structure from generateMatchups, then
 * marks round 1 matchups where a seed exceeds the entrant count as byes:
 * - The phantom seed slot (> entrantCount) is replaced with null
 * - isBye is set to true on those matchups
 * - The real entrant auto-advances (handled at DB level, not here)
 *
 * For power-of-two inputs, all matchups have isBye=false (no byes needed).
 *
 * Standard seeding ensures top seeds face the phantom positions:
 * - Seed 1 vs Seed bracketSize (highest phantom seed)
 * - Seed 2 vs Seed bracketSize-1
 * - etc.
 *
 * This means top seeds naturally receive byes.
 *
 * @param entrantCount - Number of actual entrants (3 to 128)
 * @returns Array of MatchupSeedWithBye objects for the full bracket
 *
 * @example
 * // 5 entrants in 8-bracket:
 * // R1P1: seed 1 vs BYE(8) -> isBye=true
 * // R1P2: seed 4 vs seed 5 -> isBye=false
 * // R1P3: seed 2 vs BYE(7) -> isBye=true
 * // R1P4: seed 3 vs BYE(6) -> isBye=true
 */
export function generateMatchupsWithByes(
  entrantCount: number
): MatchupSeedWithBye[] {
  const { bracketSize } = calculateBracketSizeWithByes(entrantCount)

  // Generate the full power-of-two bracket structure
  const matchups = generateMatchups(bracketSize)

  // Map over all matchups, adding isBye field
  return matchups.map((m): MatchupSeedWithBye => {
    if (m.round === 1) {
      // Check if either seed is a phantom (exceeds actual entrant count)
      const e1IsBye =
        m.entrant1Seed !== null && m.entrant1Seed > entrantCount
      const e2IsBye =
        m.entrant2Seed !== null && m.entrant2Seed > entrantCount

      return {
        ...m,
        entrant1Seed: e1IsBye ? null : m.entrant1Seed,
        entrant2Seed: e2IsBye ? null : m.entrant2Seed,
        isBye: e1IsBye || e2IsBye,
      }
    }

    // Later rounds: no byes, null seeds (filled by winners)
    return {
      ...m,
      isBye: false,
    }
  })
}
