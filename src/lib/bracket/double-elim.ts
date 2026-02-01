import type { MatchupSeed, DoubleElimMatchups } from './types'
import { generateMatchups, getStandardSeed } from './engine'

/**
 * Generate all matchup seeds for a double-elimination bracket.
 *
 * Returns three separate arrays:
 * - winners: Standard single-elimination bracket (reuses engine.ts)
 * - losers: Alternating minor/major round structure
 * - grandFinals: Single matchup (WB champion vs LB champion)
 *
 * Losers bracket structure:
 * - LB Round 1 (minor): WB R1 losers play each other (size/4 matchups)
 * - Then for each remaining WB round (2 through log2(size)):
 *   - Major round: LB survivors play WB dropdowns (currentFieldSize matchups)
 *   - Minor round: LB survivors play each other (currentFieldSize/2 matchups, if >1)
 *
 * Total matchups: 2N-2 for winners+losers, plus 1 grand finals = 2N-1
 *
 * @param size - Number of entrants (must be power of 2, at least 4)
 * @returns DoubleElimMatchups with winners, losers, and grandFinals arrays
 */
export function generateDoubleElimMatchups(size: number): DoubleElimMatchups {
  // Winners bracket = standard single-elimination
  const winners = generateMatchups(size)

  // Build losers bracket
  const wbRounds = Math.log2(size)
  const losers: MatchupSeed[] = []

  let lbRound = 1

  // LB Round 1 (minor): WB R1 losers play each other
  // WB R1 has size/2 matchups, producing size/2 losers -> size/4 LB matchups
  const lbR1MatchupCount = size / 4

  for (let pos = 1; pos <= lbR1MatchupCount; pos++) {
    losers.push({
      round: lbRound,
      position: pos,
      entrant1Seed: null,
      entrant2Seed: null,
      nextMatchupPosition: {
        round: lbRound + 1,
        position: pos,
      },
    })
  }
  lbRound++

  // Remaining LB rounds: alternate major and minor for each WB round 2+
  let currentFieldSize = lbR1MatchupCount // number of LB matchups (= survivors from LB R1)

  for (let wbRoundIdx = 2; wbRoundIdx <= wbRounds; wbRoundIdx++) {
    // Major round: currentFieldSize matchups
    // LB survivors (currentFieldSize) + WB dropdowns (currentFieldSize) = currentFieldSize matchups
    for (let pos = 1; pos <= currentFieldSize; pos++) {
      const hasMinorRoundAfter = currentFieldSize > 1

      let nextPos: { round: number; position: number } | null = null
      if (hasMinorRoundAfter) {
        // Links to the minor round that follows
        nextPos = {
          round: lbRound + 1,
          position: Math.ceil(pos / 2),
        }
      }
      // If this is the last major round and no minor follows, this is the LB final
      // nextMatchupPosition = null (links to grand finals externally)

      losers.push({
        round: lbRound,
        position: pos,
        entrant1Seed: null,
        entrant2Seed: null,
        nextMatchupPosition: nextPos,
      })
    }
    lbRound++

    // Minor round: halve the field (only if more than 1 survivor)
    if (currentFieldSize > 1) {
      currentFieldSize = currentFieldSize / 2

      for (let pos = 1; pos <= currentFieldSize; pos++) {
        const isLastWBRound = wbRoundIdx === wbRounds

        let nextPos: { round: number; position: number } | null = null
        if (!isLastWBRound) {
          // Links to next major round
          nextPos = {
            round: lbRound + 1,
            position: pos,
          }
        }
        // If this is the last minor round, this is the LB final
        // nextMatchupPosition = null (links to grand finals externally)

        losers.push({
          round: lbRound,
          position: pos,
          entrant1Seed: null,
          entrant2Seed: null,
          nextMatchupPosition: nextPos,
        })
      }
      lbRound++
    }
  }

  // Grand finals: single matchup
  const grandFinals: MatchupSeed[] = [
    {
      round: 1,
      position: 1,
      entrant1Seed: null,
      entrant2Seed: null,
      nextMatchupPosition: null,
    },
  ]

  return { winners, losers, grandFinals }
}

