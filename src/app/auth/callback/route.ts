import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sync teacher profile data from OAuth provider metadata
      await syncTeacherProfile(supabase)

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error if code exchange fails or no code provided
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

/**
 * Sync teacher profile data (name, avatar) from OAuth provider metadata
 * to the Teacher record in the database.
 *
 * Provider metadata field names vary:
 * - Google: full_name, avatar_url, email
 * - Azure/Microsoft: full_name or name, avatar_url or picture, email
 * - Apple: full_name (may be null on subsequent logins), no avatar, email
 *
 * Errors are logged but never block the redirect -- the teacher should
 * always reach the dashboard even if profile sync fails.
 */
async function syncTeacherProfile(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('OAuth callback: failed to get user', userError?.message)
      return
    }

    const metadata = user.user_metadata
    const email = user.email ?? metadata.email
    const name: string | null =
      metadata.full_name ?? metadata.name ?? null
    const avatarUrl: string | null =
      metadata.avatar_url ?? metadata.picture ?? null

    if (!email) {
      console.error('OAuth callback: no email found for user', user.id)
      return
    }

    await prisma.teacher.upsert({
      where: { supabaseAuthId: user.id },
      create: {
        email,
        name,
        avatarUrl,
        supabaseAuthId: user.id,
      },
      update: {
        // Only overwrite name/avatarUrl if the new value is non-null.
        // This prevents Apple (which may return null on subsequent logins)
        // from erasing previously stored profile data.
        ...(name ? { name } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    })
  } catch (err) {
    console.error('OAuth callback: teacher profile sync failed', err)
  }
}
