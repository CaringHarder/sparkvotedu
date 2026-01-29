'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signUpSchema, signInSchema } from '@/lib/utils/validation'

export async function signUp(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for a confirmation link.' }
}

export async function signIn(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
