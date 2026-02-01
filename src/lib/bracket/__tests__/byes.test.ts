import { describe, it, expect } from 'vitest'
import { calculateBracketSizeWithByes, generateMatchupsWithByes } from '../byes'
import type { MatchupSeedWithBye } from '../types'

describe('calculateBracketSizeWithByes', () => {
  describe('bracketSize calculation (next power of 2)', () => {
    it('3 entrants -> bracketSize 4', () => {
      const result = calculateBracketSizeWithByes(3)
      expect(result.bracketSize).toBe(4)
    })

    it('5 entrants -> bracketSize 8', () => {
      const result = calculateBracketSizeWithByes(5)
      expect(result.bracketSize).toBe(8)
    })

    it('6 entrants -> bracketSize 8', () => {
      const result = calculateBracketSizeWithByes(6)
      expect(result.bracketSize).toBe(8)
    })

    it('7 entrants -> bracketSize 8', () => {
      const result = calculateBracketSizeWithByes(7)
      expect(result.bracketSize).toBe(8)
    })

    it('10 entrants -> bracketSize 16', () => {
      const result = calculateBracketSizeWithByes(10)
      expect(result.bracketSize).toBe(16)
    })
  })

  describe('power-of-two inputs produce zero byes', () => {
    it('4 entrants -> bracketSize 4, numByes 0', () => {
      const result = calculateBracketSizeWithByes(4)
      expect(result.bracketSize).toBe(4)
      expect(result.numByes).toBe(0)
      expect(result.byeSeeds).toEqual([])
    })

    it('8 entrants -> bracketSize 8, numByes 0', () => {
      const result = calculateBracketSizeWithByes(8)
      expect(result.bracketSize).toBe(8)
      expect(result.numByes).toBe(0)
      expect(result.byeSeeds).toEqual([])
    })

    it('16 entrants -> bracketSize 16, numByes 0', () => {
      const result = calculateBracketSizeWithByes(16)
      expect(result.bracketSize).toBe(16)
      expect(result.numByes).toBe(0)
      expect(result.byeSeeds).toEqual([])
    })

    it('32 entrants -> bracketSize 32, numByes 0', () => {
      const result = calculateBracketSizeWithByes(32)
      expect(result.bracketSize).toBe(32)
      expect(result.numByes).toBe(0)
      expect(result.byeSeeds).toEqual([])
    })

    it('64 entrants -> bracketSize 64, numByes 0', () => {
      const result = calculateBracketSizeWithByes(64)
      expect(result.bracketSize).toBe(64)
      expect(result.numByes).toBe(0)
      expect(result.byeSeeds).toEqual([])
    })
  })

  describe('numByes calculation', () => {
    it('3 entrants -> 1 bye', () => {
      expect(calculateBracketSizeWithByes(3).numByes).toBe(1)
    })

    it('5 entrants -> 3 byes', () => {
      expect(calculateBracketSizeWithByes(5).numByes).toBe(3)
    })

    it('6 entrants -> 2 byes', () => {
      expect(calculateBracketSizeWithByes(6).numByes).toBe(2)
    })

    it('7 entrants -> 1 bye', () => {
      expect(calculateBracketSizeWithByes(7).numByes).toBe(1)
    })

    it('10 entrants -> 6 byes', () => {
      expect(calculateBracketSizeWithByes(10).numByes).toBe(6)
    })
  })

  describe('byeSeeds: top seeds get byes', () => {
    it('3 entrants -> byeSeeds [1]', () => {
      expect(calculateBracketSizeWithByes(3).byeSeeds).toEqual([1])
    })

    it('5 entrants -> byeSeeds [1, 2, 3]', () => {
      expect(calculateBracketSizeWithByes(5).byeSeeds).toEqual([1, 2, 3])
    })

    it('6 entrants -> byeSeeds [1, 2]', () => {
      expect(calculateBracketSizeWithByes(6).byeSeeds).toEqual([1, 2])
    })

    it('7 entrants -> byeSeeds [1]', () => {
      expect(calculateBracketSizeWithByes(7).byeSeeds).toEqual([1])
    })

    it('10 entrants -> byeSeeds [1, 2, 3, 4, 5, 6]', () => {
      expect(calculateBracketSizeWithByes(10).byeSeeds).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('complete result objects', () => {
    it('3 entrants full result', () => {
      expect(calculateBracketSizeWithByes(3)).toEqual({
        bracketSize: 4,
        numByes: 1,
        byeSeeds: [1],
      })
    })

    it('5 entrants full result', () => {
      expect(calculateBracketSizeWithByes(5)).toEqual({
        bracketSize: 8,
        numByes: 3,
        byeSeeds: [1, 2, 3],
      })
    })

    it('8 entrants full result', () => {
      expect(calculateBracketSizeWithByes(8)).toEqual({
        bracketSize: 8,
        numByes: 0,
        byeSeeds: [],
      })
    })
  })
})

describe('generateMatchupsWithByes', () => {
  describe('total matchup count (full bracket structure)', () => {
    it('5 entrants -> 7 matchups (8-team bracket)', () => {
      const matchups = generateMatchupsWithByes(5)
      expect(matchups).toHaveLength(7)
    })

    it('3 entrants -> 3 matchups (4-team bracket)', () => {
      const matchups = generateMatchupsWithByes(3)
      expect(matchups).toHaveLength(3)
    })

    it('6 entrants -> 7 matchups (8-team bracket)', () => {
      const matchups = generateMatchupsWithByes(6)
      expect(matchups).toHaveLength(7)
    })

    it('10 entrants -> 15 matchups (16-team bracket)', () => {
      const matchups = generateMatchupsWithByes(10)
      expect(matchups).toHaveLength(15)
    })
  })

  describe('power-of-two inputs: no byes', () => {
    it('4 entrants: all matchups have isBye=false', () => {
      const matchups = generateMatchupsWithByes(4)
      expect(matchups.every((m) => m.isBye === false)).toBe(true)
    })

    it('8 entrants: all matchups have isBye=false', () => {
      const matchups = generateMatchupsWithByes(8)
      expect(matchups.every((m) => m.isBye === false)).toBe(true)
    })

    it('16 entrants: all matchups have isBye=false', () => {
      const matchups = generateMatchupsWithByes(16)
      expect(matchups.every((m) => m.isBye === false)).toBe(true)
    })

    it('64 entrants: all matchups have isBye=false', () => {
      const matchups = generateMatchupsWithByes(64)
      expect(matchups.every((m) => m.isBye === false)).toBe(true)
    })
  })

  describe('5 entrants in 8-bracket: bye matchup details', () => {
    let matchups: MatchupSeedWithBye[]
    let round1: MatchupSeedWithBye[]

    it('generates correct round 1 matchup structure', () => {
      matchups = generateMatchupsWithByes(5)
      round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1).toHaveLength(4)
    })

    it('R1P1: seed 1 vs BYE (seed 8 > 5 entrants) -> isBye=true', () => {
      matchups = generateMatchupsWithByes(5)
      round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      // Seed 1 vs Seed 8 -- seed 8 > 5 so it becomes BYE
      expect(round1[0].entrant1Seed).toBe(1)
      expect(round1[0].entrant2Seed).toBeNull()
      expect(round1[0].isBye).toBe(true)
    })

    it('R1P2: seed 4 vs seed 5 -> isBye=false (both real)', () => {
      matchups = generateMatchupsWithByes(5)
      round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1[1].entrant1Seed).toBe(4)
      expect(round1[1].entrant2Seed).toBe(5)
      expect(round1[1].isBye).toBe(false)
    })

    it('R1P3: seed 2 vs BYE (seed 7 > 5 entrants) -> isBye=true', () => {
      matchups = generateMatchupsWithByes(5)
      round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1[2].entrant1Seed).toBe(2)
      expect(round1[2].entrant2Seed).toBeNull()
      expect(round1[2].isBye).toBe(true)
    })

    it('R1P4: seed 3 vs BYE (seed 6 > 5 entrants) -> isBye=true', () => {
      matchups = generateMatchupsWithByes(5)
      round1 = matchups
        .filter((m) => m.round === 1)
        .sort((a, b) => a.position - b.position)
      expect(round1[3].entrant1Seed).toBe(3)
      expect(round1[3].entrant2Seed).toBeNull()
      expect(round1[3].isBye).toBe(true)
    })
  })

  describe('bye matchups have exactly one entrant', () => {
    it('bye matchups have one non-null seed and one null seed', () => {
      const matchups = generateMatchupsWithByes(5)
      const byeMatchups = matchups.filter((m) => m.isBye)
      expect(byeMatchups.length).toBe(3)
      for (const m of byeMatchups) {
        const nonNullSeeds = [m.entrant1Seed, m.entrant2Seed].filter(
          (s) => s !== null
        )
        expect(nonNullSeeds).toHaveLength(1)
      }
    })
  })

  describe('later rounds have isBye=false', () => {
    it('all non-round-1 matchups have isBye=false', () => {
      const matchups = generateMatchupsWithByes(5)
      const laterRounds = matchups.filter((m) => m.round > 1)
      expect(laterRounds.every((m) => m.isBye === false)).toBe(true)
    })
  })

  describe('nextMatchupPosition preserved for advancement chain', () => {
    it('all non-final matchups have nextMatchupPosition', () => {
      const matchups = generateMatchupsWithByes(5)
      // 8-team bracket has 3 rounds
      const nonFinal = matchups.filter((m) => m.round < 3)
      for (const m of nonFinal) {
        expect(m.nextMatchupPosition).not.toBeNull()
      }
    })

    it('final matchup has nextMatchupPosition = null', () => {
      const matchups = generateMatchupsWithByes(5)
      const final = matchups.find((m) => m.round === 3 && m.position === 1)
      expect(final).toBeDefined()
      expect(final!.nextMatchupPosition).toBeNull()
    })

    it('round 1 bye matchups still chain to round 2', () => {
      const matchups = generateMatchupsWithByes(5)
      const round1Byes = matchups.filter(
        (m) => m.round === 1 && m.isBye === true
      )
      for (const m of round1Byes) {
        expect(m.nextMatchupPosition).toBeDefined()
        expect(m.nextMatchupPosition!.round).toBe(2)
      }
    })
  })

  describe('7 entrants: single bye', () => {
    it('generates 7 matchups (8-team bracket)', () => {
      const matchups = generateMatchupsWithByes(7)
      expect(matchups).toHaveLength(7)
    })

    it('only 1 bye matchup (seed 8 is the only one > 7)', () => {
      const matchups = generateMatchupsWithByes(7)
      const byeMatchups = matchups.filter((m) => m.isBye)
      expect(byeMatchups).toHaveLength(1)
    })

    it('seed 1 gets the bye (top seed)', () => {
      const matchups = generateMatchupsWithByes(7)
      const byeMatchup = matchups.find((m) => m.isBye)!
      expect(byeMatchup.entrant1Seed).toBe(1)
      expect(byeMatchup.entrant2Seed).toBeNull()
    })
  })

  describe('6 entrants: two byes', () => {
    it('generates 7 matchups (8-team bracket)', () => {
      const matchups = generateMatchupsWithByes(6)
      expect(matchups).toHaveLength(7)
    })

    it('exactly 2 bye matchups', () => {
      const matchups = generateMatchupsWithByes(6)
      const byeMatchups = matchups.filter((m) => m.isBye)
      expect(byeMatchups).toHaveLength(2)
    })

    it('seeds 1 and 2 get byes', () => {
      const matchups = generateMatchupsWithByes(6)
      const byeMatchups = matchups
        .filter((m) => m.isBye)
        .sort((a, b) => a.position - b.position)
      const byeEntrants = byeMatchups.map((m) => m.entrant1Seed).sort()
      expect(byeEntrants).toEqual([1, 2])
    })
  })

  describe('large bracket: 10 entrants', () => {
    it('generates 15 matchups (16-team bracket)', () => {
      const matchups = generateMatchupsWithByes(10)
      expect(matchups).toHaveLength(15)
    })

    it('exactly 6 bye matchups', () => {
      const matchups = generateMatchupsWithByes(10)
      const byeMatchups = matchups.filter((m) => m.isBye)
      expect(byeMatchups).toHaveLength(6)
    })

    it('seeds 1 through 6 get byes', () => {
      const matchups = generateMatchupsWithByes(10)
      const byeMatchups = matchups.filter((m) => m.isBye)
      const byeEntrants = byeMatchups
        .map((m) => m.entrant1Seed!)
        .sort((a, b) => a - b)
      expect(byeEntrants).toEqual([1, 2, 3, 4, 5, 6])
    })
  })
})
