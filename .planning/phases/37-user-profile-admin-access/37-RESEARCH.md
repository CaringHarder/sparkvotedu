# Phase 37: User Profile & Admin Access - Research

**Researched:** 2026-03-02
**Domain:** User account management, password change flows, forced password reset, admin navigation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Profile page layout:** Three sections: Display Name (editable), Password Change, Account Info (email + role, read-only). Email is read-only. Save button per section.
- **Password change flow:** Minimum 8+ characters only, no complexity rules. No "Forgot password?" link on profile page.
- **Forced password reset:** Admin-created passwords are automatically temporary (no checkbox). Welcoming tone: "Welcome to SparkVote! Set your password to get started." After setting password, teacher lands on dashboard without re-login.
- **Admin access:** Gear icon in upper corner near sign out button, only visible to admins. Tooltip "Admin Panel" on hover. Opens /admin in new tab.
- **Non-admin users never see the gear icon.**

### Claude's Discretion
- Visual style of profile page (card sections vs clean form)
- Password change UX (inline fields vs modal dialog)
- Forced reset presentation (full-page takeover vs non-dismissable modal)
- Profile link placement in sidebar
- Post password-change behavior (stay logged in vs sign out -- lean toward least disruptive)

### Deferred Ideas (OUT OF SCOPE)
- Email verification required before login -- belongs in Phase 38
- Email editing from profile page -- deliberately excluded (read-only for now)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROFILE-01 | Teacher can edit display name from profile page and save it | Prisma Teacher.name field exists; server action updates via prisma.teacher.update; existing validation pattern with Zod |
| PROFILE-02 | Teacher can change password from profile page (current + new + confirm) | Supabase signInWithPassword for current password verification, then updateUser for new password; existing updatePasswordSchema pattern |
| PROFILE-03 | Admin-created accounts force password change on first login before accessing dashboard | Use Supabase app_metadata flag set during admin.createUser; proxy.ts intercept redirects to forced-reset page; clear flag via admin.updateUserById after password set |
| ADMIN-01 | Admin users see admin link/icon in sidebar/header that navigates to /admin | Add gear icon to dashboard header, conditionally rendered based on teacher.role; use existing getAuthenticatedTeacher pattern |
</phase_requirements>

## Summary

This phase adds four independent features to the SparkVotEDU teacher dashboard: a profile page for name editing, a password change flow, a forced password reset for admin-created accounts, and an admin panel quick-access icon. All four features build on existing infrastructure without requiring new dependencies.

The codebase already has the complete foundation: Supabase auth with `signInWithPassword`/`updateUser` methods, a Prisma `Teacher` model with `name`, `email`, and `role` fields, a well-structured dashboard layout with sidebar navigation and a header bar, Zod validation schemas for password operations, and server actions that follow a consistent pattern. The admin creation flow (`createTeacherWithTempPassword`) already exists but does not flag the password as temporary -- this is the key gap to fill.

The most architecturally significant piece is the forced password reset. The recommended approach uses Supabase `app_metadata` (server-only, not user-modifiable) to store a `must_change_password` flag, with the proxy/middleware layer intercepting authenticated requests and redirecting to a dedicated password-reset page. This is the only piece that touches the auth flow; everything else is straightforward CRUD and UI work.

**Primary recommendation:** Use Supabase `app_metadata.must_change_password` flag for forced reset detection, card-based profile sections with per-section save buttons, inline password fields (not modal), full-page forced reset (matching auth layout), and a gear icon in the dashboard header next to sign out.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, server actions, route groups | Project framework |
| @supabase/ssr | 0.8.0 | Server-side Supabase client with cookie handling | Auth operations |
| @supabase/supabase-js | 2.93.3 | Admin client for app_metadata updates | Service role operations |
| Prisma | 7.3.0 | Teacher record CRUD (name update) | Project ORM |
| Zod | 4.3.6 | Form validation schemas | Project validation |
| Lucide React | 0.563.0 | Icons (Settings, User, Shield) | Project icon library |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Dialog component (already in project) | Not needed -- use inline fields |
| Tailwind CSS | 4 | Styling | All components |

