import { describe, it, expect } from 'vitest'
import { tabulatePredictions } from '../predictive'
import type { TabulationInput, TabulationResult } from '../types'

// Helper: build matchup inputs for a bracket
function makeMatchup(
  overrides: Partial<TabulationInput> & { matchupId: string; round: number; position: number }
): TabulationInput {
  return {
    entrant1Id: null,
    entrant2Id: null,
    isBye: false,
    nextMatchupId: null,
    ...overrides,
  }
}

// Helper: build a prediction (participantId picks predictedWinnerId for matchupId)
function makePrediction(participantId: string, matchupId: string, predictedWinnerId: string) {
  return { participantId, matchupId, predictedWinnerId }
}

describe('tabulatePredictions', () => {
  // ================================================================
  // Test 1: Empty predictions
  // ================================================================
  it('returns empty array for empty predictions', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'a', entrant2Id: 'b' }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'c', entrant2Id: 'd' }),
    ]

    const results = tabulatePredictions([], matchups, 2)
    expect(results).toEqual([])
  })

  // ================================================================
  // Test 2: 4-entrant bracket with unanimous predictions
  // ================================================================
  it('resolves 4-entrant bracket with unanimous predictions', () => {
    // 4-entrant single-elimination: 2 R1 matchups + 1 R2 final
    // m1: A vs B, m2: C vs D, m3: winner(m1) vs winner(m2)
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B', nextMatchupId: 'm3' }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'C', entrant2Id: 'D', nextMatchupId: 'm3' }),
      makeMatchup({ matchupId: 'm3', round: 2, position: 1, entrant1Id: null, entrant2Id: null }),
    ]

    // 3 students all pick: A over B, C over D, A over C in finals
    const predictions = [
      makePrediction('s1', 'm1', 'A'), makePrediction('s1', 'm2', 'C'), makePrediction('s1', 'm3', 'A'),
      makePrediction('s2', 'm1', 'A'), makePrediction('s2', 'm2', 'C'), makePrediction('s2', 'm3', 'A'),
      makePrediction('s3', 'm1', 'A'), makePrediction('s3', 'm2', 'C'), makePrediction('s3', 'm3', 'A'),
    ]

    const results = tabulatePredictions(predictions, matchups, 2)

    // Should have 3 results (one per non-bye matchup)
    expect(results).toHaveLength(3)

    const r1m1 = results.find(r => r.matchupId === 'm1')!
    expect(r1m1.winnerId).toBe('A')
    expect(r1m1.entrant1Votes).toBe(3)
    expect(r1m1.entrant2Votes).toBe(0)
    expect(r1m1.totalVotes).toBe(3)
    expect(r1m1.status).toBe('resolved')

    const r1m2 = results.find(r => r.matchupId === 'm2')!
    expect(r1m2.winnerId).toBe('C')
    expect(r1m2.entrant1Votes).toBe(3)
    expect(r1m2.entrant2Votes).toBe(0)
    expect(r1m2.status).toBe('resolved')

    const r2m3 = results.find(r => r.matchupId === 'm3')!
    expect(r2m3.winnerId).toBe('A')
    expect(r2m3.entrant1Id).toBe('A') // cascaded from m1
    expect(r2m3.entrant2Id).toBe('C') // cascaded from m2
    expect(r2m3.status).toBe('resolved')
  })

  // ================================================================
  // Test 3: Exact tie with null winnerId
  // ================================================================
  it('marks exact tie as tie with null winnerId', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B' }),
    ]

    // 2 students: one picks A, one picks B -> tie
    const predictions = [
      makePrediction('s1', 'm1', 'A'),
      makePrediction('s2', 'm1', 'B'),
    ]

    const results = tabulatePredictions(predictions, matchups, 1)

    expect(results).toHaveLength(1)
    expect(results[0].winnerId).toBeNull()
    expect(results[0].status).toBe('tie')
    expect(results[0].entrant1Votes).toBe(1)
    expect(results[0].entrant2Votes).toBe(1)
    expect(results[0].totalVotes).toBe(2)
  })

  // ================================================================
  // Test 4: Zero-prediction matchup
  // ================================================================
  it('marks zero-prediction matchup as no_predictions', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B' }),
    ]

    // No predictions for m1
    const results = tabulatePredictions([], matchups, 1)

    // Empty predictions returns empty array
    expect(results).toEqual([])
  })

  // Test 4b: Matchup exists but no predictions for it specifically
  it('marks matchup with no relevant predictions as no_predictions', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B' }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'C', entrant2Id: 'D' }),
    ]

    // Predictions only for m1, not m2
    const predictions = [
      makePrediction('s1', 'm1', 'A'),
    ]

    const results = tabulatePredictions(predictions, matchups, 1)

    expect(results).toHaveLength(2)
    const m2Result = results.find(r => r.matchupId === 'm2')!
    expect(m2Result.status).toBe('no_predictions')
    expect(m2Result.winnerId).toBeNull()
    expect(m2Result.totalVotes).toBe(0)
  })

  // ================================================================
  // Test 5: Cascades Round 1 winners to Round 2 entrants
  // ================================================================
  it('cascades Round 1 winners to Round 2 entrants', () => {
    // 8-entrant bracket: 4 R1 matchups, 2 R2 matchups, 1 R3 final
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B', nextMatchupId: 'm5' }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'C', entrant2Id: 'D', nextMatchupId: 'm5' }),
      makeMatchup({ matchupId: 'm3', round: 1, position: 3, entrant1Id: 'E', entrant2Id: 'F', nextMatchupId: 'm6' }),
      makeMatchup({ matchupId: 'm4', round: 1, position: 4, entrant1Id: 'G', entrant2Id: 'H', nextMatchupId: 'm6' }),
      makeMatchup({ matchupId: 'm5', round: 2, position: 1, entrant1Id: null, entrant2Id: null, nextMatchupId: 'm7' }),
      makeMatchup({ matchupId: 'm6', round: 2, position: 2, entrant1Id: null, entrant2Id: null, nextMatchupId: 'm7' }),
      makeMatchup({ matchupId: 'm7', round: 3, position: 1, entrant1Id: null, entrant2Id: null }),
    ]

    // 3 students: all unanimous for simplicity
    // R1: A, C, E, G win
    const predictions = [
      // Student 1
      makePrediction('s1', 'm1', 'A'), makePrediction('s1', 'm2', 'C'),
      makePrediction('s1', 'm3', 'E'), makePrediction('s1', 'm4', 'G'),
      makePrediction('s1', 'm5', 'A'), makePrediction('s1', 'm6', 'E'),
      makePrediction('s1', 'm7', 'A'),
      // Student 2
      makePrediction('s2', 'm1', 'A'), makePrediction('s2', 'm2', 'C'),
      makePrediction('s2', 'm3', 'E'), makePrediction('s2', 'm4', 'G'),
      makePrediction('s2', 'm5', 'A'), makePrediction('s2', 'm6', 'E'),
      makePrediction('s2', 'm7', 'A'),
      // Student 3
      makePrediction('s3', 'm1', 'A'), makePrediction('s3', 'm2', 'C'),
      makePrediction('s3', 'm3', 'E'), makePrediction('s3', 'm4', 'G'),
      makePrediction('s3', 'm5', 'A'), makePrediction('s3', 'm6', 'E'),
      makePrediction('s3', 'm7', 'A'),
    ]

    const results = tabulatePredictions(predictions, matchups, 3)

    // R2 matchups should have cascaded entrants from R1 winners
    const m5 = results.find(r => r.matchupId === 'm5')!
    expect(m5.entrant1Id).toBe('A')  // from m1 (position 1, odd -> entrant1)
    expect(m5.entrant2Id).toBe('C')  // from m2 (position 2, even -> entrant2)

    const m6 = results.find(r => r.matchupId === 'm6')!
    expect(m6.entrant1Id).toBe('E')  // from m3 (position 3, odd -> entrant1)
    expect(m6.entrant2Id).toBe('G')  // from m4 (position 4, even -> entrant2)

    // R3 should cascade from R2
    const m7 = results.find(r => r.matchupId === 'm7')!
    expect(m7.entrant1Id).toBe('A')  // from m5 (position 1, odd -> entrant1)
    expect(m7.entrant2Id).toBe('E')  // from m6 (position 2, even -> entrant2)
  })

  // ================================================================
  // Test 6: Excludes bye matchups from results
  // ================================================================
  it('excludes bye matchups from results', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B', isBye: false }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'C', entrant2Id: null, isBye: true }),
    ]

    const predictions = [
      makePrediction('s1', 'm1', 'A'),
    ]

    const results = tabulatePredictions(predictions, matchups, 1)

    // Only m1 should be in results; bye matchup m2 excluded
    expect(results).toHaveLength(1)
    expect(results[0].matchupId).toBe('m1')
  })

  // ================================================================
  // Test 7: Counts only predictions for actual entrants in later rounds
  // ================================================================
  it('counts only predictions for actual entrants in later rounds', () => {
    // 4-entrant bracket, R1: A vs B, C vs D, R2: finals
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B', nextMatchupId: 'm3' }),
      makeMatchup({ matchupId: 'm2', round: 1, position: 2, entrant1Id: 'C', entrant2Id: 'D', nextMatchupId: 'm3' }),
      makeMatchup({ matchupId: 'm3', round: 2, position: 1, entrant1Id: null, entrant2Id: null }),
    ]

    // 3 students: all pick A and C to win R1
    // For R2: s1 and s2 pick A (who is in finals), s3 picks B (who was eliminated in R1)
    const predictions = [
      makePrediction('s1', 'm1', 'A'), makePrediction('s1', 'm2', 'C'), makePrediction('s1', 'm3', 'A'),
      makePrediction('s2', 'm1', 'A'), makePrediction('s2', 'm2', 'C'), makePrediction('s2', 'm3', 'A'),
      makePrediction('s3', 'm1', 'A'), makePrediction('s3', 'm2', 'C'), makePrediction('s3', 'm3', 'B'), // B eliminated!
    ]

    const results = tabulatePredictions(predictions, matchups, 2)

    const finals = results.find(r => r.matchupId === 'm3')!
    // After cascade: entrant1=A (from m1), entrant2=C (from m2)
    // s3 predicted 'B' which is neither A nor C -> should be ignored
    expect(finals.entrant1Id).toBe('A')
    expect(finals.entrant2Id).toBe('C')
    expect(finals.entrant1Votes).toBe(2)  // s1 and s2 pick A
    expect(finals.entrant2Votes).toBe(0)  // nobody picked C for finals
    expect(finals.totalVotes).toBe(2)     // s3's vote for B is excluded
    expect(finals.winnerId).toBe('A')
    expect(finals.status).toBe('resolved')
  })

  // ================================================================
  // Test 8: Handles majority correctly (3 vs 1)
  // ================================================================
  it('handles majority correctly (3 vs 1)', () => {
    const matchups: TabulationInput[] = [
      makeMatchup({ matchupId: 'm1', round: 1, position: 1, entrant1Id: 'A', entrant2Id: 'B' }),
    ]

    // 4 students: 3 pick A, 1 picks B
    const predictions = [
      makePrediction('s1', 'm1', 'A'),
      makePrediction('s2', 'm1', 'A'),
      makePrediction('s3', 'm1', 'A'),
      makePrediction('s4', 'm1', 'B'),
    ]

    const results = tabulatePredictions(predictions, matchups, 1)

    expect(results).toHaveLength(1)
    expect(results[0].winnerId).toBe('A')
    expect(results[0].entrant1Votes).toBe(3)
    expect(results[0].entrant2Votes).toBe(1)
    expect(results[0].totalVotes).toBe(4)
    expect(results[0].status).toBe('resolved')
  })
})
