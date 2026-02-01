import { describe, it, expect } from 'vitest'
import { getPointsForRound, scorePredictions } from '../predictive'

describe('getPointsForRound', () => {
  it('returns 1 for round 1', () => {
    expect(getPointsForRound(1)).toBe(1)
  })

  it('returns 2 for round 2', () => {
    expect(getPointsForRound(2)).toBe(2)
  })

  it('returns 4 for round 3', () => {
    expect(getPointsForRound(3)).toBe(4)
  })

  it('returns 8 for round 4', () => {
    expect(getPointsForRound(4)).toBe(8)
  })

  it('returns 16 for round 5', () => {
    expect(getPointsForRound(5)).toBe(16)
  })

  it('returns 32 for round 6', () => {
    expect(getPointsForRound(6)).toBe(32)
  })

  it('uses Math.pow(2, round - 1) formula', () => {
    for (let r = 1; r <= 10; r++) {
      expect(getPointsForRound(r)).toBe(Math.pow(2, r - 1))
    }
  })
})

describe('scorePredictions', () => {
  // Helper to build predictions and matchups for an 8-team bracket (3 rounds, 7 matchups)
  // R1: m1, m2, m3, m4 (4 matchups)
  // R2: m5, m6 (2 matchups)
  // R3: m7 (1 matchup -- final)

  const matchupIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']

  // All 7 resolved matchups with known winners
  const allResolvedMatchups = [
    { id: 'm1', round: 1, winnerId: 'w1' },
    { id: 'm2', round: 1, winnerId: 'w2' },
    { id: 'm3', round: 1, winnerId: 'w3' },
    { id: 'm4', round: 1, winnerId: 'w4' },
    { id: 'm5', round: 2, winnerId: 'w5' },
    { id: 'm6', round: 2, winnerId: 'w6' },
    { id: 'm7', round: 3, winnerId: 'w7' },
  ]

  describe('Case 1: Perfect bracket (8-team, 3 rounds)', () => {
    it('scores all 7 correct picks with doubling points', () => {
      const predictions = matchupIds.map((matchupId, i) => ({
        participantId: 'student-a',
        matchupId,
        predictedWinnerId: allResolvedMatchups[i].winnerId,
      }))

      const results = scorePredictions(predictions, allResolvedMatchups, 3)

      expect(results).toHaveLength(1)
      const score = results[0]
      expect(score.participantId).toBe('student-a')
      // R1: 4*1=4, R2: 2*2=4, R3: 1*4=4 => total=12
      expect(score.totalPoints).toBe(12)
      expect(score.correctPicks).toBe(7)
      expect(score.totalPicks).toBe(7)

      // Per-round breakdown
      expect(score.pointsByRound[1]).toEqual({ correct: 4, total: 4, points: 4 })
      expect(score.pointsByRound[2]).toEqual({ correct: 2, total: 2, points: 4 })
      expect(score.pointsByRound[3]).toEqual({ correct: 1, total: 1, points: 4 })
    })
  })

  describe('Case 2: All wrong', () => {
    it('scores 0 points for all incorrect picks', () => {
      const predictions = matchupIds.map((matchupId) => ({
        participantId: 'student-b',
        matchupId,
        predictedWinnerId: 'wrong-entrant',
      }))

      const results = scorePredictions(predictions, allResolvedMatchups, 3)

      expect(results).toHaveLength(1)
      const score = results[0]
      expect(score.totalPoints).toBe(0)
      expect(score.correctPicks).toBe(0)
      expect(score.totalPicks).toBe(7)
    })
  })

  describe('Case 3: Partial results (only round 1 resolved)', () => {
    it('only scores resolved matchups; unresolved are ignored', () => {
      const round1Only = allResolvedMatchups.filter((m) => m.round === 1)

      // Student predicts all 7 matchups but only R1 is resolved
      // Gets 3 out of 4 R1 matchups correct
      const predictions = [
        { participantId: 'student-c', matchupId: 'm1', predictedWinnerId: 'w1' }, // correct
        { participantId: 'student-c', matchupId: 'm2', predictedWinnerId: 'w2' }, // correct
        { participantId: 'student-c', matchupId: 'm3', predictedWinnerId: 'w3' }, // correct
        { participantId: 'student-c', matchupId: 'm4', predictedWinnerId: 'wrong' }, // wrong
        // R2 and R3 predictions exist but matchups are not resolved
        { participantId: 'student-c', matchupId: 'm5', predictedWinnerId: 'w5' },
        { participantId: 'student-c', matchupId: 'm6', predictedWinnerId: 'w6' },
        { participantId: 'student-c', matchupId: 'm7', predictedWinnerId: 'w7' },
      ]

      const results = scorePredictions(predictions, round1Only, 3)

      expect(results).toHaveLength(1)
      const score = results[0]
      expect(score.totalPoints).toBe(3) // 3*1 = 3
      expect(score.correctPicks).toBe(3)
      expect(score.totalPicks).toBe(4) // only 4 resolved matchups counted
      expect(score.pointsByRound[1]).toEqual({ correct: 3, total: 4, points: 3 })
      // Rounds 2 and 3 should not appear in pointsByRound
      expect(score.pointsByRound[2]).toBeUndefined()
      expect(score.pointsByRound[3]).toBeUndefined()
    })
  })

  describe('Case 4: Multiple students leaderboard', () => {
    it('ranks students by total points descending', () => {
      const predictions = [
        // Student A: R1: 3/4=3pts, R2: 2/2=4pts, R3: 0/1=0pts => total=7, correct=5
        { participantId: 'student-a', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-a', matchupId: 'm2', predictedWinnerId: 'w2' },
        { participantId: 'student-a', matchupId: 'm3', predictedWinnerId: 'w3' },
        { participantId: 'student-a', matchupId: 'm4', predictedWinnerId: 'wrong' },
        { participantId: 'student-a', matchupId: 'm5', predictedWinnerId: 'w5' },
        { participantId: 'student-a', matchupId: 'm6', predictedWinnerId: 'w6' },
        { participantId: 'student-a', matchupId: 'm7', predictedWinnerId: 'wrong' },

        // Student B: R1: 4/4=4pts, R2: 0/2=0pts, R3: 0/1=0pts => total=4, correct=4
        { participantId: 'student-b', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-b', matchupId: 'm2', predictedWinnerId: 'w2' },
        { participantId: 'student-b', matchupId: 'm3', predictedWinnerId: 'w3' },
        { participantId: 'student-b', matchupId: 'm4', predictedWinnerId: 'w4' },
        { participantId: 'student-b', matchupId: 'm5', predictedWinnerId: 'wrong' },
        { participantId: 'student-b', matchupId: 'm6', predictedWinnerId: 'wrong' },
        { participantId: 'student-b', matchupId: 'm7', predictedWinnerId: 'wrong' },
      ]

      const results = scorePredictions(predictions, allResolvedMatchups, 3)

      expect(results).toHaveLength(2)
      // Student A (7 pts) should be first
      expect(results[0].participantId).toBe('student-a')
      expect(results[0].totalPoints).toBe(7)
      expect(results[0].correctPicks).toBe(5)
      // Student B (4 pts) should be second
      expect(results[1].participantId).toBe('student-b')
      expect(results[1].totalPoints).toBe(4)
      expect(results[1].correctPicks).toBe(4)
    })
  })

  describe('Case 5: Tiebreaker', () => {
    it('breaks ties by correct picks count', () => {
      // Both students get 4 total points, but via different routes
      // Student X: R1: 4/4=4pts, R2: 0/2=0pts => 4pts, 4 correct
      // Student Y: R1: 2/4=2pts, R2: 1/2=2pts => 4pts, 3 correct
      const round1And2Resolved = allResolvedMatchups.filter((m) => m.round <= 2)

      const predictions = [
        // Student X: gets all 4 R1 correct, 0 R2 correct
        { participantId: 'student-x', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-x', matchupId: 'm2', predictedWinnerId: 'w2' },
        { participantId: 'student-x', matchupId: 'm3', predictedWinnerId: 'w3' },
        { participantId: 'student-x', matchupId: 'm4', predictedWinnerId: 'w4' },
        { participantId: 'student-x', matchupId: 'm5', predictedWinnerId: 'wrong' },
        { participantId: 'student-x', matchupId: 'm6', predictedWinnerId: 'wrong' },

        // Student Y: gets 2 R1 correct, 1 R2 correct
        { participantId: 'student-y', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-y', matchupId: 'm2', predictedWinnerId: 'w2' },
        { participantId: 'student-y', matchupId: 'm3', predictedWinnerId: 'wrong' },
        { participantId: 'student-y', matchupId: 'm4', predictedWinnerId: 'wrong' },
        { participantId: 'student-y', matchupId: 'm5', predictedWinnerId: 'w5' },
        { participantId: 'student-y', matchupId: 'm6', predictedWinnerId: 'wrong' },
      ]

      const results = scorePredictions(predictions, round1And2Resolved, 3)

      expect(results).toHaveLength(2)
      // Both have 4 points; Student X has 4 correct vs Student Y has 3 correct
      expect(results[0].participantId).toBe('student-x')
      expect(results[0].totalPoints).toBe(4)
      expect(results[0].correctPicks).toBe(4)
      expect(results[1].participantId).toBe('student-y')
      expect(results[1].totalPoints).toBe(4)
      expect(results[1].correctPicks).toBe(3)
    })

    it('assigns same rank when points and correct picks are equal', () => {
      // Two students with identical scores
      const predictions = [
        { participantId: 'student-p', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-p', matchupId: 'm2', predictedWinnerId: 'wrong' },

        { participantId: 'student-q', matchupId: 'm1', predictedWinnerId: 'w1' },
        { participantId: 'student-q', matchupId: 'm2', predictedWinnerId: 'wrong' },
      ]

      const round1Only = allResolvedMatchups.filter((m) => m.round === 1)
      const results = scorePredictions(predictions, round1Only, 3)

      expect(results).toHaveLength(2)
      // Both have 1 point, 1 correct pick -- same position in sorted array
      expect(results[0].totalPoints).toBe(1)
      expect(results[0].correctPicks).toBe(1)
      expect(results[1].totalPoints).toBe(1)
      expect(results[1].correctPicks).toBe(1)
    })
  })

  describe('Case 6: Empty predictions', () => {
    it('returns empty array for empty predictions', () => {
      const results = scorePredictions([], allResolvedMatchups, 3)
      expect(results).toEqual([])
    })

    it('returns empty array for empty resolved matchups', () => {
      const predictions = [
        { participantId: 'student-a', matchupId: 'm1', predictedWinnerId: 'w1' },
      ]
      const results = scorePredictions(predictions, [], 3)
      expect(results).toEqual([])
    })

    it('returns empty array when both inputs are empty', () => {
      const results = scorePredictions([], [], 3)
      expect(results).toEqual([])
    })
  })

  describe('Case 7: Predictions for unresolved matchups', () => {
    it('ignores predictions for matchups not in resolved list', () => {
      const predictions = [
        { participantId: 'student-a', matchupId: 'nonexistent-1', predictedWinnerId: 'w1' },
        { participantId: 'student-a', matchupId: 'nonexistent-2', predictedWinnerId: 'w2' },
      ]

      const results = scorePredictions(predictions, allResolvedMatchups, 3)
      expect(results).toEqual([])
    })
  })

  describe('participantName defaults to empty string', () => {
    it('sets participantName to empty string (caller fills from DB)', () => {
      const predictions = [
        { participantId: 'student-a', matchupId: 'm1', predictedWinnerId: 'w1' },
      ]
      const round1Only = allResolvedMatchups.filter((m) => m.round === 1)
      const results = scorePredictions(predictions, round1Only, 3)

      expect(results).toHaveLength(1)
      expect(results[0].participantName).toBe('')
    })
  })
})
