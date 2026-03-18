/**
 * Final Four pairing utilities.
 *
 * NCAA Final Four matchups pair two regions vs two regions in the semifinals.
 * For 4 regions there are exactly 3 possible pairings. This module generates
 * those options, parses stored pairing strings, and auto-detects the pairing
 * from ESPN game data when R5 (Final Four) games are available.
 */

import type { SportsGame } from '@/lib/sports/types'

/**
 * Represents one possible Final Four pairing configuration.
 * `value` is the canonical stored format: "RegionA-RegionB,RegionC-RegionD"
 * `semis` contains the two semifinal matchups as [regionA, regionB] tuples.
 */
export interface FinalFourPairing {
  label: string
  value: string
  semis: [string, string][]
}

/**
 * Generate all 3 possible Final Four pairings for the given 4 regions.
 * Returns empty array if regions.length !== 4.
 *
 * For regions [A, B, C, D], the three pairings are:
 *   1. A vs B, C vs D
 *   2. A vs C, B vs D
 *   3. A vs D, B vs C
 */
export function getFinalFourPairings(regions: string[]): FinalFourPairing[] {
  if (regions.length !== 4) return []

  const [a, b, c, d] = regions

  const pairings: [string, string][][] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ]

  return pairings.map((semis) => {
    const value = semis.map(([r1, r2]) => `${r1}-${r2}`).join(',')
    const label = semis.map(([r1, r2]) => `${r1} vs ${r2}`).join(', ')
    return { label, value, semis }
  })
}

/**
 * Parse a stored pairing string back into an array of [regionA, regionB] tuples.
 *
 * Input format: "East-West,South-Midwest"
 * Output: [["East", "West"], ["South", "Midwest"]]
 */
export function parsePairing(pairingStr: string): [string, string][] {
  return pairingStr.split(',').map((pair) => {
    const [a, b] = pair.split('-')
    return [a, b]
  })
}

/**
 * Detect the Final Four pairing from ESPN game data.
 *
 * Looks at R5 (Final Four semifinal) games to determine which regions are
 * paired together. If two R5 games exist with region data, extracts the
 * home/away team regions from R4 feeders to determine the pairing.
 *
 * Returns the matching pairing value string, or null if R5 data is not
 * available or regions cannot be determined.
 */
export function detectDefaultPairing(
  games: SportsGame[],
  regions: string[]
): string | null {
  if (regions.length !== 4) return null

  // R5 games are the Final Four semifinals
  const r5Games = games.filter((g) => g.round === 5)
  if (r5Games.length < 2) return null

  // Try to detect pairings from R5 game bracket regions
  // ESPN sometimes labels R5 games with the two regions that feed them
  // e.g., bracket = "Final Four" for all R5 games -- not helpful
  // Instead, look at R4 games and their advancement links
  const r4Games = games.filter((g) => g.round === 4)
  if (r4Games.length < 4) return null

  // Map R4 games to R5 games via previousHomeGameId/previousAwayGameId
  const detectedSemis: [string, string][] = []

  for (const r5Game of r5Games) {
    const feeders: string[] = []

    if (r5Game.previousHomeGameId) {
      const feeder = r4Games.find((g) => g.externalId === r5Game.previousHomeGameId)
      if (feeder?.bracket) feeders.push(feeder.bracket)
    }
    if (r5Game.previousAwayGameId) {
      const feeder = r4Games.find((g) => g.externalId === r5Game.previousAwayGameId)
      if (feeder?.bracket) feeders.push(feeder.bracket)
    }

    if (feeders.length === 2) {
      detectedSemis.push([feeders[0], feeders[1]])
    }
  }

  if (detectedSemis.length < 2) return null

  // Build the canonical pairing value and check if it matches a valid option
  const allPairings = getFinalFourPairings(regions)

  for (const pairing of allPairings) {
    // Check if detected semis match this pairing (order within each semi doesn't matter)
    const matches = detectedSemis.every((detected) =>
      pairing.semis.some(
        (semi) =>
          (semi[0] === detected[0] && semi[1] === detected[1]) ||
          (semi[0] === detected[1] && semi[1] === detected[0])
      )
    )
    if (matches) return pairing.value
  }

  return null
}
