import { describe, it, expect } from 'vitest'
import { computeBordaScores, computeBordaLeaderboard } from '../borda'

describe('computeBordaScores', () => {
  it('computes correct scores for full rankings with 3 options', () => {
    // 3 options, 2 voters
    // Voter 1: A=1st, B=2nd, C=3rd
    // Voter 2: A=1st, C=2nd, B=3rd
    const votes = [
      { optionId: 'A', rank: 1 },
      { optionId: 'B', rank: 2 },
      { optionId: 'C', rank: 3 },
      { optionId: 'A', rank: 1 },
      { optionId: 'C', rank: 2 },
      { optionId: 'B', rank: 3 },
    ]

    const result = computeBordaScores(votes, 3)

    // A: (3-1)+(3-1) = 4, B: (3-2)+(3-3) = 1, C: (3-3)+(3-2) = 1
    expect(result).toEqual([
      { optionId: 'A', points: 4 },
      { optionId: 'B', points: 1 },
      { optionId: 'C', points: 1 },
    ])
  })

  it('handles the verification example from the plan', () => {
    // From plan: computeBordaScores([{A,1},{B,2},{A,1},{C,2}], 3)
    // A: (3-1)+(3-1) = 4, B: (3-2) = 1, C: (3-2) = 1
    const votes = [
      { optionId: 'A', rank: 1 },
      { optionId: 'B', rank: 2 },
      { optionId: 'A', rank: 1 },
      { optionId: 'C', rank: 2 },
    ]

    const result = computeBordaScores(votes, 3)

    expect(result[0]).toEqual({ optionId: 'A', points: 4 })
    expect(result).toHaveLength(3)
    // B and C both have 1 point
    const bAndC = result.filter((r) => r.optionId === 'B' || r.optionId === 'C')
    expect(bAndC.every((r) => r.points === 1)).toBe(true)
  })

  it('returns sorted descending by points', () => {
    const votes = [
      { optionId: 'C', rank: 1 },
      { optionId: 'A', rank: 2 },
      { optionId: 'B', rank: 3 },
    ]

    const result = computeBordaScores(votes, 3)

    expect(result[0].optionId).toBe('C')
    expect(result[0].points).toBe(2)
  })

  it('handles empty votes', () => {
    const result = computeBordaScores([], 5)
    expect(result).toEqual([])
  })

  it('ignores votes with rank exceeding pointBase', () => {
    // pointBase=2 means rank 1 gets 1 point, rank 2 gets 0, rank 3 gets -1 (ignored)
    const votes = [
      { optionId: 'A', rank: 1 },
      { optionId: 'B', rank: 2 },
      { optionId: 'C', rank: 3 },
    ]

    const result = computeBordaScores(votes, 2)

    expect(result).toEqual([
      { optionId: 'A', points: 1 },
      { optionId: 'B', points: 0 },
    ])
  })
})

describe('computeBordaLeaderboard', () => {
  it('computes leaderboard with full rankings', () => {
    const votes = [
      { optionId: 'A', rank: 1, participantId: 'p1' },
      { optionId: 'B', rank: 2, participantId: 'p1' },
      { optionId: 'C', rank: 3, participantId: 'p1' },
      { optionId: 'B', rank: 1, participantId: 'p2' },
      { optionId: 'A', rank: 2, participantId: 'p2' },
      { optionId: 'C', rank: 3, participantId: 'p2' },
    ]

    const result = computeBordaLeaderboard(votes, 3, 2)

    // A: (3-1)+(3-2) = 3, B: (3-2)+(3-1) = 3, C: (3-3)+(3-3) = 0
    // maxPossible = (3-1)*2 = 4
    expect(result[0].maxPossiblePoints).toBe(4)
    expect(result[0].totalPoints).toBe(3)
    expect(result[0].voterCount).toBe(2)
    expect(result[2].totalPoints).toBe(0)
  })

  it('uses rankingDepth as base for partial rankings', () => {
    // 5 options but only rank top 3 (rankingDepth=3)
    // Base should be 3, not 5
    const votes = [
      { optionId: 'A', rank: 1, participantId: 'p1' },
      { optionId: 'B', rank: 2, participantId: 'p1' },
      { optionId: 'C', rank: 3, participantId: 'p1' },
      { optionId: 'A', rank: 1, participantId: 'p2' },
      { optionId: 'D', rank: 2, participantId: 'p2' },
      { optionId: 'E', rank: 3, participantId: 'p2' },
    ]

    const result = computeBordaLeaderboard(votes, 5, 2, 3)

    // With base=3: rank 1 = 2 pts, rank 2 = 1 pt, rank 3 = 0 pts
    // A: 2+2 = 4, B: 1, C: 0, D: 1, E: 0
    // maxPossible = (3-1)*2 = 4
    const aEntry = result.find((r) => r.optionId === 'A')!
    expect(aEntry.totalPoints).toBe(4)
    expect(aEntry.maxPossiblePoints).toBe(4)
    expect(aEntry.voterCount).toBe(2)

    const bEntry = result.find((r) => r.optionId === 'B')!
    expect(bEntry.totalPoints).toBe(1)
  })

  it('falls back to totalOptions when rankingDepth is null', () => {
    const votes = [
      { optionId: 'A', rank: 1, participantId: 'p1' },
    ]

    const result = computeBordaLeaderboard(votes, 4, 1, null)

    // Base = 4 (totalOptions), rank 1 = 3 points
    expect(result[0].totalPoints).toBe(3)
    expect(result[0].maxPossiblePoints).toBe(3)
  })

  it('falls back to totalOptions when rankingDepth >= totalOptions', () => {
    const votes = [
      { optionId: 'A', rank: 1, participantId: 'p1' },
    ]

    // rankingDepth=5 but totalOptions=4; use totalOptions=4
    const result = computeBordaLeaderboard(votes, 4, 1, 5)

    expect(result[0].totalPoints).toBe(3) // 4-1 = 3
  })
})
