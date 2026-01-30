import { describe, it, expect } from 'vitest'
import { calculateRounds, generateMatchups, getStandardSeed } from '../engine'
import type { MatchupSeed } from '../types'

describe('calculateRounds', () => {
  it('returns 2 rounds for 4 entrants', () => {
    expect(calculateRounds(4)).toBe(2)
  })

  it('returns 3 rounds for 8 entrants', () => {
    expect(calculateRounds(8)).toBe(3)
  })

  it('returns 4 rounds for 16 entrants', () => {
    expect(calculateRounds(16)).toBe(4)
  })
})

describe('getStandardSeed', () => {
  describe('bracket size 4', () => {
    it('Match 1: Seed 1 vs Seed 4', () => {
      expect(getStandardSeed(1, 4, 1)).toBe(1)
      expect(getStandardSeed(1, 4, 2)).toBe(4)
    })

    it('Match 2: Seed 2 vs Seed 3', () => {
      expect(getStandardSeed(2, 4, 1)).toBe(2)
      expect(getStandardSeed(2, 4, 2)).toBe(3)
    })
  })

  describe('bracket size 8', () => {
    it('Match 1: 1v8', () => {
      expect(getStandardSeed(1, 8, 1)).toBe(1)
      expect(getStandardSeed(1, 8, 2)).toBe(8)
    })

    it('Match 2: 4v5', () => {
      expect(getStandardSeed(2, 8, 1)).toBe(4)
      expect(getStandardSeed(2, 8, 2)).toBe(5)
    })

    it('Match 3: 2v7', () => {
      expect(getStandardSeed(3, 8, 1)).toBe(2)
      expect(getStandardSeed(3, 8, 2)).toBe(7)
    })

    it('Match 4: 3v6', () => {
      expect(getStandardSeed(4, 8, 1)).toBe(3)
      expect(getStandardSeed(4, 8, 2)).toBe(6)
    })
  })

  describe('bracket size 16', () => {
    it('Match 1: 1v16', () => {
      expect(getStandardSeed(1, 16, 1)).toBe(1)
      expect(getStandardSeed(1, 16, 2)).toBe(16)
    })

    it('Match 2: 8v9', () => {
      expect(getStandardSeed(2, 16, 1)).toBe(8)
      expect(getStandardSeed(2, 16, 2)).toBe(9)
    })

    it('Match 3: 4v13', () => {
      expect(getStandardSeed(3, 16, 1)).toBe(4)
      expect(getStandardSeed(3, 16, 2)).toBe(13)
    })

    it('Match 4: 5v12', () => {
      expect(getStandardSeed(4, 16, 1)).toBe(5)
      expect(getStandardSeed(4, 16, 2)).toBe(12)
    })

    it('Match 5: 2v15', () => {
      expect(getStandardSeed(5, 16, 1)).toBe(2)
      expect(getStandardSeed(5, 16, 2)).toBe(15)
    })

    it('Match 6: 7v10', () => {
      expect(getStandardSeed(6, 16, 1)).toBe(7)
      expect(getStandardSeed(6, 16, 2)).toBe(10)
    })

    it('Match 7: 3v14', () => {
      expect(getStandardSeed(7, 16, 1)).toBe(3)
      expect(getStandardSeed(7, 16, 2)).toBe(14)
    })

    it('Match 8: 6v11', () => {
      expect(getStandardSeed(8, 16, 1)).toBe(6)
      expect(getStandardSeed(8, 16, 2)).toBe(11)
    })
  })
})

