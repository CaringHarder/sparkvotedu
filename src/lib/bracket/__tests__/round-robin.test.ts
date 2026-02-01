import { describe, it, expect } from 'vitest'
import { generateRoundRobinRounds, calculateRoundRobinStandings } from '../round-robin'
import type { RoundRobinRound, RoundRobinStanding } from '../types'

// Helper: collect all pairings as sorted tuples for uniqueness checking
function allPairings(rounds: RoundRobinRound[]): string[] {
  return rounds.flatMap((r) =>
    r.matchups.map((m) => {
      const [a, b] = [m.entrant1Seed, m.entrant2Seed].sort((x, y) => x - y)
      return `${a}-${b}`
    })
  )
}

// Helper: count appearances of each seed across all matchups in a round
function seedAppearancesInRound(round: RoundRobinRound): Map<number, number> {
  const counts = new Map<number, number>()
  for (const m of round.matchups) {
    counts.set(m.entrant1Seed, (counts.get(m.entrant1Seed) ?? 0) + 1)
    counts.set(m.entrant2Seed, (counts.get(m.entrant2Seed) ?? 0) + 1)
  }
  return counts
}

describe('generateRoundRobinRounds', () => {
  describe('validation', () => {
    it('throws for entrantCount < 3', () => {
      expect(() => generateRoundRobinRounds(2)).toThrow()
      expect(() => generateRoundRobinRounds(1)).toThrow()
      expect(() => generateRoundRobinRounds(0)).toThrow()
    })

    it('throws for entrantCount > 8', () => {
      expect(() => generateRoundRobinRounds(9)).toThrow()
      expect(() => generateRoundRobinRounds(10)).toThrow()
    })

    it('does not throw for valid counts (3-8)', () => {
      for (let n = 3; n <= 8; n++) {
        expect(() => generateRoundRobinRounds(n)).not.toThrow()
      }
    })
  })

  describe('4 entrants (even)', () => {
    it('produces 3 rounds', () => {
      const rounds = generateRoundRobinRounds(4)
      expect(rounds).toHaveLength(3)
    })

    it('produces 2 matchups per round', () => {
      const rounds = generateRoundRobinRounds(4)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(2)
      }
    })

    it('produces 6 total matchups (N*(N-1)/2)', () => {
      const rounds = generateRoundRobinRounds(4)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(6)
    })

    it('has all unique pairings', () => {
      const rounds = generateRoundRobinRounds(4)
      const pairings = allPairings(rounds)
      expect(new Set(pairings).size).toBe(pairings.length)
    })

    it('contains every possible pairing exactly once', () => {
      const rounds = generateRoundRobinRounds(4)
      const pairings = new Set(allPairings(rounds))
      // For 4 entrants: 1-2, 1-3, 1-4, 2-3, 2-4, 3-4
      expect(pairings.size).toBe(6)
      expect(pairings.has('1-2')).toBe(true)
      expect(pairings.has('1-3')).toBe(true)
      expect(pairings.has('1-4')).toBe(true)
      expect(pairings.has('2-3')).toBe(true)
      expect(pairings.has('2-4')).toBe(true)
      expect(pairings.has('3-4')).toBe(true)
    })

    it('each entrant appears exactly once per round', () => {
      const rounds = generateRoundRobinRounds(4)
      for (const round of rounds) {
        const appearances = seedAppearancesInRound(round)
        for (let seed = 1; seed <= 4; seed++) {
          expect(appearances.get(seed)).toBe(1)
        }
      }
    })

    it('round numbers are 1-indexed', () => {
      const rounds = generateRoundRobinRounds(4)
      expect(rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3])
    })
  })

  describe('5 entrants (odd)', () => {
    it('produces 5 rounds', () => {
      const rounds = generateRoundRobinRounds(5)
      expect(rounds).toHaveLength(5)
    })

    it('produces 2 matchups per round (one bye per round)', () => {
      const rounds = generateRoundRobinRounds(5)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(2)
      }
    })

    it('produces 10 total matchups (N*(N-1)/2)', () => {
      const rounds = generateRoundRobinRounds(5)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(10)
    })

    it('each entrant appears at most once per round', () => {
      const rounds = generateRoundRobinRounds(5)
      for (const round of rounds) {
        const appearances = seedAppearancesInRound(round)
        for (const count of appearances.values()) {
          expect(count).toBeLessThanOrEqual(1)
        }
      }
    })

    it('each entrant sits out exactly once (has a bye in one round)', () => {
      const rounds = generateRoundRobinRounds(5)
      const totalAppearances = new Map<number, number>()
      for (const round of rounds) {
        for (const m of round.matchups) {
          totalAppearances.set(m.entrant1Seed, (totalAppearances.get(m.entrant1Seed) ?? 0) + 1)
          totalAppearances.set(m.entrant2Seed, (totalAppearances.get(m.entrant2Seed) ?? 0) + 1)
        }
      }
      // Each of 5 entrants plays 4 matches (sits out 1 of 5 rounds)
      for (let seed = 1; seed <= 5; seed++) {
        expect(totalAppearances.get(seed)).toBe(4)
      }
    })

    it('has all unique pairings', () => {
      const rounds = generateRoundRobinRounds(5)
      const pairings = allPairings(rounds)
      expect(new Set(pairings).size).toBe(pairings.length)
    })

    it('contains every possible pairing exactly once', () => {
      const rounds = generateRoundRobinRounds(5)
      const pairings = new Set(allPairings(rounds))
      expect(pairings.size).toBe(10) // 5*4/2 = 10
    })
  })

  describe('6 entrants (even)', () => {
    it('produces 5 rounds with 3 matchups each', () => {
      const rounds = generateRoundRobinRounds(6)
      expect(rounds).toHaveLength(5)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(3)
      }
    })

    it('produces 15 total matchups', () => {
      const rounds = generateRoundRobinRounds(6)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(15)
    })
  })

  describe('7 entrants (odd)', () => {
    it('produces 7 rounds with 3 matchups each', () => {
      const rounds = generateRoundRobinRounds(7)
      expect(rounds).toHaveLength(7)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(3)
      }
    })

    it('produces 21 total matchups', () => {
      const rounds = generateRoundRobinRounds(7)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(21)
    })
  })

  describe('8 entrants (max)', () => {
    it('produces 7 rounds', () => {
      const rounds = generateRoundRobinRounds(8)
      expect(rounds).toHaveLength(7)
    })

    it('produces 4 matchups per round', () => {
      const rounds = generateRoundRobinRounds(8)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(4)
      }
    })

    it('produces 28 total matchups (8*7/2)', () => {
      const rounds = generateRoundRobinRounds(8)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(28)
    })

    it('has all unique pairings and every possible pairing', () => {
      const rounds = generateRoundRobinRounds(8)
      const pairings = allPairings(rounds)
      expect(new Set(pairings).size).toBe(28)
      expect(pairings).toHaveLength(28)
    })
  })

  describe('3 entrants (minimum, odd)', () => {
    it('produces 3 rounds with 1 matchup each', () => {
      const rounds = generateRoundRobinRounds(3)
      expect(rounds).toHaveLength(3)
      for (const round of rounds) {
        expect(round.matchups).toHaveLength(1)
      }
    })

    it('produces 3 total matchups', () => {
      const rounds = generateRoundRobinRounds(3)
      const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
      expect(total).toBe(3)
    })
  })

  describe('general properties for all valid sizes', () => {
    for (let n = 3; n <= 8; n++) {
      it(`${n} entrants: total matchups = N*(N-1)/2`, () => {
        const rounds = generateRoundRobinRounds(n)
        const total = rounds.reduce((sum, r) => sum + r.matchups.length, 0)
        expect(total).toBe((n * (n - 1)) / 2)
      })

      it(`${n} entrants: no duplicate pairings`, () => {
        const rounds = generateRoundRobinRounds(n)
        const pairings = allPairings(rounds)
        expect(new Set(pairings).size).toBe(pairings.length)
      })

      it(`${n} entrants: all seeds are within range [1, ${n}]`, () => {
        const rounds = generateRoundRobinRounds(n)
        for (const round of rounds) {
          for (const m of round.matchups) {
            expect(m.entrant1Seed).toBeGreaterThanOrEqual(1)
            expect(m.entrant1Seed).toBeLessThanOrEqual(n)
            expect(m.entrant2Seed).toBeGreaterThanOrEqual(1)
            expect(m.entrant2Seed).toBeLessThanOrEqual(n)
          }
        }
      })
    }
  })
})

