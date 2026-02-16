# Phase 1: Foundation & Auth - Research

**Researched:** 2026-01-29
**Domain:** Next.js 16 project scaffolding, Supabase Auth (email/password + OAuth), Prisma ORM, session management, feature gating
**Confidence:** HIGH (verified via official docs, npm, Prisma changelog, Supabase docs, Next.js docs)

## Summary

This research covers everything needed to plan Phase 1: scaffolding a Next.js 16.1 project, integrating Supabase Auth with email/password and three OAuth providers (Google, Microsoft, Apple), connecting Prisma ORM v7 to Supabase PostgreSQL, implementing session persistence, password reset, logout, and building a centralized feature gating system.

The most significant finding is that **Prisma is now at v7** (not v6 as stated in project-level STACK.md). Prisma v7 has major breaking changes: it requires `prisma.config.ts`, driver adapters (`@prisma/adapter-pg`), ESM-only output, and no longer stores `url`/`directUrl` in `schema.prisma`. Additionally, **Next.js 16 renames `middleware.ts` to `proxy.ts`** with the exported function renamed from `middleware()` to `proxy()`. The proxy runs on Node.js runtime only (edge runtime deprecated). Supabase Auth now recommends `getClaims()` over `getUser()` for server-side JWT validation (faster, cached JWKS verification). These three discoveries significantly change implementation patterns from what the project-level research assumed.

Apple OAuth requires a **6-month secret key rotation** -- a critical maintenance task that must be planned for. Microsoft OAuth requires the `xms_edov` claim for email verification security. Supabase Auth automatically links identities with the same email across different providers, simplifying the multi-provider experience.

**Primary recommendation:** Use `prisma-client-js` generator (not the new `prisma-client`) for Turbopack compatibility with Next.js 16. Use `getClaims()` in proxy and Server Components for auth checks. Build the feature gate as a pure-function `canAccess()` in `lib/` that is called at three layers: proxy (optimistic redirect), DAL (authoritative check), and component (UI gating).

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1 | Full-stack React framework | Verified current stable (Dec 2025). App Router, Turbopack default, React 19.2 bundled. |
| React | 19.2 | UI library | Ships with Next.js 16. Do NOT install separately. |
| TypeScript | 5.x | Type safety | Scaffolded by default. Next.js 16 requires 5.1.0+, Prisma 7 requires 5.4.0+. |
| Tailwind CSS | 4.x | Styling | Scaffolded by default. CSS-first config (no tailwind.config.js). |
| @supabase/supabase-js | 2.90.x | Supabase client | Current stable. Manages auth, database, realtime. |
| @supabase/ssr | 0.8.x | SSR cookie management | Thin layer over supabase-js for server-side cookie-based auth. Replaces deprecated auth-helpers. |
| Prisma | 7.3.x | ORM / database toolkit | Current stable. **NOT v6** as project STACK.md stated. Major breaking changes from v6. |
| @prisma/adapter-pg | latest | PostgreSQL driver adapter | Required in Prisma v7. Connects PrismaClient to pg driver. |
| pg | latest | PostgreSQL driver | Required by @prisma/adapter-pg for database connections. |
| shadcn/ui | latest | UI component library | Copy-paste components. Supports Tailwind v4 and React 19. Uses OKLCH colors, tw-animate-css. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.x | Schema validation | Form validation for signup/login forms. |
| Lucide React | latest | Icons | Default icon set for shadcn/ui. |
| tw-animate-css | latest | CSS animations | Replaces deprecated tailwindcss-animate. Installed by shadcn init. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | Auth.js v5 / NextAuth | Auth.js is standalone-best but redundant when already using Supabase. |
| Prisma v7 | Drizzle ORM | Drizzle avoids adapter complexity but has smaller ecosystem. Prisma v7 is decided. |
| getClaims() | getUser() | getUser() always hits Supabase server (slower). getClaims() uses cached JWKS (faster). Use getUser() only when checking if user is banned/deleted. |

**Installation:**

```bash
# Scaffold Next.js 16 project
npx create-next-app@16 sparkvotedu --yes

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Prisma v7 (ESM-only)
npm install prisma @prisma/client @prisma/adapter-pg pg
npm install -D @types/pg

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label separator

# Validation
npm install zod

# Icons (installed with shadcn but explicit for clarity)
npm install lucide-react
```