### No New Dependencies Required
This phase requires zero new npm packages. Everything needed is already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(dashboard)/profile/
    page.tsx                     # Profile page (server component, fetches teacher data)
  app/(auth)/set-password/
    page.tsx                     # Forced password reset page (welcoming tone)
  actions/
    profile.ts                   # Server actions: updateDisplayName, changePassword
  lib/dal/
    auth.ts                      # Existing -- add isTempPassword helper
  components/
    profile/
      display-name-section.tsx   # Editable name card with save
      password-change-section.tsx # Current + new + confirm password card
      account-info-section.tsx   # Read-only email + role display
    dashboard/
      sidebar-nav.tsx            # Modified -- add Profile link
      admin-gear-button.tsx      # New -- gear icon for admin header
    auth/
      set-password-form.tsx      # Forced reset form (welcoming onboarding tone)
```

### Pattern 1: Per-Section Server Actions
**What:** Each profile section has its own server action and save button, keeping mutations independent.
**When to use:** When sections have different validation rules and can be saved independently.
**Example:**
```typescript
// src/actions/profile.ts
'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
})

export async function updateDisplayName(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = updateNameSchema.safeParse({
    name: formData.get('name'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { name: parsed.data.name.trim() },
  })

  return { success: 'Name updated successfully.' }
}
```

### Pattern 2: Password Change with Current Password Verification
**What:** Verify current password via `signInWithPassword` before allowing `updateUser`.
**When to use:** Profile password change (not forced reset, which doesn't require current password).
**Why not reauthenticate():** Supabase's `reauthenticate()` sends an email OTP which is UX-disruptive. Using `signInWithPassword` with the current email+password is immediate and keeps the user on the page.
**Example:**
```typescript
// src/actions/profile.ts (continued)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function changePassword(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: teacher.email,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect' }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) return { error: updateError.message }

  return { success: 'Password changed successfully.' }
}
```

### Pattern 3: Forced Password Reset via app_metadata
**What:** Set `must_change_password: true` in Supabase `app_metadata` when admin creates account. Check this flag in the proxy/auth layer and redirect to a dedicated set-password page.
**Why app_metadata (not user_metadata):** `app_metadata` is server-only and cannot be modified by the user via `supabase.auth.updateUser()`. This prevents users from bypassing the forced reset by calling the Supabase client directly.
**Why not a Prisma column:** Keeping the flag in Supabase `app_metadata` means the proxy layer can check it without an extra database query (the claims from getClaims() may not include app_metadata, so we need a lightweight lookup -- see implementation note below).

**Implementation approach:**

1. **On admin account creation** (`createTeacherWithTempPassword`): After creating the Supabase auth user, call `admin.auth.admin.updateUserById()` to set `app_metadata: { must_change_password: true }`.

2. **On login intercept** (proxy.ts): After verifying authentication for dashboard routes, fetch the user's app_metadata and check the flag. If true, redirect to `/set-password`.

3. **On forced password set** (set-password action): Call `supabase.auth.updateUser({ password })` then clear the flag via `admin.auth.admin.updateUserById(uid, { app_metadata: { must_change_password: false } })`. Redirect to `/dashboard`.

**Alternative approach (simpler -- Prisma column):** Add a `mustChangePassword` Boolean column to the Teacher model. This avoids the complexity of app_metadata but requires a Prisma migration. The proxy already queries the Teacher table for deactivation checks on dashboard routes, so adding this field to the same query is essentially free. **This is the recommended approach for this project** because the proxy already hits Prisma, and it avoids Supabase admin API complexity.

### Pattern 4: Conditional Admin Gear Icon
**What:** Show a gear icon in the dashboard header only for admin users.
**When to use:** The teacher's role must be checked server-side, then passed to the client component.
**Example:**
```typescript
// In dashboard layout.tsx -- fetch teacher role
import { getAuthenticatedTeacher } from '@/lib/dal/auth'

