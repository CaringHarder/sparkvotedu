'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const displayNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer').trim(),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const forceSetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ---------------------------------------------------------------------------
// updateDisplayName
// ---------------------------------------------------------------------------

export async function updateDisplayName(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = displayNameSchema.safeParse({
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { name: parsed.data.name.trim() },
    })
  } catch {
    return { error: 'Failed to update display name. Please try again.' }
  }

  revalidatePath('/profile')
  return { success: 'Display name updated.' }
}

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------

export async function changePassword(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: teacher.email,
    password: parsed.data.currentPassword,
  })

  if (signInError) {
    return { error: 'Current password is incorrect' }
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })

  if (updateError) {
    return { error: 'Failed to update password. Please try again.' }
  }

  return { success: 'Password changed successfully.' }
}

// ---------------------------------------------------------------------------
// forceSetPassword
// ---------------------------------------------------------------------------

export async function forceSetPassword(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const parsed = forceSetPasswordSchema.safeParse({
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // Update password in Supabase Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })

  if (updateError) {
    return { error: 'Failed to set password. Please try again.' }
  }

  // Clear the forced reset flag BEFORE redirect to avoid race condition
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { mustChangePassword: false },
  })

  redirect('/dashboard')
}