**Critical: Prisma v7 ESM Setup**

Prisma v7 requires ESM. Next.js 16 supports ESM when `"type": "module"` is in `package.json`. However, there is a known Turbopack compatibility issue with the new `prisma-client` generator. Use `prisma-client-js` instead:

```json
// package.json - add "type": "module"
{
  "type": "module"
}
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 Only)

```
src/
├── app/
│   ├── (auth)/                   # Route group: auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── update-password/page.tsx
│   │   └── layout.tsx            # Centered card layout
│   ├── (dashboard)/              # Route group: protected pages
│   │   ├── page.tsx              # Dashboard shell
│   │   └── layout.tsx            # Sidebar + header layout
│   ├── (marketing)/              # Route group: public pages
│   │   ├── page.tsx              # Landing page (minimal in Phase 1)
│   │   └── layout.tsx
│   ├── auth/
│   │   └── callback/route.ts    # OAuth callback handler (PKCE code exchange)
│   ├── layout.tsx                # Root layout
│   └── proxy.ts                  # Auth proxy (replaces middleware.ts)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts             # Server Supabase client (createServerClient)
│   │   └── admin.ts              # Service role client (for admin operations)
│   ├── dal/
│   │   └── auth.ts               # Data access: session, user queries
│   ├── gates/
│   │   ├── features.ts           # canAccess() centralized gate function
│   │   └── tiers.ts              # TIER_LIMITS constant definitions
│   └── utils/
│       └── validation.ts         # Zod schemas for auth forms
├── actions/
│   └── auth.ts                   # Server Actions: signup, login, logout, reset
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── update-password-form.tsx
│   │   ├── oauth-buttons.tsx     # Google, Microsoft, Apple buttons
│   │   └── signout-button.tsx
│   └── dashboard/
│       └── shell.tsx             # Dashboard layout shell (placeholder)
├── hooks/
│   └── use-auth.ts               # Client-side auth state hook
├── types/
│   └── database.ts               # Prisma generated types
└── prisma/
    ├── schema.prisma             # Database schema
    ├── generated/                # Prisma v7 generated client output
    │   └── prisma/
    └── migrations/
```

### Pattern 1: Next.js 16 Proxy for Auth (replaces middleware)

**What:** `proxy.ts` intercepts requests before they reach the server. It refreshes Supabase auth tokens and redirects unauthenticated users away from protected routes.
**When to use:** Every request. The proxy is the first line of defense but NOT a security boundary -- it only does optimistic checks.

**Example:**
```typescript
// src/proxy.ts (or proxy.ts at project root)
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Use getClaims() -- validates JWT via cached JWKS, faster than getUser()
  const { data: { claims }, error } = await supabase.auth.getClaims()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/auth')

  // Redirect unauthenticated users to login (except auth pages)
  if ((error || !claims) && !isAuthPage && !request.nextUrl.pathname.startsWith('/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (claims && isAuthPage) {
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
```

### Pattern 2: Server Client Creation with Cookie Adapter

**What:** The Supabase server client must use `getAll()` and `setAll()` for cookies -- never individual `get`/`set`/`remove`.
**When to use:** Every Server Component, Server Action, and Route Handler.

**Example:**
```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context -- cannot write cookies.
            // Proxy handles token refresh; this is a safe fallback.
          }
        },
      },
    }
  )
}
```

### Pattern 3: PKCE Auth Callback Route Handler

**What:** When OAuth or magic link redirects back to the app, this route handler exchanges the auth code for a session.
**When to use:** All OAuth flows (Google, Microsoft, Apple) and password reset.

**Example:**
```typescript
// app/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error if code exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### Pattern 4: Prisma v7 Client Setup with Driver Adapter

**What:** Prisma v7 requires explicit driver adapters. The connection goes through Supavisor (pooled) for runtime queries and direct for CLI migrations.
**When to use:** All database operations.

