import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/update-password', '/auth', '/verify-email']
const PUBLIC_PAGES = ['/', '/join', '/pricing']

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
}

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true
  // Student-facing routes are accessible without authentication
  if (pathname.startsWith('/join/')) return true
  if (pathname.startsWith('/session/')) return true
  if (pathname.startsWith('/api/sessions/')) return true
  // Bracket state API for polling fallback (students on networks blocking WebSocket)
  if (pathname.startsWith('/api/brackets/')) return true
  // Poll state API for polling fallback (same pattern as brackets)
  if (pathname.startsWith('/api/polls/')) return true
  // Webhook endpoints (Stripe) -- signature verification handles auth
  if (pathname.startsWith('/api/webhooks/')) return true
  return false
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getClaims() -- validates JWT via cached JWKS, faster than getUser()/getSession()
  const {
    data,
    error,
  } = await supabase.auth.getClaims()

  const claims = data?.claims ?? null
  const pathname = request.nextUrl.pathname

  // Handle /set-password route (forced password reset for admin-created accounts)
  if (pathname === '/set-password') {
    if (!claims) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Authenticated user -- check if they actually need to set password
    const teacher = await prisma.teacher.findUnique({
      where: { supabaseAuthId: claims.sub },
      select: { mustChangePassword: true },
    })
    if (!teacher?.mustChangePassword) {
      // No forced reset needed -- send to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // User needs to set password -- allow access to /set-password
    return supabaseResponse
  }

  // Redirect unauthenticated users to login (except auth and public pages)
  if ((error || !claims) && !isAuthPage(pathname) && !isPublicPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (claims && isAuthPage(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin route protection: check role and deactivation for /admin paths
  if (claims && pathname.startsWith('/admin')) {
    const teacher = await prisma.teacher.findUnique({
      where: { supabaseAuthId: claims.sub },
      select: { role: true, deactivatedAt: true },
    })

    if (teacher?.deactivatedAt) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (teacher?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Dashboard route protection: block deactivated teachers + force password reset
  if (claims && pathname.startsWith('/dashboard')) {
    const teacher = await prisma.teacher.findUnique({
      where: { supabaseAuthId: claims.sub },
      select: { deactivatedAt: true, mustChangePassword: true },
    })

    if (teacher?.deactivatedAt) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Force password reset for admin-created accounts with temporary password
    if (teacher?.mustChangePassword) {
      const url = request.nextUrl.clone()
      url.pathname = '/set-password'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