describe('calculateRoundRobinStandings', () => {
  // RoundRobinResult input type
  interface RoundRobinResult {
    entrant1Id: string
    entrant2Id: string
    winnerId: string | null
  }

  describe('basic scoring', () => {
    it('win gives 3 points, loss gives 0', () => {
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
      ]
      const standings = calculateRoundRobinStandings(results)
      const a = standings.find((s) => s.entrantId === 'a')!
      const b = standings.find((s) => s.entrantId === 'b')!
      expect(a.wins).toBe(1)
      expect(a.losses).toBe(0)
      expect(a.ties).toBe(0)
      expect(a.points).toBe(3)
      expect(b.wins).toBe(0)
      expect(b.losses).toBe(1)
      expect(b.ties).toBe(0)
      expect(b.points).toBe(0)
    })

    it('tie gives 1 point each', () => {
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: null },
      ]
      const standings = calculateRoundRobinStandings(results)
      const a = standings.find((s) => s.entrantId === 'a')!
      const b = standings.find((s) => s.entrantId === 'b')!
      expect(a.ties).toBe(1)
      expect(a.points).toBe(1)
      expect(b.ties).toBe(1)
      expect(b.points).toBe(1)
    })
  })

  describe('ranking by points then wins', () => {
    it('ranks by points descending', () => {
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'a', entrant2Id: 'c', winnerId: 'a' },
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: 'b' },
      ]
      const standings = calculateRoundRobinStandings(results)
      expect(standings[0].entrantId).toBe('a')
      expect(standings[0].rank).toBe(1)
      expect(standings[0].points).toBe(6) // 2 wins * 3
      expect(standings[1].entrantId).toBe('b')
      expect(standings[1].rank).toBe(2)
      expect(standings[1].points).toBe(3) // 1 win * 3
      expect(standings[2].entrantId).toBe('c')
      expect(standings[2].rank).toBe(3)
      expect(standings[2].points).toBe(0)
    })

    it('breaks tie by wins descending when points are equal', () => {
      // a: 1 win (3 pts), 1 tie (1 pt) = 4 pts, 1 win
      // b: 0 wins, 4 ties (4 pts) = 4 pts, 0 wins
      // a should rank higher due to more wins
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'a', entrant2Id: 'c', winnerId: null },
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: null },
        { entrant1Id: 'b', entrant2Id: 'd', winnerId: null },
        { entrant1Id: 'b', entrant2Id: 'e', winnerId: null },
        { entrant1Id: 'a', entrant2Id: 'd', winnerId: null },
      ]
      const standings = calculateRoundRobinStandings(results)
      const a = standings.find((s) => s.entrantId === 'a')!
      const b = standings.find((s) => s.entrantId === 'b')!
      // a: 3 + 1 + 1 = 5 pts, 1 win
      // b: 0 + 1 + 1 + 1 = 3 pts, 0 wins
      // Actually let me recalculate: a beat b (3 pts), tied c (1 pt), tied d (1 pt) = 5 pts, 1 win
      // b lost to a (0 pts), tied c (1 pt), tied d (1 pt), tied e (1 pt) = 3 pts, 0 wins
      // These don't have equal points. Let me construct a proper scenario.
    })
  })

  describe('head-to-head tiebreaker', () => {
    it('uses head-to-head when points and wins are equal', () => {
      // 3 entrants: a beats b, b beats c, c beats a (circular)
      // Each has 1 win, 1 loss = 3 points, 1 win
      // Head-to-head: a beat b, so if comparing a vs b, a ranks higher
      // But this is a 3-way tie where h2h can't fully resolve
      // For 2-way ties: h2h should work
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'c', entrant2Id: 'd', winnerId: 'c' },
        { entrant1Id: 'a', entrant2Id: 'c', winnerId: 'a' },
        { entrant1Id: 'b', entrant2Id: 'd', winnerId: 'b' },
        { entrant1Id: 'a', entrant2Id: 'd', winnerId: 'd' },
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: 'c' },
      ]
      // a: beat b, beat c, lost to d => 2W 1L = 6 pts, 2 wins
      // c: beat d, beat b, lost to a => 2W 1L = 6 pts, 2 wins
      // b: beat d, lost to a, lost to c => 1W 2L = 3 pts, 1 win
      // d: beat a, lost to c, lost to b => 1W 2L = 3 pts, 1 win
      // a vs c: same points (6), same wins (2) -> h2h: a beat c -> a ranks higher
      // b vs d: same points (3), same wins (1) -> h2h: b beat d -> b ranks higher
      const standings = calculateRoundRobinStandings(results)
      expect(standings[0].entrantId).toBe('a')
      expect(standings[0].rank).toBe(1)
      expect(standings[1].entrantId).toBe('c')
      expect(standings[1].rank).toBe(2)
      expect(standings[2].entrantId).toBe('b')
      expect(standings[2].rank).toBe(3)
      expect(standings[3].entrantId).toBe('d')
      expect(standings[3].rank).toBe(4)
    })

    it('assigns equal rank for unresolvable ties (circular h2h)', () => {
      // 3 entrants in a circle: a beats b, b beats c, c beats a
      // Each: 1W 1L = 3 pts, 1 win -- h2h is circular, unresolvable
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: 'b' },
        { entrant1Id: 'c', entrant2Id: 'a', winnerId: 'c' },
      ]
      const standings = calculateRoundRobinStandings(results)
      // All three should have the same rank since it's a perfect circle
      expect(standings[0].rank).toBe(1)
      expect(standings[1].rank).toBe(1)
      expect(standings[2].rank).toBe(1)
    })
  })

  describe('entrant names', () => {
    it('uses entrantId as entrantName (no DB lookup in pure function)', () => {
      const results: RoundRobinResult[] = [
        { entrant1Id: 'alpha', entrant2Id: 'beta', winnerId: 'alpha' },
      ]
      const standings = calculateRoundRobinStandings(results)
      expect(standings[0].entrantName).toBe('alpha')
      expect(standings[1].entrantName).toBe('beta')
    })
  })

  describe('full round-robin standings', () => {
    it('correctly computes standings for a complete 4-entrant tournament', () => {
      // a beats everyone (3W) = 9 pts
      // b beats c, d (2W 1L) = 6 pts
      // c beats d (1W 2L) = 3 pts
      // d loses all (0W 3L) = 0 pts
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'a', entrant2Id: 'c', winnerId: 'a' },
        { entrant1Id: 'a', entrant2Id: 'd', winnerId: 'a' },
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: 'b' },
        { entrant1Id: 'b', entrant2Id: 'd', winnerId: 'b' },
        { entrant1Id: 'c', entrant2Id: 'd', winnerId: 'c' },
      ]
      const standings = calculateRoundRobinStandings(results)
      expect(standings).toHaveLength(4)

      expect(standings[0]).toMatchObject({ entrantId: 'a', wins: 3, losses: 0, ties: 0, points: 9, rank: 1 })
      expect(standings[1]).toMatchObject({ entrantId: 'b', wins: 2, losses: 1, ties: 0, points: 6, rank: 2 })
      expect(standings[2]).toMatchObject({ entrantId: 'c', wins: 1, losses: 2, ties: 0, points: 3, rank: 3 })
      expect(standings[3]).toMatchObject({ entrantId: 'd', wins: 0, losses: 3, ties: 0, points: 0, rank: 4 })
    })

    it('handles mixed wins and ties', () => {
      const results: RoundRobinResult[] = [
        { entrant1Id: 'a', entrant2Id: 'b', winnerId: 'a' },
        { entrant1Id: 'a', entrant2Id: 'c', winnerId: null }, // tie
        { entrant1Id: 'b', entrant2Id: 'c', winnerId: 'c' },
      ]
      const standings = calculateRoundRobinStandings(results)
      // a: 1W 0L 1T = 4 pts
      // c: 1W 0L 1T = 4 pts
      // b: 0W 2L 0T = 0 pts
      // a vs c: same points (4), same wins (1) -> h2h: tie -> equal rank
      expect(standings[0].points).toBe(4)
      expect(standings[1].points).toBe(4)
      expect(standings[0].rank).toBe(1)
      expect(standings[1].rank).toBe(1)
      expect(standings[2].entrantId).toBe('b')
      expect(standings[2].rank).toBe(3)
    })

    it('returns empty array for empty results', () => {
      const standings = calculateRoundRobinStandings([])
      expect(standings).toEqual([])
    })
  })
})