describe('generateMatchups', () => {
  describe('total matchup count', () => {
    it('returns 3 matchups for bracket size 4', () => {
      const matchups = generateMatchups(4)
      expect(matchups).toHaveLength(3)
    })

    it('returns 7 matchups for bracket size 8', () => {
      const matchups = generateMatchups(8)
      expect(matchups).toHaveLength(7)
    })

    it('returns 15 matchups for bracket size 16', () => {
      const matchups = generateMatchups(16)
      expect(matchups).toHaveLength(15)
    })
  })

  describe('round structure', () => {
    it('size 4: round 1 has 2 matchups, round 2 has 1', () => {
      const matchups = generateMatchups(4)
      const round1 = matchups.filter((m) => m.round === 1)
      const round2 = matchups.filter((m) => m.round === 2)
      expect(round1).toHaveLength(2)
      expect(round2).toHaveLength(1)
    })

    it('size 8: round 1 has 4, round 2 has 2, round 3 has 1', () => {
      const matchups = generateMatchups(8)
      const round1 = matchups.filter((m) => m.round === 1)
      const round2 = matchups.filter((m) => m.round === 2)
      const round3 = matchups.filter((m) => m.round === 3)
      expect(round1).toHaveLength(4)
      expect(round2).toHaveLength(2)
      expect(round3).toHaveLength(1)
    })

    it('size 16: round 1 has 8, round 2 has 4, round 3 has 2, round 4 has 1', () => {
      const matchups = generateMatchups(16)
      const round1 = matchups.filter((m) => m.round === 1)
      const round2 = matchups.filter((m) => m.round === 2)
      const round3 = matchups.filter((m) => m.round === 3)
      const round4 = matchups.filter((m) => m.round === 4)
      expect(round1).toHaveLength(8)
      expect(round2).toHaveLength(4)
      expect(round3).toHaveLength(2)
      expect(round4).toHaveLength(1)
    })
  })

  describe('first-round seed assignments', () => {
    it('size 4: first-round matchups have correct seeds', () => {
      const matchups = generateMatchups(4)
      const round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1[0].entrant1Seed).toBe(1)
      expect(round1[0].entrant2Seed).toBe(4)
      expect(round1[1].entrant1Seed).toBe(2)
      expect(round1[1].entrant2Seed).toBe(3)
    })

    it('size 8: first-round matchups have correct seeds', () => {
      const matchups = generateMatchups(8)
      const round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1[0].entrant1Seed).toBe(1)
      expect(round1[0].entrant2Seed).toBe(8)
      expect(round1[1].entrant1Seed).toBe(4)
      expect(round1[1].entrant2Seed).toBe(5)
      expect(round1[2].entrant1Seed).toBe(2)
      expect(round1[2].entrant2Seed).toBe(7)
      expect(round1[3].entrant1Seed).toBe(3)
      expect(round1[3].entrant2Seed).toBe(6)
    })
  })

  describe('later-round matchups have null seeds', () => {
    it('size 4: round 2 matchup has null seeds', () => {
      const matchups = generateMatchups(4)
      const round2 = matchups.filter((m) => m.round === 2)
      expect(round2[0].entrant1Seed).toBeNull()
      expect(round2[0].entrant2Seed).toBeNull()
    })

    it('size 8: rounds 2 and 3 have null seeds', () => {
      const matchups = generateMatchups(8)
      const laterRounds = matchups.filter((m) => m.round > 1)
      for (const matchup of laterRounds) {
        expect(matchup.entrant1Seed).toBeNull()
        expect(matchup.entrant2Seed).toBeNull()
      }
    })
  })

  describe('nextMatchupPosition linking', () => {
    it('all non-final matchups have nextMatchupPosition', () => {
      const matchups = generateMatchups(8)
      const totalRounds = 3
      const nonFinal = matchups.filter((m) => m.round < totalRounds)
      for (const matchup of nonFinal) {
        expect(matchup.nextMatchupPosition).not.toBeNull()
      }
    })

    it('final matchup has nextMatchupPosition = null', () => {
      const matchups = generateMatchups(8)
      const final = matchups.find(
        (m) => m.round === 3 && m.position === 1
      )
      expect(final).toBeDefined()
      expect(final!.nextMatchupPosition).toBeNull()
    })

    it('round 1 matchups point to correct round 2 positions', () => {
      const matchups = generateMatchups(8)
      const round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)

      // Match 1 and 2 feed into Round 2, Position 1
      expect(round1[0].nextMatchupPosition).toEqual({ round: 2, position: 1 })
      expect(round1[1].nextMatchupPosition).toEqual({ round: 2, position: 1 })

      // Match 3 and 4 feed into Round 2, Position 2
      expect(round1[2].nextMatchupPosition).toEqual({ round: 2, position: 2 })
      expect(round1[3].nextMatchupPosition).toEqual({ round: 2, position: 2 })
    })

    it('round 2 matchups point to correct round 3 positions', () => {
      const matchups = generateMatchups(8)
      const round2 = matchups
        .filter((m) => m.round === 2)
        .sort((a, b) => a.position - b.position)

      // Both R2 matchups feed into the final
      expect(round2[0].nextMatchupPosition).toEqual({ round: 3, position: 1 })
      expect(round2[1].nextMatchupPosition).toEqual({ round: 3, position: 1 })
    })
  })
})
