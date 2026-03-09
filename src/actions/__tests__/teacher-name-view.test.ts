import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth module
vi.mock('@/lib/dal/auth', () => ({
  getAuthenticatedTeacher: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teacher: {
      update: vi.fn(),
    },
  },
}))

import { setNameViewDefault } from '../student'
import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setNameViewDefault', () => {
  it('persists fun view default to Teacher model', async () => {
    vi.mocked(getAuthenticatedTeacher).mockResolvedValue({
      id: 'teacher-1',
      name: 'Ms. Smith',
    } as never)
    vi.mocked(prisma.teacher.update).mockResolvedValue({} as never)

    const result = await setNameViewDefault({ value: 'fun' })

    expect(result).toEqual({ success: true })
    expect(prisma.teacher.update).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      data: { nameViewDefault: 'fun' },
    })
  })

  it('persists real view default to Teacher model', async () => {
    vi.mocked(getAuthenticatedTeacher).mockResolvedValue({
      id: 'teacher-1',
      name: 'Ms. Smith',
    } as never)
    vi.mocked(prisma.teacher.update).mockResolvedValue({} as never)

    const result = await setNameViewDefault({ value: 'real' })

    expect(result).toEqual({ success: true })
    expect(prisma.teacher.update).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      data: { nameViewDefault: 'real' },
    })
  })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthenticatedTeacher).mockResolvedValue(null)

    const result = await setNameViewDefault({ value: 'fun' })

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(prisma.teacher.update).not.toHaveBeenCalled()
  })
})
