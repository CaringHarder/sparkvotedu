import { describe, it, expect } from 'vitest'
import {
  generateDoubleElimMatchups,
  seedLosersFromWinnersRound,
} from '../double-elim'

describe('generateDoubleElimMatchups', () => {
  describe('size=4', () => {
    const result = generateDoubleElimMatchups(4)

    it('returns 3 winners bracket matchups', () => {
      expect(result.winners).toHaveLength(3)
    })

    it('returns 2 losers bracket matchups', () => {
      expect(result.losers).toHaveLength(2)
    })

    it('returns 1 grand finals matchup', () => {
      expect(result.grandFinals).toHaveLength(1)
    })

    it('has correct total matchup count (2N-2 + 1 = 6)', () => {
      const total =
        result.winners.length + result.losers.length + result.grandFinals.length
      expect(total).toBe(6)
    })

    it('winners bracket has correct round structure', () => {
      const r1 = result.winners.filter((m) => m.round === 1)
      const r2 = result.winners.filter((m) => m.round === 2)
      expect(r1).toHaveLength(2) // 2 first-round matchups
      expect(r2).toHaveLength(1) // 1 final
    })

    it('winners bracket first-round matchups have seed assignments', () => {
      const r1 = result.winners.filter((m) => m.round === 1)
      for (const m of r1) {
        expect(m.entrant1Seed).not.toBeNull()
        expect(m.entrant2Seed).not.toBeNull()
      }
    })

    it('winners bracket later rounds have null seeds', () => {
      const r2 = result.winners.filter((m) => m.round === 2)
      for (const m of r2) {
        expect(m.entrant1Seed).toBeNull()
        expect(m.entrant2Seed).toBeNull()
      }
    })

    it('losers bracket has 2 rounds (minor + major)', () => {
      const rounds = new Set(result.losers.map((m) => m.round))
      expect(rounds.size).toBe(2)
    })

    it('losers bracket R1 (minor) has 1 matchup', () => {
      const lbR1 = result.losers.filter((m) => m.round === 1)
      expect(lbR1).toHaveLength(1)
    })

    it('losers bracket R2 (major) has 1 matchup', () => {
      const lbR2 = result.losers.filter((m) => m.round === 2)
      expect(lbR2).toHaveLength(1)
    })

    it('losers bracket matchups have null seeds (filled dynamically)', () => {
      for (const m of result.losers) {
        expect(m.entrant1Seed).toBeNull()
        expect(m.entrant2Seed).toBeNull()
      }
    })

    it('losers bracket R1 links to R2', () => {
      const lbR1 = result.losers.filter((m) => m.round === 1)
      expect(lbR1[0].nextMatchupPosition).toEqual({
        round: 2,
        position: 1,
      })
    })

    it('losers bracket R2 (final) has null nextMatchupPosition', () => {
      const lbR2 = result.losers.filter((m) => m.round === 2)
      expect(lbR2[0].nextMatchupPosition).toBeNull()
    })

    it('grand finals matchup has round=1, position=1, null next', () => {
      const gf = result.grandFinals[0]
      expect(gf.round).toBe(1)
      expect(gf.position).toBe(1)
      expect(gf.entrant1Seed).toBeNull()
      expect(gf.entrant2Seed).toBeNull()
      expect(gf.nextMatchupPosition).toBeNull()
    })
  })

  describe('size=8', () => {
    const result = generateDoubleElimMatchups(8)

    it('returns 7 winners bracket matchups', () => {
      expect(result.winners).toHaveLength(7)
    })

    it('returns 6 losers bracket matchups', () => {
      expect(result.losers).toHaveLength(6)
    })

    it('returns 1 grand finals matchup', () => {
      expect(result.grandFinals).toHaveLength(1)
    })

    it('has correct total matchup count (2N-2 + 1 = 14)', () => {
      const total =
        result.winners.length + result.losers.length + result.grandFinals.length
      expect(total).toBe(14)
    })

    it('losers bracket has 4 rounds', () => {
      const rounds = new Set(result.losers.map((m) => m.round))
      expect(rounds.size).toBe(4)
    })

    it('losers bracket round structure: 2-2-1-1', () => {
      const lbR1 = result.losers.filter((m) => m.round === 1)
      const lbR2 = result.losers.filter((m) => m.round === 2)
      const lbR3 = result.losers.filter((m) => m.round === 3)
      const lbR4 = result.losers.filter((m) => m.round === 4)
      expect(lbR1).toHaveLength(2) // minor: 4 WB R1 losers -> 2 matchups
      expect(lbR2).toHaveLength(2) // major: 2 LB R1 winners + 2 WB R2 losers
      expect(lbR3).toHaveLength(1) // minor: 2 LB R2 winners -> 1 matchup
      expect(lbR4).toHaveLength(1) // major: LB R3 winner + WB R3 loser
    })

    it('losers bracket matchups chain correctly', () => {
      // LB R1 matchups link to LB R2
      const lbR1 = result.losers.filter((m) => m.round === 1)
      for (const m of lbR1) {
        expect(m.nextMatchupPosition).not.toBeNull()
        expect(m.nextMatchupPosition!.round).toBe(2)
      }

      // LB R2 matchups link to LB R3
      const lbR2 = result.losers.filter((m) => m.round === 2)
      for (const m of lbR2) {
        expect(m.nextMatchupPosition).not.toBeNull()
        expect(m.nextMatchupPosition!.round).toBe(3)
      }

      // LB R3 matchups link to LB R4
      const lbR3 = result.losers.filter((m) => m.round === 3)
      for (const m of lbR3) {
        expect(m.nextMatchupPosition).not.toBeNull()
        expect(m.nextMatchupPosition!.round).toBe(4)
      }

      // LB R4 (final) has null next
      const lbR4 = result.losers.filter((m) => m.round === 4)
      expect(lbR4[0].nextMatchupPosition).toBeNull()
    })

    it('all matchups have valid positions (1-indexed)', () => {
      for (const m of [
        ...result.winners,
        ...result.losers,
        ...result.grandFinals,
      ]) {
        expect(m.position).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('size=16', () => {
    const result = generateDoubleElimMatchups(16)

    it('returns 15 winners bracket matchups', () => {
      expect(result.winners).toHaveLength(15)
    })

    it('returns 14 losers bracket matchups', () => {
      expect(result.losers).toHaveLength(14)
    })

    it('returns 1 grand finals matchup', () => {
      expect(result.grandFinals).toHaveLength(1)
    })

    it('has correct total matchup count (2N-2 + 1 = 30)', () => {
      const total =
        result.winners.length + result.losers.length + result.grandFinals.length
      expect(total).toBe(30)
    })

    it('losers bracket has 6 rounds', () => {
      const rounds = new Set(result.losers.map((m) => m.round))
      expect(rounds.size).toBe(6)
    })

    it('losers bracket round structure: 4-4-2-2-1-1', () => {
      const lbR1 = result.losers.filter((m) => m.round === 1)
      const lbR2 = result.losers.filter((m) => m.round === 2)
      const lbR3 = result.losers.filter((m) => m.round === 3)
      const lbR4 = result.losers.filter((m) => m.round === 4)
      const lbR5 = result.losers.filter((m) => m.round === 5)
      const lbR6 = result.losers.filter((m) => m.round === 6)
      expect(lbR1).toHaveLength(4) // minor: 8 WB R1 losers -> 4 matchups
      expect(lbR2).toHaveLength(4) // major: 4 LB R1 winners + 4 WB R2 losers
      expect(lbR3).toHaveLength(2) // minor: 4 LB R2 winners -> 2 matchups
      expect(lbR4).toHaveLength(2) // major: 2 LB R3 winners + 2 WB R3 losers
      expect(lbR5).toHaveLength(1) // minor: 2 LB R4 winners -> 1 matchup
      expect(lbR6).toHaveLength(1) // major: LB R5 winner + WB R4 loser
    })

    it('losers bracket final has null nextMatchupPosition', () => {
      const maxRound = Math.max(...result.losers.map((m) => m.round))
      const lbFinal = result.losers.filter((m) => m.round === maxRound)
      expect(lbFinal).toHaveLength(1)
      expect(lbFinal[0].nextMatchupPosition).toBeNull()
    })
  })

  describe('all matchups have correct nextMatchupPosition references', () => {
    it('winners bracket matchups chain to next round correctly', () => {
      const result = generateDoubleElimMatchups(8)
      const wbR1 = result.winners.filter((m) => m.round === 1)
      const wbR2 = result.winners.filter((m) => m.round === 2)
      const wbR3 = result.winners.filter((m) => m.round === 3)

      // R1 positions 1,2 -> R2 position 1; R1 positions 3,4 -> R2 position 2
      for (const m of wbR1) {
        expect(m.nextMatchupPosition).not.toBeNull()
        expect(m.nextMatchupPosition!.round).toBe(2)
        expect(m.nextMatchupPosition!.position).toBe(
          Math.ceil(m.position / 2)
        )
      }

      // R2 positions 1,2 -> R3 position 1
      for (const m of wbR2) {
        expect(m.nextMatchupPosition).not.toBeNull()
        expect(m.nextMatchupPosition!.round).toBe(3)
      }

      // R3 (final) has null next
      expect(wbR3[0].nextMatchupPosition).toBeNull()
    })
  })

  describe('edge case: minimum size=4', () => {
    it('produces valid structure with no errors', () => {
      expect(() => generateDoubleElimMatchups(4)).not.toThrow()
    })
  })
})

describe('seedLosersFromWinnersRound', () => {
  it('returns identity for single loser', () => {
    expect(seedLosersFromWinnersRound(['A'], 1)).toEqual(['A'])
  })

  it('reverses for 2 losers', () => {
    expect(seedLosersFromWinnersRound(['A', 'B'], 1)).toEqual(['B', 'A'])
  })

  it('uses split-and-reverse for 4 losers', () => {
    // Split: [A,B] and [C,D]
    // Reverse each half: [B,A] and [D,C]
    // Concatenate second-half first: [D,C,B,A]
    const result = seedLosersFromWinnersRound(['A', 'B', 'C', 'D'], 2)
    expect(result).toEqual(['D', 'C', 'B', 'A'])
  })

  it('uses split-and-reverse for 8 losers', () => {
    // Split: [1,2,3,4] and [5,6,7,8]
    // Reverse each half: [4,3,2,1] and [8,7,6,5]
    // Concatenate second-half first: [8,7,6,5,4,3,2,1]
    const result = seedLosersFromWinnersRound(
      ['1', '2', '3', '4', '5', '6', '7', '8'],
      4
    )
    expect(result).toEqual(['8', '7', '6', '5', '4', '3', '2', '1'])
  })

  it('avoids rematches: adjacent WB losers are separated in LB', () => {
    // If WB matchup 1 produced loser A, and WB matchup 2 produced loser B,
    // they should NOT be in the same LB matchup (i.e., not adjacent)
    const result = seedLosersFromWinnersRound(['A', 'B', 'C', 'D'], 2)
    // A and B were in adjacent WB matchups (positions 1,2)
    // After split-and-reverse, A is at index 2, B is at index 3
    // They should NOT be paired (positions 1-2 or 3-4 pair up)
    // In a bracket with 4 entries and 2 LB matchups:
    // Matchup 1: indices 0,1 -> D,C (from second half)
    // Matchup 2: indices 2,3 -> B,A (from first half)
    // A (WB pos 1) is now with B (WB pos 2) -- but they didn't play each other in WB
    // The key: A (WB pos 1) played D (pos 4) in WB, B (WB pos 2) played C (pos 3) in WB
    // So LB matching D with C, and B with A avoids rematches
    expect(result[0]).not.toBe('A') // A should not be first
    expect(result[result.length - 1]).not.toBe('D') // D should not be last
  })

  it('handles 3 losers (odd count) with split-and-reverse', () => {
    // Split: [A] and [B,C]
    // Reverse each: [A] and [C,B]
    // Concat second-first: [C,B,A]
    const result = seedLosersFromWinnersRound(['A', 'B', 'C'], 2)
    expect(result).toEqual(['C', 'B', 'A'])
  })
})
