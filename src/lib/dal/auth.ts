import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Authoritative auth check and teacher record sync.
 *
 * This function is the SINGLE SOURCE OF TRUTH for authentication.
 * The proxy (proxy.ts) is a UX convenience for redirects -- not a security boundary.
 *
 * On first authentication, automatically creates a Teacher record in Prisma
 * linked to the Supabase Auth user via supabaseAuthId.
 *
 * @returns The Teacher record if authenticated, or null if not.
 */
export async function getAuthenticatedTeacher() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    return null
  }

  const claims = data.claims

  // Look up existing teacher by Supabase Auth ID
  let teacher = await prisma.teacher.findUnique({
    where: { supabaseAuthId: claims.sub },
  })

  // Auto-create teacher record on first authentication
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        supabaseAuthId: claims.sub,
        email: claims.email ?? '',
        name: claims.user_metadata?.name as string | undefined,
      },
    })
  }

  return teacher
}
