import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  advanceMatchupWinner,
  undoMatchupAdvancement,
  batchAdvanceRound,
  checkRoundComplete,
  isBracketComplete,
} from '../advancement'

// Mock Prisma client
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    $transaction: vi.fn(),
    matchup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    vote: {
      count: vi.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// Import the mocked prisma after vi.mock
import { prisma } from '@/lib/prisma'

const mockedPrisma = vi.mocked(prisma, true)

// Helper to build mock matchup data
function mockMatchup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'matchup-1',
    round: 1,
    position: 1,
    bracketId: 'bracket-1',
    entrant1Id: 'entrant-a',
    entrant2Id: 'entrant-b',
    winnerId: null,
    nextMatchupId: 'matchup-next',
    status: 'voting',
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('advanceMatchupWinner', () => {
  it('sets winnerId and status to decided on the matchup', async () => {
    const matchup = mockMatchup({ position: 1 })
    const updatedMatchup = { ...matchup, winnerId: 'entrant-a', status: 'decided' }

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      // Provide a mock tx that returns what we expect
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockResolvedValue(updatedMatchup),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    const result = await advanceMatchupWinner('matchup-1', 'entrant-a', 'bracket-1')
    expect(result.winnerId).toBe('entrant-a')
    expect(result.status).toBe('decided')
  })

  it('propagates winner to entrant1Id of next matchup for odd position (1)', async () => {
    const matchup = mockMatchup({ position: 1, nextMatchupId: 'matchup-next' })
    const updatedMatchup = { ...matchup, winnerId: 'entrant-a', status: 'decided' }
    const nextMatchup = mockMatchup({
      id: 'matchup-next',
      round: 2,
      position: 1,
      entrant1Id: null,
      entrant2Id: null,
      nextMatchupId: null,
    })

    let nextMatchupUpdateArgs: Record<string, unknown> | null = null

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn()
            .mockResolvedValueOnce(matchup) // first call: current matchup
            .mockResolvedValueOnce(nextMatchup), // second call: next matchup (if queried)
          update: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
            const where = args.where as Record<string, unknown>
            if (where.id === 'matchup-1') {
              return updatedMatchup
            }
            if (where.id === 'matchup-next') {
              nextMatchupUpdateArgs = args
              return { ...nextMatchup, entrant1Id: 'entrant-a' }
            }
            return null
          }),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await advanceMatchupWinner('matchup-1', 'entrant-a', 'bracket-1')

    // Odd position (1) -> entrant1Id
    expect(nextMatchupUpdateArgs).not.toBeNull()
    const data = (nextMatchupUpdateArgs as Record<string, unknown>).data as Record<string, unknown>
    expect(data.entrant1Id).toBe('entrant-a')
  })

  it('propagates winner to entrant2Id of next matchup for even position (2)', async () => {
    const matchup = mockMatchup({ position: 2, nextMatchupId: 'matchup-next' })
    const updatedMatchup = { ...matchup, winnerId: 'entrant-a', status: 'decided' }

    let nextMatchupUpdateArgs: Record<string, unknown> | null = null

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
            const where = args.where as Record<string, unknown>
            if (where.id === 'matchup-1') {
              return updatedMatchup
            }
            if (where.id === 'matchup-next') {
              nextMatchupUpdateArgs = args
              return { ...matchup, entrant2Id: 'entrant-a' }
            }
            return null
          }),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await advanceMatchupWinner('matchup-1', 'entrant-a', 'bracket-1')

    // Even position (2) -> entrant2Id
    expect(nextMatchupUpdateArgs).not.toBeNull()
    const data = (nextMatchupUpdateArgs as Record<string, unknown>).data as Record<string, unknown>
    expect(data.entrant2Id).toBe('entrant-a')
  })

  it('does not propagate when there is no next matchup (final round)', async () => {
    const matchup = mockMatchup({ position: 1, nextMatchupId: null })
    const updatedMatchup = { ...matchup, winnerId: 'entrant-a', status: 'decided' }

    let updateCallCount = 0

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockImplementation(async () => {
            updateCallCount++
            return updatedMatchup
          }),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await advanceMatchupWinner('matchup-1', 'entrant-a', 'bracket-1')

    // Only one update call (the current matchup), no propagation
    expect(updateCallCount).toBe(1)
  })

  it('throws error if matchup not found', async () => {
    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await expect(
      advanceMatchupWinner('nonexistent', 'entrant-a', 'bracket-1')
    ).rejects.toThrow('Matchup not found')
  })

  it('throws error if winner is not one of the entrants', async () => {
    const matchup = mockMatchup({
      entrant1Id: 'entrant-a',
      entrant2Id: 'entrant-b',
    })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn(),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await expect(
      advanceMatchupWinner('matchup-1', 'entrant-c', 'bracket-1')
    ).rejects.toThrow('Winner must be one of the matchup entrants')
  })
})