**Example:**
```typescript
// lib/prisma.ts
// Source: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7

import { PrismaClient } from '../prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

```typescript
// prisma.config.ts (project root)
// Source: https://www.prisma.io/docs/orm/overview/databases/supabase

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DIRECT_URL'),  // Direct connection for CLI (migrations)
  },
})
```

```prisma
// prisma/schema.prisma
// IMPORTANT: Use prisma-client-js (not prisma-client) for Turbopack compatibility
// Source: https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix

generator client {
  provider = "prisma-client-js"
  output   = "./generated/prisma"
}

datasource db {
  provider  = "postgresql"
  // url and directUrl are configured in prisma.config.ts (Prisma v7)
}

model Teacher {
  id                String   @id @default(uuid())
  email             String   @unique
  name              String?
  avatarUrl         String?  @map("avatar_url")
  subscriptionTier  String   @default("free") @map("subscription_tier")
  stripeCustomerId  String?  @map("stripe_customer_id")
  supabaseAuthId    String   @unique @map("supabase_auth_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("teachers")
}
```

### Pattern 5: Centralized Feature Gate System

**What:** A pure function `canAccess()` that checks if a user's tier allows a feature. Called at three layers: proxy (optimistic), DAL (authoritative), component (UX).
**When to use:** Every feature that differs between Free/Pro/Pro Plus.

**Example:**
```typescript
// lib/gates/tiers.ts

export type SubscriptionTier = 'free' | 'pro' | 'pro_plus'

export const TIER_LIMITS = {
  free: {
    maxBrackets: 3,
    maxEntrantsPerBracket: 16,
    bracketTypes: ['single_elimination'] as const,
    pollTypes: ['simple'] as const,
    analytics: false,
    sportsIntegration: false,
    csvUpload: false,
    liveEventMode: false,
  },
  pro: {
    maxBrackets: 25,
    maxEntrantsPerBracket: 64,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin'] as const,
    pollTypes: ['simple', 'ranked'] as const,
    analytics: true,
    sportsIntegration: false,
    csvUpload: true,
    liveEventMode: true,
  },
  pro_plus: {
    maxBrackets: Infinity,
    maxEntrantsPerBracket: 128,
    bracketTypes: ['single_elimination', 'double_elimination', 'round_robin', 'predictive'] as const,
    pollTypes: ['simple', 'ranked'] as const,
    analytics: true,
    sportsIntegration: true,
    csvUpload: true,
    liveEventMode: true,
  },
} as const

// lib/gates/features.ts

import { TIER_LIMITS, type SubscriptionTier } from './tiers'

export type FeatureKey = keyof typeof TIER_LIMITS.free

interface AccessResult {
  allowed: boolean
  reason?: string
  upgradeTarget?: SubscriptionTier
}

export function canAccess(tier: SubscriptionTier, feature: FeatureKey): AccessResult {
  const limits = TIER_LIMITS[tier]
  const featureValue = limits[feature]

  if (typeof featureValue === 'boolean') {
    if (!featureValue) {
      const upgradeTarget = tier === 'free' ? 'pro' : 'pro_plus'
      return {
        allowed: false,
        reason: `${feature} requires ${upgradeTarget} plan`,
        upgradeTarget,
      }
    }
    return { allowed: true }
  }

  // For numeric/array limits, access is always allowed but may be limited
  return { allowed: true }
}

export function canCreateBracket(tier: SubscriptionTier, currentCount: number): AccessResult {
  const limit = TIER_LIMITS[tier].maxBrackets
  if (currentCount >= limit) {
    const upgradeTarget = tier === 'free' ? 'pro' : 'pro_plus'
    return {
      allowed: false,
      reason: `${tier} plan limited to ${limit} brackets`,
      upgradeTarget,
    }
  }
  return { allowed: true }
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` server-side:** Never trust `getSession()` in proxy or Server Components. It reads from cookies without validating the JWT. Use `getClaims()` (fast, cached JWKS) or `getUser()` (network call, authoritative).
- **Putting auth logic in proxy only:** Proxy is a UX convenience for redirects, NOT a security boundary. Always validate auth in Server Components/Actions via the DAL. CVE-2025-29927 demonstrated that middleware/proxy can be bypassed.
- **Using `@supabase/auth-helpers-nextjs`:** This package is deprecated. Use `@supabase/ssr` exclusively.
- **Using individual cookie methods:** Never use `get()`, `set()`, or `remove()` on cookies with Supabase SSR. Use only `getAll()` and `setAll()`.
- **Storing `url`/`directUrl` in `schema.prisma`:** Prisma v7 moved these to `prisma.config.ts`. The schema datasource block should have no URL.
- **Using `prisma-client` generator with Turbopack:** Use `prisma-client-js` for Turbopack compatibility in Next.js 16.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow (Google/Microsoft/Apple) | Custom OAuth implementation | Supabase Auth `signInWithOAuth()` | Token exchange, PKCE, state management, CSRF are complex. Supabase handles it all. |
| Session persistence across tabs/refresh | Custom localStorage token management | Supabase SSR cookie-based sessions | Cookies are httpOnly, secure, and automatically refreshed by proxy. |
| Password reset email delivery | Custom email sending with tokens | Supabase `resetPasswordForEmail()` | Handles token generation, email templating, expiration, and PKCE flow. |
| JWT validation | Manual JWT parsing/verification | Supabase `getClaims()` | Handles JWKS caching, key rotation, signature verification. |
| Identity linking (same email, different OAuth) | Custom account merging logic | Supabase automatic identity linking | Built-in: same email across Google/Microsoft/Apple auto-links to one user. |
| Connection pooling | Custom pgBouncer setup | Supavisor (Supabase built-in) | Port 6543 with `?pgbouncer=true` parameter. Zero config. |
| UI component primitives | Custom buttons/inputs/cards | shadcn/ui | Accessible (Radix UI), Tailwind-styled, copy-paste ownership. |
| Form validation | Manual regex/conditional checks | Zod schemas | Type-safe, composable, integrates with Server Actions. |

**Key insight:** In Phase 1, the auth domain is almost entirely handled by Supabase. The only custom code is the feature gating system and the "glue" between Supabase Auth and Prisma (syncing the Supabase auth user to the Prisma `Teacher` model).

## Common Pitfalls

### Pitfall 1: Using getSession() in Server Code

**What goes wrong:** `getSession()` reads from cookies without validating the JWT signature. An attacker can forge a cookie and bypass auth checks. CVE-2025-29927 showed that proxy-only auth is insufficient.
**Why it happens:** Old Supabase documentation (and many tutorials) used `getSession()`. The `getClaims()` method is newer.
**How to avoid:** Use `getClaims()` in proxy for token refresh. Use `getClaims()` or `getUser()` in Server Components/Actions for auth checks. Reserve `getUser()` for when you need to detect banned/deleted users.
**Warning signs:** Code contains `supabase.auth.getSession()` in any server-side file.

### Pitfall 2: Prisma v7 Turbopack Module Resolution

**What goes wrong:** Using the new `prisma-client` generator provider causes Turbopack build failures in Next.js 16 with errors about module resolution.
**Why it happens:** The new `prisma-client` output structure uses ESM paths that Turbopack's SSR resolution does not handle correctly.
**How to avoid:** Use `provider = "prisma-client-js"` in the generator block. This uses the older, battle-tested output structure that works with Turbopack.
**Warning signs:** Build errors mentioning `Cannot find module` or `__internal undefined` related to Prisma.

### Pitfall 3: Prisma v7 Environment Variable Loading

**What goes wrong:** Prisma v7 does not auto-load `.env` files. Database connections fail silently or throw cryptic errors.
**Why it happens:** Prisma v7 removed automatic dotenv loading. You must import `dotenv/config` explicitly.
**How to avoid:** Add `import 'dotenv/config'` at the top of `prisma.config.ts`. For the Next.js runtime, Next.js handles `.env.local` loading automatically so no extra import is needed in application code.
**Warning signs:** `prisma migrate dev` fails with connection errors while the app itself connects fine.

### Pitfall 4: Apple OAuth 6-Month Secret Rotation

**What goes wrong:** Apple Sign In stops working after 6 months because the client secret expired.
**Why it happens:** Apple requires generating a new secret key every 6 months using the .p8 signing key. This is a maintenance task, not a one-time setup.
**How to avoid:** Set a recurring calendar reminder. Document the rotation procedure. Store the .p8 file securely. Consider automating rotation with a scheduled job.
**Warning signs:** Apple OAuth suddenly returns errors after months of working. Users report "Sign in with Apple" failing.

### Pitfall 5: Microsoft OAuth Unverified Email Vulnerability

**What goes wrong:** Microsoft Entra ID can send unverified email addresses, enabling account takeover. An attacker registers a Microsoft account with someone else's email (unverified), then signs into your app, and gets linked to the victim's account.
**Why it happens:** Microsoft does not always verify email addresses, especially for personal accounts.
**How to avoid:** Configure the `xms_edov` optional claim in your Azure app manifest. This tells Supabase Auth whether the email is actually verified. Supabase Auth will reject unverified emails.
**Warning signs:** Users report unexpected account access. Auth logs show sign-ins from unverified Microsoft emails.

### Pitfall 6: School-Managed OAuth Account Restrictions

**What goes wrong:** Teachers at schools using Google Workspace for Education or Microsoft 365 Education cannot sign in because their admin has blocked third-party OAuth apps.
**Why it happens:** School IT admins commonly restrict OAuth to approved apps only for security/compliance.
**How to avoid:** Document the requirement for school admins to approve the OAuth app. Ensure email/password signup always works as a fallback. Consider applying for Google Workspace Marketplace listing if school adoption grows.
**Warning signs:** Teachers report "Access blocked" or "This app is not verified" errors during OAuth.

### Pitfall 7: Feature Gating as Afterthought

**What goes wrong:** Teams build all features first, then try to add subscription tier checks. This results in scattered `if (user.tier === 'pro')` checks, race conditions on downgrade, and no graceful upgrade prompts.
**Why it happens:** Feature gating feels like a simple if-check but is a cross-cutting concern.
**How to avoid:** Build the centralized `canAccess()` system in Phase 1 BEFORE any gated features exist. Every subsequent phase uses this gate system. Define downgrade behavior now: data is preserved but read-only after downgrade.
**Warning signs:** Feature checks are inline rather than going through `canAccess()`. Free-tier users can access pro features by calling APIs directly.

### Pitfall 8: Supabase Email Rate Limits

**What goes wrong:** Password reset emails stop being delivered in development because Supabase's built-in email service has a rate limit of 2 emails per hour.
**Why it happens:** The default Supabase email service is best-effort with strict rate limits.
**How to avoid:** For development, use `supabase start` locally (includes Mailpit for email capture). For production, configure a custom SMTP server (Resend, Postmark, SendGrid) in the Supabase dashboard.
**Warning signs:** Password reset emails are delayed or never arrive. Users report not receiving verification emails.

## Code Examples

### Email/Password Sign Up (Server Action)

```typescript
// actions/auth.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
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

  // After signup, user needs to verify email (Supabase sends confirmation)
  return { success: 'Check your email for a confirmation link.' }
}
```

### Email/Password Sign In (Server Action)

```typescript
// actions/auth.ts (continued)

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### OAuth Sign-In (Client Component)

```typescript
// components/auth/oauth-buttons.tsx
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google

'use client'

import { createClient } from '@/lib/supabase/client'

export function OAuthButtons() {
  const supabase = createClient()

  const handleOAuth = async (provider: 'google' | 'azure' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Azure requires 'email' scope
        ...(provider === 'azure' && { scopes: 'email' }),
      },
    })
    if (error) console.error('OAuth error:', error.message)
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => handleOAuth('google')}>
        Continue with Google
      </button>
      <button onClick={() => handleOAuth('azure')}>
        Continue with Microsoft
      </button>
      <button onClick={() => handleOAuth('apple')}>
        Continue with Apple
      </button>
    </div>
  )
}
```

### Password Reset Flow

```typescript
// actions/auth.ts (continued)
// Source: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for a password reset link.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### Sign Out (Server Action)

```typescript
// actions/auth.ts (continued)
// Source: https://supabase.com/docs/guides/auth/signout

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

### Browser Client

```typescript
// lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx  # or legacy anon key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Never expose to client

# Prisma - Supabase connection strings
DATABASE_URL="postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

NEXT_PUBLIC_SITE_URL=http://localhost:3000  # For auth redirects
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js 16 (Dec 2025) | File and function rename required. Node.js runtime only (edge deprecated). |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Package deprecated. Use `@supabase/ssr` for all new projects. |
| `supabase.auth.getSession()` server-side | `supabase.auth.getClaims()` | 2025 | getClaims validates JWT via JWKS. getSession reads cookies without validation. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025-2026 | New publishable key format. Both work during transition period. |
| Prisma v6: `url = env("DATABASE_URL")` in schema | Prisma v7: `prisma.config.ts` + driver adapters | Prisma 7.0 (2025) | `url`/`directUrl` removed from schema. Adapter required for PrismaClient. |
| Prisma v6: CJS output, auto-dotenv, auto-generate | Prisma v7: ESM-only, explicit dotenv, explicit generate | Prisma 7.0 (2025) | `"type": "module"` in package.json. Run `prisma generate` explicitly after migrations. |
| `tailwindcss-animate` | `tw-animate-css` | Tailwind v4 / shadcn latest | Old package deprecated. shadcn init installs new one automatically. |
| `tailwind.config.js` | CSS-first config via `@import "tailwindcss"` | Tailwind CSS 4.0 | No JavaScript config file. Theme via CSS variables and `@theme` directive. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16. `middleware.ts` still works but is deprecated and will be removed.
- `tailwindcss-animate`: Replaced by `tw-animate-css`.
- `tailwind.config.js`: Replaced by CSS-first configuration in Tailwind v4.

## Open Questions

1. **Prisma v7 + Next.js 16 `"type": "module"` stability**
   - What we know: Prisma v7 requires ESM. Next.js 16 supports `"type": "module"`. Known Turbopack issue with `prisma-client` generator (workaround: use `prisma-client-js`).
   - What's unclear: Whether there are other ESM compatibility issues in the full stack (Supabase, shadcn, etc.) when `"type": "module"` is set.
   - Recommendation: Set `"type": "module"` early and test the entire toolchain. If issues arise, Prisma v7 supports `moduleFormat = "cjs"` as a generator option to output CJS while still using ESM internally.

2. **Supabase publishable key vs anon key**
   - What we know: Supabase is transitioning from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both work during the transition.
   - What's unclear: Whether the Supabase dashboard currently shows the new key format or the legacy format.
   - Recommendation: Use whichever key the dashboard provides. Name the env var `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` regardless (the value is interchangeable).

3. **getClaims() asymmetric JWT key requirement**
   - What we know: `getClaims()` works best with asymmetric JWT signing keys (local JWKS validation). Without them, it falls back to a network request (like `getUser()`).
   - What's unclear: Whether new Supabase projects use asymmetric keys by default.
   - Recommendation: Check the Supabase project settings. If not using asymmetric keys, `getClaims()` still works but with a network call. Consider enabling asymmetric keys for performance.

4. **Password reset PKCE flow on deployment**
   - What we know: Some users report "Auth Session Missing" errors with password reset on Vercel deployments (works locally). The PKCE code verifier may be lost during the redirect.
   - What's unclear: Whether this is resolved in current `@supabase/ssr` v0.8.x.
   - Recommendation: Use the `token_hash` approach with `verifyOtp()` if the standard `exchangeCodeForSession()` fails in production. Test password reset flow on Vercel preview deployments early.

5. **Syncing Supabase Auth user to Prisma Teacher model**
   - What we know: Supabase Auth manages user records in its own `auth.users` table. Our app needs a `Teacher` record in the public schema linked via `supabase_auth_id`.
   - What's unclear: Best pattern for this sync -- database trigger, webhook, or application-level check.
   - Recommendation: Use an application-level "ensure teacher exists" check in the DAL. After `getClaims()` succeeds, query the `Teacher` table by `supabase_auth_id`. If not found, create the record. This is simpler than triggers and works with all auth methods.

## OAuth Provider Setup Reference

### Google OAuth

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Go to Google Auth Platform > Clients > Create OAuth client (Web application)
3. Add authorized JavaScript origins: `https://sparkvotedu.com`, `http://localhost:3000`
4. Add authorized redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase Dashboard > Auth > Providers > Google
6. Required scopes: `openid`, `email`, `profile`

### Microsoft OAuth

1. Go to [portal.azure.com](https://portal.azure.com) > Microsoft Entra ID > App registrations > New
2. Choose "Accounts in any organizational directory and personal Microsoft accounts" for broadest access
3. Set redirect URI: `https://[project-ref].supabase.co/auth/v1/callback` (Web type)
4. Create Client Secret (copy the **Value**, not Secret ID)
5. **Security:** Edit manifest to add `xms_edov` optional claim (prevents unverified email attacks)
6. Copy Client ID and Client Secret to Supabase Dashboard > Auth > Providers > Azure
7. Set Azure Tenant URL to `https://login.microsoftonline.com/common` (or specific tenant)
8. **Note:** Azure blocks `127.0.0.1` for local dev. Use `localhost` instead.

### Apple OAuth

1. Apple Developer account ($99/year) required
2. Create App ID with "Sign in with Apple" capability
3. Create Services ID (e.g., `com.sparkvotedu.web`)
4. Generate signing key (.p8 file) -- **store securely, cannot be re-downloaded**
5. Generate client secret using Supabase's tool (valid 6 months)
6. Copy Service ID, Team ID, Key ID, and secret to Supabase Dashboard > Auth > Providers > Apple
7. **Critical maintenance:** Regenerate client secret every 6 months. Set calendar reminder.
8. **Limitation:** Apple does not include full name in identity token for OAuth flow. Capture name on first sign-in form and use `updateUser()`.

## Sources

### Primary (HIGH confidence)

- [Next.js 16 proxy.ts API reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- Function signature, matcher config, Node.js runtime
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- Turbopack default, React 19.2, proxy rename
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- Breaking changes, migration steps
- [Next.js create-next-app docs](https://nextjs.org/docs/app/api-reference/cli/create-next-app) -- Default setup flow, --yes flag
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- SSR setup, proxy pattern, cookie handling
- [Supabase AI Prompt: Next.js v16 + Auth](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) -- Server/browser client code, proxy code
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Setup steps, callback URL
- [Supabase Microsoft OAuth](https://supabase.com/docs/guides/auth/social-login/auth-azure) -- Azure Entra setup, xms_edov claim
- [Supabase Apple OAuth](https://supabase.com/docs/guides/auth/social-login/auth-apple) -- Secret rotation, name limitation
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking) -- Automatic email-based linking
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) -- API reference
- [Supabase Sign Out](https://supabase.com/docs/guides/auth/signout) -- Sign out patterns
- [Prisma 7.0 release blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) -- Breaking changes, ESM, adapters
- [Prisma 7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7) -- prisma.config.ts, driver adapters, ESM
- [Prisma + Supabase guide](https://www.prisma.io/docs/orm/overview/databases/supabase) -- Connection strings, pooling
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) -- CLI init, component adding
- [shadcn/ui Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) -- OKLCH, tw-animate-css, data-slot
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.90.1 current
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) -- v0.8.0 current

### Secondary (MEDIUM confidence)

- [Supabase getClaims vs getUser discussion](https://github.com/supabase/supabase/issues/40985) -- Clarification on when to use each
- [getClaims and token refresh discussion](https://www.answeroverflow.com/m/1430675585935343777) -- JWKS caching behavior
- [Prisma v7 Next.js 16 Turbopack fix](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix) -- prisma-client-js workaround
- [Prisma ESM issue #28670](https://github.com/prisma/prisma/issues/28670) -- ESM instantiation errors
- [Supabase PKCE flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- Code exchange, auth methods

### Tertiary (LOW confidence)

- [Auth0 blog: Next.js 16 auth changes](https://auth0.com/blog/whats-new-nextjs-16/) -- Third-party perspective on proxy rename
- [Feature gating architecture patterns](https://dev.to/getstigg/how-to-gate-end-user-access-to-features-shortcomings-of-plan-identifiers-authorization-feature-flags-38dh) -- General patterns, not specific implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via npm, official docs, release blogs for all core packages
- Architecture: HIGH - Proxy pattern from Next.js 16 official docs, Supabase AI prompt, Prisma upgrade guide
- Pitfalls: HIGH - Prisma Turbopack issue confirmed via GitHub issue + community blog; Apple rotation in official docs; getClaims vs getSession in official docs
- Feature gating: MEDIUM - Pattern is well-established in architecture, specific implementation is project-specific

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days -- stack is stable; check Prisma for v7.x patches)
