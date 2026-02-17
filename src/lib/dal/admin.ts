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