describe('undoMatchupAdvancement', () => {
  it('clears winnerId and sets status back to voting', async () => {
    const matchup = mockMatchup({
      winnerId: 'entrant-a',
      status: 'decided',
      position: 1,
      nextMatchupId: 'matchup-next',
    })
    const clearedMatchup = { ...matchup, winnerId: null, status: 'voting' }

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockResolvedValue(clearedMatchup),
        },
        vote: {
          count: vi.fn().mockResolvedValue(0),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    const result = await undoMatchupAdvancement('matchup-1', 'bracket-1')
    expect(result.winnerId).toBeNull()
    expect(result.status).toBe('voting')
  })

  it('clears entrant1Id from next matchup for odd position', async () => {
    const matchup = mockMatchup({
      winnerId: 'entrant-a',
      status: 'decided',
      position: 1,
      nextMatchupId: 'matchup-next',
    })

    let nextMatchupUpdateArgs: Record<string, unknown> | null = null

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
            const where = args.where as Record<string, unknown>
            if (where.id === 'matchup-next') {
              nextMatchupUpdateArgs = args
              return { id: 'matchup-next', entrant1Id: null }
            }
            return { ...matchup, winnerId: null, status: 'voting' }
          }),
        },
        vote: {
          count: vi.fn().mockResolvedValue(0),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await undoMatchupAdvancement('matchup-1', 'bracket-1')

    expect(nextMatchupUpdateArgs).not.toBeNull()
    const data = (nextMatchupUpdateArgs as Record<string, unknown>).data as Record<string, unknown>
    expect(data.entrant1Id).toBeNull()
  })

  it('clears entrant2Id from next matchup for even position', async () => {
    const matchup = mockMatchup({
      winnerId: 'entrant-a',
      status: 'decided',
      position: 2,
      nextMatchupId: 'matchup-next',
    })

    let nextMatchupUpdateArgs: Record<string, unknown> | null = null

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
            const where = args.where as Record<string, unknown>
            if (where.id === 'matchup-next') {
              nextMatchupUpdateArgs = args
              return { id: 'matchup-next', entrant2Id: null }
            }
            return { ...matchup, winnerId: null, status: 'voting' }
          }),
        },
        vote: {
          count: vi.fn().mockResolvedValue(0),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await undoMatchupAdvancement('matchup-1', 'bracket-1')

    expect(nextMatchupUpdateArgs).not.toBeNull()
    const data = (nextMatchupUpdateArgs as Record<string, unknown>).data as Record<string, unknown>
    expect(data.entrant2Id).toBeNull()
  })

  it('returns error when matchup has no winner', async () => {
    const matchup = mockMatchup({ winnerId: null, status: 'voting' })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn(),
        },
        vote: {
          count: vi.fn(),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await expect(
      undoMatchupAdvancement('matchup-1', 'bracket-1')
    ).rejects.toThrow('Matchup has no winner to undo')
  })

  it('returns error when next matchup has votes', async () => {
    const matchup = mockMatchup({
      winnerId: 'entrant-a',
      status: 'decided',
      position: 1,
      nextMatchupId: 'matchup-next',
    })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findUnique: vi.fn().mockResolvedValue(matchup),
          update: vi.fn(),
        },
        vote: {
          count: vi.fn().mockResolvedValue(3), // 3 votes exist on next matchup
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    await expect(
      undoMatchupAdvancement('matchup-1', 'bracket-1')
    ).rejects.toThrow('Cannot undo: next matchup already has votes')
  })
})

