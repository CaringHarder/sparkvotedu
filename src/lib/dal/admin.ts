import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'

/**
 * Authenticate and authorize an admin user.
 *
 * Calls getAuthenticatedTeacher() first, then checks the role column.
 * Returns the teacher record only if they have the "admin" role.
 *
 * @returns The Teacher record if authenticated and admin, or null otherwise.
 */
export async function getAuthenticatedAdmin() {
  const teacher = await getAuthenticatedTeacher()

  if (!teacher) {
    return null
  }

  if (teacher.role !== 'admin') {
    return null
  }

  return teacher
}

/**
 * Check if a teacher has admin role.
 *
 * Lightweight query that only selects the role column.
 *
 * @param teacherId - The teacher's UUID
 * @returns true if the teacher exists and has role "admin"
 */
export async function isAdmin(teacherId: string): Promise<boolean> {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { role: true },
  })

  return teacher?.role === 'admin'
}

// ---------------------------------------------------------------------------
// Admin stats for the stat bar
// ---------------------------------------------------------------------------

export interface AdminStats {
  totalTeachers: number
  activeToday: number
  freeTier: number
  paidTier: number
}

/**
 * Fetch summary statistics for the admin stat bar.
 *
 * Runs four counts in parallel for performance.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [totalTeachers, freeTier, activeSessionToday, activeBracketToday] =
    await Promise.all([
      prisma.teacher.count(),
      prisma.teacher.count({ where: { subscriptionTier: 'free' } }),
      // Teachers with class sessions updated today
      prisma.teacher.findMany({
        where: {
          classSessions: {
            some: { updatedAt: { gte: todayStart } },
          },
        },
        select: { id: true },
      }),
      // Teachers with brackets updated today
      prisma.teacher.findMany({
        where: {
          brackets: {
            some: { updatedAt: { gte: todayStart } },
          },
        },
        select: { id: true },
      }),
    ])

  // Merge unique teacher IDs from both activity sources
  const activeTeacherIds = new Set([
    ...activeSessionToday.map((t) => t.id),
    ...activeBracketToday.map((t) => t.id),
  ])

  return {
    totalTeachers,
    activeToday: activeTeacherIds.size,
    freeTier,
    paidTier: totalTeachers - freeTier,
  }
}

// ---------------------------------------------------------------------------
// Teacher list with search, filters, pagination
// ---------------------------------------------------------------------------

export interface TeacherListParams {
  search?: string
  tier?: string
  status?: 'active' | 'inactive'
  page?: number
  pageSize?: number
}

export interface TeacherListItem {
  id: string
  name: string | null
  email: string
  subscriptionTier: string
  createdAt: Date
  role: string
  _count: { brackets: number }
  lastActive: Date | null
}

export interface TeacherListResult {
  teachers: TeacherListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Paginated teacher list with search and filter support.
 *
 * Uses $transaction for consistent count + findMany.
 */
export async function getTeacherList(
  params: TeacherListParams = {}
): Promise<TeacherListResult> {
  const { search, tier, status, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Build where clause incrementally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (tier) {
    where.subscriptionTier = tier
  }

  if (status === 'active') {
    where.classSessions = {
      some: { createdAt: { gte: thirtyDaysAgo } },
    }
  } else if (status === 'inactive') {
    where.classSessions = {
      none: { createdAt: { gte: thirtyDaysAgo } },
    }
  }

  const [total, teachers] = await prisma.$transaction([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        createdAt: true,
        role: true,
        _count: { select: { brackets: true } },
        classSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        brackets: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  const teacherItems: TeacherListItem[] = teachers.map((t) => {
    // Derive last active from most recent session or bracket update
    const sessionDate = t.classSessions[0]?.createdAt ?? null
    const bracketDate = t.brackets[0]?.updatedAt ?? null
    let lastActive: Date | null = null
    if (sessionDate && bracketDate) {
      lastActive = sessionDate > bracketDate ? sessionDate : bracketDate
    } else {
      lastActive = sessionDate ?? bracketDate
    }

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      subscriptionTier: t.subscriptionTier,
      createdAt: t.createdAt,
      role: t.role,
      _count: t._count,
      lastActive,
    }
  })

  return {
    teachers: teacherItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ---------------------------------------------------------------------------
// Teacher detail for slide-out panel
// ---------------------------------------------------------------------------

export interface TeacherDetail {
  id: string
  name: string | null
  email: string
  subscriptionTier: string
  createdAt: Date
  role: string
  _count: {
    brackets: number
    polls: number
    classSessions: number
  }
  totalStudents: number
  lastActive: Date | null
}

/**
 * Full teacher detail including usage counts.
 *
 * @param teacherId - The teacher's UUID
 * @returns Teacher detail or null if not found
 */
export async function getTeacherDetail(
  teacherId: string
): Promise<TeacherDetail | null> {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      createdAt: true,
      role: true,
      _count: {
        select: {
          brackets: true,
          polls: true,
          classSessions: true,
        },
      },
      classSessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
      brackets: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { updatedAt: true },
      },
    },
  })

  if (!teacher) return null

  // Count unique students across all their sessions
  const studentCount = await prisma.studentParticipant.count({
    where: {
      session: { teacherId },
    },
  })

  // Derive last active
  const sessionDate = teacher.classSessions[0]?.createdAt ?? null
  const bracketDate = teacher.brackets[0]?.updatedAt ?? null
  let lastActive: Date | null = null
  if (sessionDate && bracketDate) {
    lastActive = sessionDate > bracketDate ? sessionDate : bracketDate
  } else {
    lastActive = sessionDate ?? bracketDate
  }

  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    subscriptionTier: teacher.subscriptionTier,
    createdAt: teacher.createdAt,
    role: teacher.role,
    _count: teacher._count,
    totalStudents: studentCount,
    lastActive,
  }
}
