'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthenticatedAdmin,
  getTeacherDetail,
  deactivateTeacherAccount,
  reactivateTeacherAccount,
  overrideTeacherTier,
  createTeacherWithTempPassword,
} from '@/lib/dal/admin'
import type { TeacherDetail } from '@/lib/dal/admin'
import type { SubscriptionTier } from '@/lib/gates/tiers'

const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'pro_plus']

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

/**
 * Deactivate a teacher account.
 *
 * Sets deactivatedAt, bans in Supabase Auth, and revalidates admin pages.
 */
export async function deactivateTeacherAction(
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return { success: false, error: 'Not authorized' }

  try {
    await deactivateTeacherAccount(teacherId)
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to deactivate',
    }
  }
}

/**
 * Reactivate a previously deactivated teacher account.
 *
 * Clears deactivatedAt, removes Supabase Auth ban, and revalidates admin pages.
 */
export async function reactivateTeacherAction(
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return { success: false, error: 'Not authorized' }

  try {
    await reactivateTeacherAccount(teacherId)
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reactivate',
    }
  }
}

/**
 * Override a teacher's subscription tier.
 *
 * Validates tier is a valid SubscriptionTier, updates, and revalidates.
 */
export async function overrideTierAction(
  teacherId: string,
  tier: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return { success: false, error: 'Not authorized' }

  if (!VALID_TIERS.includes(tier as SubscriptionTier)) {
    return { success: false, error: `Invalid tier: ${tier}` }
  }

  try {
    await overrideTeacherTier(teacherId, tier)
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update tier',
    }
  }
}

/**
 * Create a new teacher account with a temporary password.
 *
 * Parses name, email, tier from FormData. Returns the temp password on success.
 */
export async function createTeacherAccountAction(
  _prevState: { error?: string; success?: string; tempPassword?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string; tempPassword?: string }> {
  const admin = await getAuthenticatedAdmin()
  if (!admin) return { error: 'Not authorized' }

  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const tier = (formData.get('tier') as string) ?? 'free'

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A valid email is required' }
  }

  if (!VALID_TIERS.includes(tier as SubscriptionTier)) {
    return { error: `Invalid tier: ${tier}` }
  }

  try {
    const { tempPassword } = await createTeacherWithTempPassword({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      tier,
    })

    revalidatePath('/admin')
    return {
      success: 'Teacher account created successfully.',
      tempPassword,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create account',
    }
  }
}