describe('batchAdvanceRound', () => {
  it('advances all decided matchups in a round and returns count', async () => {
    const matchups = [
      mockMatchup({
        id: 'matchup-r1-1',
        round: 1,
        position: 1,
        winnerId: 'entrant-a',
        status: 'decided',
        nextMatchupId: 'matchup-r2-1',
      }),
      mockMatchup({
        id: 'matchup-r1-2',
        round: 1,
        position: 2,
        winnerId: 'entrant-b',
        status: 'decided',
        nextMatchupId: 'matchup-r2-1',
      }),
    ]

    // Next matchup has no entrants yet
    const nextMatchup = mockMatchup({
      id: 'matchup-r2-1',
      round: 2,
      position: 1,
      entrant1Id: null,
      entrant2Id: null,
      nextMatchupId: null,
    })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findMany: vi.fn().mockResolvedValue(matchups),
          findUnique: vi.fn().mockResolvedValue(nextMatchup),
          update: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
            const where = args.where as Record<string, unknown>
            if (where.id === 'matchup-r2-1') {
              return { ...nextMatchup, ...(args.data as Record<string, unknown>) }
            }
            return null
          }),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    const count = await batchAdvanceRound('bracket-1', 1)
    expect(count).toBe(2)
  })

  it('returns 0 when no matchups need advancement', async () => {
    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        matchup: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      } as unknown as typeof prisma
      return fn(tx)
    })

    const count = await batchAdvanceRound('bracket-1', 1)
    expect(count).toBe(0)
  })
})

describe('checkRoundComplete', () => {
  it('returns true when all matchups in round are decided', async () => {
    const matchups = [
      mockMatchup({ status: 'decided', round: 1, position: 1 }),
      mockMatchup({ status: 'decided', round: 1, position: 2 }),
    ]

    mockedPrisma.matchup.findMany.mockResolvedValue(matchups as never)

    const result = await checkRoundComplete('bracket-1', 1)
    expect(result).toBe(true)
  })

  it('returns false when some matchups are not decided', async () => {
    const matchups = [
      mockMatchup({ status: 'decided', round: 1, position: 1 }),
      mockMatchup({ status: 'voting', round: 1, position: 2 }),
    ]

    mockedPrisma.matchup.findMany.mockResolvedValue(matchups as never)

    const result = await checkRoundComplete('bracket-1', 1)
    expect(result).toBe(false)
  })

  it('returns false when no matchups exist in round', async () => {
    mockedPrisma.matchup.findMany.mockResolvedValue([] as never)

    const result = await checkRoundComplete('bracket-1', 99)
    expect(result).toBe(false)
  })
})

describe('isBracketComplete', () => {
  it('returns winnerId when final matchup has a winner', async () => {
    const finalMatchup = mockMatchup({
      round: 3,
      position: 1,
      winnerId: 'entrant-champion',
      status: 'decided',
    })

    mockedPrisma.matchup.findMany.mockResolvedValue([finalMatchup] as never)

    const result = await isBracketComplete('bracket-1')
    expect(result).toBe('entrant-champion')
  })

  it('returns null when final matchup has no winner', async () => {
    const finalMatchup = mockMatchup({
      round: 3,
      position: 1,
      winnerId: null,
      status: 'voting',
    })

    mockedPrisma.matchup.findMany.mockResolvedValue([finalMatchup] as never)

    const result = await isBracketComplete('bracket-1')
    expect(result).toBeNull()
  })

  it('returns null when no matchups exist', async () => {
    mockedPrisma.matchup.findMany.mockResolvedValue([] as never)

    const result = await isBracketComplete('bracket-1')
    expect(result).toBeNull()
  })
})