// Pass role to a client component that conditionally renders the gear
<AdminGearButton isAdmin={teacher?.role === 'admin'} />
```

### Discretion Recommendations

**Profile page style: Card sections.** The existing dashboard uses cards extensively (billing page, bracket detail). Three clean cards (Display Name, Password, Account Info) with individual save buttons matches the project's visual language.

**Password change UX: Inline fields.** Since each section has its own save button (locked decision), inline fields within the Password Change card are the natural fit. A modal adds unnecessary complexity and breaks the per-section save pattern.

**Forced reset presentation: Full-page takeover using the (auth) layout.** The existing `(auth)` layout provides a centered card with SparkVotEDU branding. Creating a `/set-password` route under `(auth)` reuses this layout and provides a non-dismissable experience (there is no sidebar or navigation to click away from). The welcoming copy replaces the standard auth messaging.

**Profile link placement: Below Billing in the bottom nav section.** The sidebar has a bottom section with Analytics and Billing. Profile fits naturally as the last item (below Billing) since it is a personal account management page, not a content creation tool. Use the `User` icon from Lucide.

**Post password-change behavior: Stay logged in.** Supabase's `updateUser` does not invalidate the current session, so the user remains authenticated. Showing a success message and keeping them on the profile page is the least disruptive.

### Anti-Patterns to Avoid
- **Checking admin role client-side only:** The gear icon visibility must be determined server-side (in the layout) and passed as a prop. Never rely on client-side role checks for showing admin-only UI.
- **Using user_metadata for the forced reset flag:** `user_metadata` is editable by the authenticated user. Use either `app_metadata` (Supabase admin API) or a Prisma column (simpler).
- **Forcing re-login after password change:** The user decision says "lean toward least disruptive." Supabase's `updateUser` keeps the session valid, so forcing re-login adds friction with no security benefit.
- **Putting /set-password under (dashboard) layout:** The forced reset page must not have dashboard navigation. Using the (auth) layout ensures no sidebar or dashboard links are available.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password verification | Custom bcrypt comparison | `supabase.auth.signInWithPassword()` | Supabase handles password hashing, rate limiting, and lockout internally |
| Password hashing | Raw crypto operations | `supabase.auth.updateUser()` | Supabase manages password storage securely |
| Form validation | Manual string checking | Zod schemas (existing pattern) | Type inference, composable refinements, consistent error format |
| JWT/session management | Custom token handling | Supabase SSR getClaims/updateUser | Session cookies managed by @supabase/ssr |
| Tooltip component | Custom tooltip with positioning logic | Native HTML `title` attribute | Project already uses `title` for tooltips; no Radix Tooltip installed |

**Key insight:** All auth operations go through Supabase. The project never directly accesses password hashes or session tokens. Keep it that way.

## Common Pitfalls

### Pitfall 1: signInWithPassword Side Effects on Password Verification
**What goes wrong:** Calling `signInWithPassword` to verify the current password may refresh the session tokens, potentially causing issues if the session state changes mid-flow.
**Why it happens:** `signInWithPassword` is designed to establish a session, not just verify credentials.
**How to avoid:** Since we are on a server action and using the server Supabase client (which manages cookies), the re-sign-in will refresh the session cookies. This is actually fine -- the user stays logged in with fresh tokens. But test this flow to ensure the subsequent `updateUser` call works correctly with the refreshed session.
**Warning signs:** Password change succeeds but user gets logged out, or gets "session expired" errors on next navigation.

### Pitfall 2: Race Condition on Forced Password Reset Redirect
**What goes wrong:** User on forced-reset page submits new password, but the proxy intercepts the next navigation and redirects back to `/set-password` because the flag hasn't been cleared yet.
**Why it happens:** The server action sets the new password and clears the flag, but if the redirect happens before the flag-clear completes, the proxy sees the old value.
**How to avoid:** In the forced-reset server action, clear the flag BEFORE redirecting. Use `await` on the flag-clear operation. If using a Prisma column, the update is synchronous. If using app_metadata, ensure the admin API call completes before calling `redirect()`.
**Warning signs:** User submits forced reset form and gets redirected back to the same page.

### Pitfall 3: Admin Gear Icon Not Appearing Due to Layout Caching
**What goes wrong:** The dashboard layout is a Server Component that fetches teacher data. If the layout is statically cached, the admin role check may not execute on every request.
**Why it happens:** Next.js route segment caching.
**How to avoid:** The dashboard layout already calls auth functions (implied by the presence of `SignOutButton` and `SidebarNav`). But the layout itself doesn't currently fetch the teacher. The admin gear icon requires the teacher's role, so the layout must call `getAuthenticatedTeacher()`. Since this involves cookies, the layout will be dynamic. Verify by checking that the gear icon appears immediately after promoting a user to admin.
**Warning signs:** Gear icon appears for some admins but not others, or requires a hard refresh.

### Pitfall 4: Forced Reset Page Accessible Without Auth
**What goes wrong:** The `/set-password` page is under the `(auth)` route group. The proxy redirects unauthenticated users away from auth pages to `/login` and authenticated users from auth pages to `/dashboard`.
**Why it happens:** The proxy's `isAuthPage` function includes `/update-password` in AUTH_PAGES. If `/set-password` is also in AUTH_PAGES, authenticated users will be redirected to `/dashboard` -- which then redirects back to `/set-password` (infinite loop).
**How to avoid:** Place `/set-password` under the `(dashboard)` route group with its own minimal layout (no sidebar), OR add `/set-password` as a special case in the proxy that is allowed for authenticated users with the `must_change_password` flag. The cleanest approach: create a new route group `(onboarding)` or use a standalone layout at `app/set-password/layout.tsx`.
**Warning signs:** Infinite redirect loop after admin-created account logs in.

### Pitfall 5: Mobile Nav Missing Profile Link
**What goes wrong:** The sidebar nav gets a Profile link, but the mobile drawer also renders `<SidebarNav />`. Since they share the same component, the Profile link will automatically appear in mobile too -- this is actually correct behavior, but verify it.
**Why it happens:** `MobileNav` renders `<SidebarNav />` inside its drawer.
**How to avoid:** No special handling needed -- adding Profile to `SidebarNav` automatically adds it to mobile. But verify the spacing and active state work correctly on mobile.
**Warning signs:** Profile link missing from mobile drawer, or styling breaks on small screens.

## Code Examples

### Display Name Update (Server Action Pattern)
```typescript
// Source: Existing project pattern from src/actions/auth.ts
'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export async function updateDisplayName(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) return { error: 'Not authenticated' }

  const parsed = updateNameSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { name: parsed.data.name.trim() },
  })

  revalidatePath('/profile')
  return { success: 'Display name updated.' }
}
```

### Forced Reset Flag on Admin Account Creation
```typescript
// Source: Modification of existing src/lib/dal/admin.ts createTeacherWithTempPassword
// After creating the Supabase auth user, set the flag:

const { data: authData, error: authError } =
  await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: data.name },
  })

if (authError || !authData.user) {
  throw new Error(authError?.message ?? 'Failed to create auth user')
}

// Option A: Prisma column (recommended for this project)
const teacher = await prisma.teacher.create({
  data: {
    supabaseAuthId: authData.user.id,
    email: data.email,
    name: data.name,
    subscriptionTier: data.tier,
    mustChangePassword: true,  // New Prisma column
  },
})

// Option B: Supabase app_metadata (alternative)
await admin.auth.admin.updateUserById(authData.user.id, {
  app_metadata: { must_change_password: true },
})
```

### Proxy Intercept for Forced Reset
```typescript
// Source: Modification of existing src/app/proxy.ts
// Add after the dashboard deactivation check:

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

  // Force password reset for admin-created accounts
  if (teacher?.mustChangePassword) {
    const url = request.nextUrl.clone()
    url.pathname = '/set-password'
    return NextResponse.redirect(url)
  }
}
```

### Admin Gear Button Component
```typescript
// Source: Project pattern from signout-button.tsx
'use client'

import { Settings } from 'lucide-react'

export function AdminGearButton({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null

  return (
    <a
      href="/admin"
      target="_blank"
      rel="noopener noreferrer"
      title="Admin Panel"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Settings className="h-4 w-4" />
    </a>
  )
}
```

### Profile Page Layout (Card Sections)
```typescript
// Source: Pattern from billing/page.tsx
import { Card, CardContent } from '@/components/ui/card'

// Each section is a Card with its own form and save button
<div className="space-y-6">
  <Card>
    <CardContent className="pt-6">
      <DisplayNameSection name={teacher.name} />
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6">
      <PasswordChangeSection />
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6">
      <AccountInfoSection email={teacher.email} role={teacher.role} />
    </CardContent>
  </Card>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getUser()` / `getSession()` for auth checks | `getClaims()` for JWT validation via cached JWKS | 2025 (Supabase SSR) | Faster auth checks, already used in this project |
| Custom middleware.ts file | proxy.ts called from layout/page | Project convention | No Next.js middleware file exists; proxy.ts handles auth routing |
| `useFormStatus` for form state | `useActionState` (React 19) | React 19 | Already used throughout project (login, signup, create-teacher) |

**Deprecated/outdated:**
- `getSession()` for auth verification: Project uses `getClaims()` instead for performance
- Separate middleware.ts: Project uses proxy.ts pattern instead

## Open Questions

1. **Prisma migration for mustChangePassword column**
   - What we know: Adding a Boolean column with `@default(false)` is a non-destructive migration. All existing users will default to false.
   - What's unclear: Whether the team prefers Prisma column vs Supabase app_metadata approach. Prisma column is simpler and avoids an extra admin API call.
   - Recommendation: Use Prisma column. It is simpler, the proxy already queries Teacher for deactivation, and it keeps all app state in one database.

2. **Proxy route handling for /set-password**
   - What we know: The proxy needs to allow authenticated users to access /set-password but prevent them from navigating away to the dashboard when the flag is set.
   - What's unclear: Whether /set-password should be under (auth) layout, (dashboard) layout, or a standalone route.
   - Recommendation: Standalone route `app/set-password/page.tsx` with its own layout that matches the (auth) visual style but is NOT in the AUTH_PAGES array. The proxy should allow access to /set-password for authenticated users with the flag, and redirect all other paths to /set-password when flag is set.

3. **Dashboard layout modification for teacher role fetch**
   - What we know: The dashboard layout.tsx is currently a synchronous component that does not fetch teacher data. Adding `getAuthenticatedTeacher()` makes it async.
   - What's unclear: Whether this has performance implications for every dashboard page load.
   - Recommendation: The layout should be async and fetch the teacher. The `getAuthenticatedTeacher()` call is fast (cached JWKS + single Prisma query) and is already called on every server component page. Making the layout async is standard Next.js App Router practice.

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- All architecture patterns, existing code, file structure examined directly
- [Supabase Auth updateUser docs](https://supabase.com/docs/reference/javascript/auth-updateuser) -- Password update API
- [Supabase Auth admin.createUser docs](https://supabase.com/docs/reference/javascript/auth-admin-createuser) -- User creation with metadata
- [Supabase Auth admin.updateUserById docs](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) -- app_metadata updates
- [Supabase User Management docs](https://supabase.com/docs/guides/auth/managing-user-data) -- user_metadata storage

### Secondary (MEDIUM confidence)
- [Supabase Users docs](https://supabase.com/docs/guides/auth/users) -- user_metadata vs app_metadata security properties (user_metadata is user-editable, app_metadata is server-only)
- [Supabase Password docs](https://supabase.com/docs/guides/auth/passwords) -- Password change flows and reauthentication
- [Supabase Discussion #11412](https://github.com/orgs/supabase/discussions/11412) -- Community patterns for current password verification before change

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or project codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions verified from package.json
- Architecture: HIGH -- all patterns observed directly in existing codebase, new code follows established conventions
- Pitfalls: HIGH -- identified through direct code analysis of proxy.ts routing logic and Supabase auth flow
- Forced reset approach: MEDIUM -- Prisma column approach is straightforward, but proxy routing for /set-password needs careful implementation to avoid redirect loops

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (30 days -- stable domain, no fast-moving dependencies)
