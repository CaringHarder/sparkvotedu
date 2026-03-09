import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DAL modules before importing the action
vi.mock('@/lib/dal/class-session', () => ({
  findSessionByCode: vi.fn(),
  findActiveSessionByCode: vi.fn(),
}))

vi.mock('@/lib/dal/student-session', () => ({
  findReturningStudent: vi.fn(),
  findReturningByFirstName: vi.fn(),
  createReturningParticipant: vi.fn(),
  findParticipantByDevice: vi.fn(),
  findParticipantsByFirstName: vi.fn(),
  createParticipant: vi.fn(),
  updateParticipantDevice: vi.fn(),
  updateFirstName: vi.fn(),
  updateLastSeen: vi.fn(),
  rerollParticipantName: vi.fn(),
  generateRecoveryCode: vi.fn(),
  findParticipantByRecoveryCode: vi.fn(),
}))

vi.mock('@/lib/realtime/broadcast', () => ({
  broadcastParticipantJoined: vi.fn().mockResolvedValue(undefined),
}))

// Mock auth module
vi.mock('@/lib/dal/auth', () => ({
  getAuthenticatedTeacher: vi.fn(),
}))

// Mock prisma for teacherUpdateStudentName
vi.mock('@/lib/prisma', () => ({
  prisma: {
    studentParticipant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { lookupStudent, lookupStudentByFirstName, teacherUpdateStudentName } from '../student'
import { findSessionByCode } from '@/lib/dal/class-session'
import {
  findReturningStudent,
  findReturningByFirstName,
  createReturningParticipant,
} from '@/lib/dal/student-session'
import { broadcastParticipantJoined } from '@/lib/realtime/broadcast'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

const mockSession = {
  id: 'session-1',
  code: '123456',
  name: 'Math Class',
  status: 'active',
  teacherId: 'teacher-1',
  teacher: { name: 'Ms. Smith' },
}

const mockEndedSession = {
  ...mockSession,
  status: 'ended',
}

const mockParticipant = {
  id: 'part-new',
  firstName: 'Alice',
  funName: 'Daring Dragon',
  emoji: ':sparkles:',
  lastInitial: 'R',
  rerollUsed: false,
  recoveryCode: null,
  sessionId: 'session-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('lookupStudent', () => {
  it('returns isNew when no matches found', async () => {
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningStudent).mockResolvedValue([])

    const result = await lookupStudent({
      code: '123456',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.isNew).toBe(true)
    expect(result.session).toBeDefined()
    expect(result.participant).toBeUndefined()
    expect(result.candidates).toBeUndefined()
  })

  it('auto-reclaims on single match', async () => {
    const match = {
      id: 'part-old',
      funName: 'Daring Dragon',
      emoji: ':sparkles:',
      sessionId: 'session-old',
      lastSeenAt: new Date(),
    }
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningStudent).mockResolvedValue([match])
    vi.mocked(createReturningParticipant).mockResolvedValue(mockParticipant as never)

    const result = await lookupStudent({
      code: '123456',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.returning).toBe(true)
    expect(result.participant).toBeDefined()
    expect(result.participant!.funName).toBe('Daring Dragon')
    expect(createReturningParticipant).toHaveBeenCalledWith(
      'session-1',
      { funName: 'Daring Dragon', emoji: ':sparkles:' },
      'Alice',
      'R',
      null
    )
    expect(broadcastParticipantJoined).toHaveBeenCalledWith('session-1')
  })

  it('returns candidates on multiple matches', async () => {
    const matches = [
      { id: 'p1', funName: 'Daring Dragon', emoji: ':sparkles:', sessionId: 's1', lastSeenAt: new Date() },
      { id: 'p2', funName: 'Mighty Moose', emoji: ':fire:', sessionId: 's2', lastSeenAt: new Date() },
    ]
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningStudent).mockResolvedValue(matches)

    const result = await lookupStudent({
      code: '123456',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.candidates).toHaveLength(2)
    expect(result.allowNew).toBe(true)
    expect(result.session).toBeDefined()
    expect(result.participant).toBeUndefined()
  })

  it('deduplicates candidates by funName+emoji', async () => {
    const matches = [
      { id: 'p1', funName: 'Daring Dragon', emoji: ':sparkles:', sessionId: 's1', lastSeenAt: new Date() },
      { id: 'p2', funName: 'Daring Dragon', emoji: ':sparkles:', sessionId: 's2', lastSeenAt: new Date() },
      { id: 'p3', funName: 'Mighty Moose', emoji: ':fire:', sessionId: 's3', lastSeenAt: new Date() },
    ]
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningStudent).mockResolvedValue(matches)

    const result = await lookupStudent({
      code: '123456',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.candidates).toHaveLength(2)
  })

  it('returns error for invalid session code', async () => {
    vi.mocked(findSessionByCode).mockResolvedValue(null)

    const result = await lookupStudent({
      code: '999999',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.error).toBe('Invalid class code')
  })

  it('returns sessionEnded for ended session', async () => {
    vi.mocked(findSessionByCode).mockResolvedValue(mockEndedSession as never)

    const result = await lookupStudent({
      code: '123456',
      firstName: 'Alice',
      lastInitial: 'R',
    })

    expect(result.sessionEnded).toBe(true)
    expect(result.session).toBeDefined()
  })

  it('returns error for invalid input', async () => {
    const result = await lookupStudent({
      code: 'abc',
      firstName: 'A',
      lastInitial: '',
    })

    expect(result.error).toBeDefined()
  })
})

describe('lookupStudentByFirstName', () => {
  it('returns single candidate for firstName only lookup (no auto-reclaim)', async () => {
    const match = {
      id: 'part-old',
      funName: 'Daring Dragon',
      emoji: ':sparkles:',
      lastInitial: 'R',
      sessionId: 'session-old',
      lastSeenAt: new Date(),
    }
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningByFirstName).mockResolvedValue([match])

    const result = await lookupStudentByFirstName({
      code: '123456',
      firstName: 'Alice',
    })

    expect(result.candidates).toHaveLength(1)
    expect(result.candidates![0].lastInitial).toBe('R')
    expect(result.returning).toBeUndefined()
    expect(result.participant).toBeUndefined()
    expect(createReturningParticipant).not.toHaveBeenCalled()
  })

  it('returns multiple candidates with lastInitial included', async () => {
    const matches = [
      { id: 'p1', funName: 'Daring Dragon', emoji: ':sparkles:', lastInitial: 'R', sessionId: 's1', lastSeenAt: new Date() },
      { id: 'p2', funName: 'Mighty Moose', emoji: ':fire:', lastInitial: 'S', sessionId: 's2', lastSeenAt: new Date() },
    ]
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningByFirstName).mockResolvedValue(matches)

    const result = await lookupStudentByFirstName({
      code: '123456',
      firstName: 'Alice',
    })

    expect(result.candidates).toHaveLength(2)
    expect(result.candidates![0].lastInitial).toBe('R')
    expect(result.candidates![1].lastInitial).toBe('S')
    expect(result.allowNew).toBe(true)
  })

  it('returns isNew when no matches', async () => {
    vi.mocked(findSessionByCode).mockResolvedValue(mockSession as never)
    vi.mocked(findReturningByFirstName).mockResolvedValue([])

    const result = await lookupStudentByFirstName({
      code: '123456',
      firstName: 'Alice',
    })

    expect(result.isNew).toBe(true)
    expect(result.session).toBeDefined()
  })
})

describe('teacherUpdateStudentName with lastInitial', () => {
  it('includes lastInitial in teacherUpdateStudentName', async () => {
    vi.mocked(getAuthenticatedTeacher).mockResolvedValue({
      id: 'teacher-1',
      name: 'Ms. Smith',
    } as never)
    vi.mocked(prisma.studentParticipant.findUnique).mockResolvedValue({
      id: 'part-1',
      sessionId: 'session-1',
      session: { teacherId: 'teacher-1', id: 'session-1' },
    } as never)
    vi.mocked(prisma.studentParticipant.update).mockResolvedValue({} as never)

    const result = await teacherUpdateStudentName({
      participantId: 'part-1',
      firstName: 'Alice',
      lastInitial: 'B',
    })

    expect(result.success).toBe(true)
    expect(prisma.studentParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Alice',
          lastInitial: 'B',
        }),
      })
    )
  })
})
