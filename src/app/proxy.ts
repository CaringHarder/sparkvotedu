import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/update-password', '/auth']
const PUBLIC_PAGES = ['/', '/join']

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