/**
 * Seed losers from a winners bracket round into the losers bracket,
 * using split-and-reverse to avoid rematches.
 *
 * Algorithm:
 * - For 1 loser: return as-is (identity)
 * - For 2 losers: simple reverse
 * - For 3+ losers: split at midpoint, reverse each half, concatenate second-half first
 *
 * This ensures that players from the same WB region end up on opposite sides
 * of the LB, preventing immediate rematches.
 *
 * @param wbLosers - Losers ordered by their WB matchup position
 * @param lbRoundSize - Number of available LB slots (not currently used for placement, reserved)
 * @returns Reordered array for LB placement
 */
export function seedLosersFromWinnersRound(
  wbLosers: string[],
  lbRoundSize: number
): string[] {
  if (wbLosers.length <= 1) {
    return [...wbLosers]
  }

  if (wbLosers.length === 2) {
    return [...wbLosers].reverse()
  }

  // Split-and-reverse for 3+ losers
  const mid = Math.floor(wbLosers.length / 2)
  const firstHalf = wbLosers.slice(0, mid).reverse()
  const secondHalf = wbLosers.slice(mid).reverse()
  return [...secondHalf, ...firstHalf]
}

/**
 * Generate play-in round matchups (NCAA First Four style).
 *
 * Play-in rounds add extra entrants beyond the main bracket size.
 * The lowest seeds play in round 0 to earn entry into the main bracket's
 * lowest seed slots in round 1.
 *
 * For example, with mainBracketSize=64 and playInCount=8:
 * - Total entrants: 72 (64 main + 8 extra)
 * - 8 play-in entrants pair into 4 play-in matches
 * - Winners fill seeds 61-64 in the main bracket R1
 *
 * Pairing: highest play-in seed vs lowest play-in seed:
 * - Match 1: seed (mainSize - playInMatchCount + 1) vs seed (totalEntrants)
 * - Match 2: seed (mainSize - playInMatchCount + 2) vs seed (totalEntrants - 1)
 * - etc.
 *
 * @param mainBracketSize - Size of the main bracket (power of 2)
 * @param playInCount - Number of extra entrants beyond main bracket size (must be even)
 * @returns Play-in matchup seeds and mapping of which main bracket seeds they fill
 */
export function generatePlayInRound(
  mainBracketSize: number,
  playInCount: number
): {
  playInMatchups: MatchupSeed[]
  mainBracketSlotsToFill: { playInPosition: number; mainBracketSeed: number }[]
} {
  const playInMatchCount = playInCount / 2
  const totalEntrants = mainBracketSize + playInCount

  const playInMatchups: MatchupSeed[] = []
  const mainBracketSlotsToFill: { playInPosition: number; mainBracketSeed: number }[] = []

  for (let i = 0; i < playInMatchCount; i++) {
    const position = i + 1
    // The main bracket seed this play-in match fills
    const mainSeedSlot = mainBracketSize - playInMatchCount + 1 + i

    // Pairing: highest available play-in seed vs lowest available
    const highSeed = mainSeedSlot // e.g., 61, 62, 63, 64
    const lowSeed = totalEntrants - i // e.g., 72, 71, 70, 69

    playInMatchups.push({
      round: 0,
      position,
      entrant1Seed: highSeed,
      entrant2Seed: lowSeed,
      nextMatchupPosition: null, // Wired by DAL to the correct WB R1 matchup
    })

    mainBracketSlotsToFill.push({
      playInPosition: position,
      mainBracketSeed: mainSeedSlot,
    })
  }

  return { playInMatchups, mainBracketSlotsToFill }
}

/**
 * Find which R1 matchup position contains a given seed and which slot (entrant1/entrant2).
 *
 * Uses getStandardSeed to scan all R1 positions until the seed is found.
 *
 * @param seed - The seed number to locate
 * @param bracketSize - The main bracket size
 * @returns The matchup position and slot, or null if not found
 */
export function findR1PositionForSeed(
  seed: number,
  bracketSize: number
): { position: number; slot: 1 | 2 } | null {
  const r1MatchCount = bracketSize / 2
  for (let pos = 1; pos <= r1MatchCount; pos++) {
    if (getStandardSeed(pos, bracketSize, 1) === seed) {
      return { position: pos, slot: 1 }
    }
    if (getStandardSeed(pos, bracketSize, 2) === seed) {
      return { position: pos, slot: 2 }
    }
  }
  return null
}
