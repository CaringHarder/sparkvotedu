'use server'

import { getAuthenticatedAdmin, getTeacherDetail } from '@/lib/dal/admin'
import type { TeacherDetail } from '@/lib/dal/admin'

/**
 * Server action to fetch teacher detail for the slide-out panel.
 *
 * Requires admin authentication. Returns null if not authorized or not found.
 */
export async function getTeacherDetailAction(
  teacherId: string
): Promise<TeacherDetail | null> {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return null

  return getTeacherDetail(teacherId)
}
