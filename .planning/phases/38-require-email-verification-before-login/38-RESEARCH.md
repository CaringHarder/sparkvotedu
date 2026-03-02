# Phase 38: Require Email Verification Before Login - Research

**Researched:** 2026-03-02
**Domain:** Supabase Auth email verification, Next.js auth flow
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Blocking Screen UX
- Branded SparkVote-styled page with illustration/icon, verification message, resend button, and alternative sign-in options
- Show full email address: "We sent a verification link to teacher@school.edu"
- Resend button with 60-second cooldown timer (button disables with countdown to prevent spam)
- Include "Sign out" link AND "Sign in with Google instead" button on the blocking page
- Page should match existing SparkVote auth page styling

#### Verification Link Behavior
- Clicking the link verifies AND auto-logs the teacher in — they land directly on the dashboard
- Link works from any device/browser (not restricted to signup session)
- Expired link: show "This link has expired" page with a button to resend a new verification email
- Already-verified re-click: silently redirect to dashboard (no error or redundant message)

#### Existing User Handling
- Grandfather existing accounts — only NEW email signups require verification
- Grandfathered users see nothing different — completely invisible to them (no nudge banner)
- Admin-created accounts (Phase 37 temp password flow) skip email verification — admin vouches for the email
- Cutoff method for grandfathering: Claude's discretion based on Supabase auth schema

#### Email Content & Branding
- Use Supabase's built-in email template with minor text customization (least effort)
- Subject line, sender name, and body tone: Claude's discretion — match SparkVote's existing messaging style

### Claude's Discretion
- Technical approach for determining grandfathered vs new accounts
- Email subject line, sender name, and body copy
- Exact verification link expiration duration
- Loading/transition states during verification flow
- Verification link expiration handling details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Summary

This phase enforces email verification for new email-based signups before granting dashboard access. The project already uses Supabase Auth with email confirmation flow (`signUp` with `emailRedirectTo` pointing to `/auth/callback`), but the current implementation shows a simple success message on the signup page and relies on Supabase's native `signInWithPassword` blocking (which returns `email_not_confirmed` error). The current UX is poor: an unverified teacher who tries to log in just sees "Email not confirmed" as a generic error message on the login form.

The implementation requires: (1) a dedicated branded "check your email" blocking screen instead of the generic error, (2) a resend verification email action with cooldown, (3) proper handling of the verification link click to auto-login and redirect to dashboard, (4) grandfathering existing accounts so they are unaffected, and (5) an expired-link error page. The heavy lifting (email sending, verification, token management) is all handled by Supabase Auth natively -- this phase is primarily UX and routing work.

**Primary recommendation:** Intercept the `email_not_confirmed` error from `signInWithPassword` in the `signIn` action and redirect to a dedicated `/verify-email` page. Use `supabase.auth.resend({ type: 'signup' })` for the resend button. Grandfather existing accounts by checking `email_confirmed_at` on the Supabase `auth.users` record -- all existing accounts already have this field set (either via "Confirm email" flow completion, admin API with `email_confirm: true`, or OAuth auto-confirm).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.93.3 | Auth API (signUp, signInWithPassword, resend, getUser) | Already in project |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client for Next.js | Already in project |
| Next.js | 16.1.6 | App Router, server actions, route handlers | Already in project |
| React | 19.2.3 | useActionState, useState, useEffect for cooldown timer | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Admin API | (via service role key) | Check user's email_confirmed_at for grandfathering | Server-side only, for determining verification status |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-level verification blocking | Supabase "Confirm email" setting alone | Supabase already blocks unconfirmed users at `signInWithPassword` with `email_not_confirmed` error, but gives a poor UX. App-level gives branded blocking screen. |
| Custom email service | Supabase built-in email templates | Supabase templates are simpler but less flexible. User chose Supabase templates -- locked decision. |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Current Auth Flow (Before Phase 38)
```
Signup → signUp() → success message on signup page → user checks email → clicks link → /auth/callback → exchangeCodeForSession → redirect to /dashboard
Login → signInWithPassword() → success: redirect to /dashboard | error: show error.message on login form
Proxy → getClaims() → redirect unauthenticated to /login, authenticated away from auth pages
```

### New Auth Flow (After Phase 38)
```
Signup → signUp() → redirect to /verify-email?email=xxx → branded blocking screen with resend button
Login (unverified) → signInWithPassword() → returns error "email_not_confirmed" → redirect to /verify-email?email=xxx
Login (verified) → signInWithPassword() → success → redirect to /dashboard
Login (Google OAuth) → signInWithOAuth() → bypass verification entirely
Verification Link Click → /auth/callback → exchangeCodeForSession → auto-login → redirect to /dashboard
Resend → auth.resend({ type: 'signup', email }) → 60-second client-side cooldown
```

### Recommended Project Structure
```
src/
├── app/
│   └── (auth)/
│       └── verify-email/
│           └── page.tsx          # Branded "check your email" blocking screen
├── components/
│   └── auth/
│       └── verify-email-card.tsx # Client component with resend + cooldown
├── actions/
│   └── auth.ts                  # Modified signIn + new resendVerification action
└── app/
    └── auth/
        └── callback/
            └── route.ts         # Already handles code exchange (no changes needed)
```

### Pattern 1: Intercept email_not_confirmed in signIn Action
**What:** Detect the specific `email_not_confirmed` error from `signInWithPassword` and return a typed result that the login form uses to redirect to the verification page.
**When to use:** Every login attempt by an unverified email user.
**Example:**
```typescript
// src/actions/auth.ts - modified signIn action
export async function signIn(
  _prevState: { error?: string; redirectToVerify?: string } | null,
  formData: FormData
) {
  // ... validation ...
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message === 'Email not confirmed') {
      // Return email so the client can redirect to /verify-email
      return { redirectToVerify: parsed.data.email }
    }
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### Pattern 2: Resend Verification with Server Action
**What:** Server action that calls `supabase.auth.resend()` with type 'signup'. Client enforces 60-second cooldown.
**When to use:** User clicks "Resend" on the verify-email page.
**Example:**
```typescript
// src/actions/auth.ts - new resendVerification action
export async function resendVerification(
  _prevState: { error?: string; success?: boolean; sentAt?: number } | null,
  formData: FormData
) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  return { success: true, sentAt: Date.now() }
}
```

### Pattern 3: Client-Side Cooldown Timer
**What:** 60-second countdown using `useState` + `useEffect` with `setInterval`.
**When to use:** After resend button is clicked, disable for 60 seconds.
**Example:**
```typescript
// src/components/auth/verify-email-card.tsx
const [cooldown, setCooldown] = useState(0)

useEffect(() => {
  if (cooldown <= 0) return
  const timer = setInterval(() => {
    setCooldown((prev) => prev - 1)
  }, 1000)
  return () => clearInterval(timer)
}, [cooldown])

// On successful resend:
setCooldown(60)

// Button:
<Button disabled={cooldown > 0 || isPending}>
  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
</Button>
```

### Pattern 4: Verify-Email Page as Auth Page
**What:** The `/verify-email` page uses the existing `(auth)` layout for consistent branding (logo, gradient background, card wrapper).
**When to use:** Always -- this page is part of the auth flow.
**Example:**
```
src/app/(auth)/verify-email/page.tsx  ← Inside (auth) route group
```
The `(auth)/layout.tsx` already provides: centered card, SparkVotEDU logo, gradient background, and consistent styling.

### Anti-Patterns to Avoid
- **Don't check verification in the proxy/middleware:** The proxy uses `getClaims()` which only validates JWT existence, not email confirmation status. Adding `getUser()` calls to the proxy would add latency to every request. Instead, let Supabase's `signInWithPassword` handle blocking -- unverified users never get a session/JWT in the first place.
- **Don't store verification state in Prisma:** Supabase Auth already tracks `email_confirmed_at`. Duplicating this in the Teacher model creates sync issues.
- **Don't build custom email sending:** Supabase handles email sending, token generation, and verification. Use `auth.resend()`, not a custom email service.
- **Don't redirect from signup action to verify-email page via server-side redirect():** The signup form needs to capture the email address to pass as a query parameter. Return a result from the action and handle the redirect client-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP/Resend integration | Supabase built-in email templates | Token management, link generation, expiration handled automatically |
| Verification tokens | Custom token table + generation | Supabase Auth confirmation flow | Supabase handles token creation, hashing, expiration, and single-use enforcement |
| Email resend | Custom resend endpoint | `supabase.auth.resend({ type: 'signup' })` | Built-in rate limiting (60s between requests per user), proper token rotation |
| Verification status | Custom `emailVerified` column in Teacher | `auth.users.email_confirmed_at` in Supabase | Single source of truth, automatically set by Supabase on confirmation |
| Rate limiting on resend | Custom rate limiter | Supabase server-side rate limit + client-side 60s cooldown | Supabase enforces 60s between signup confirmation requests server-side |

**Key insight:** Supabase Auth already provides the complete email verification infrastructure. This phase is primarily UX work (branded pages, redirects, cooldown timer) layered on top of existing Supabase capabilities. The only "new" server code needed is a `resendVerification` action and intercepting the `email_not_confirmed` error.

## Common Pitfalls

### Pitfall 1: signUp Action Currently Shows Inline Success Instead of Redirecting
**What goes wrong:** After signup, the user sees "Check your email for a confirmation link." as a small text message on the signup form page. This is easy to miss and doesn't match the branded blocking screen requirement.
**Why it happens:** The current `signUp` action returns `{ success: 'Check your email...' }` and the `SignUpForm` renders it inline.
**How to avoid:** Modify the signup flow to redirect to `/verify-email?email=xxx` after successful signup instead of showing inline text. The `signUp` action should redirect (or return a result that the client uses to redirect).
**Warning signs:** User stays on the signup page after submitting instead of seeing the branded verification screen.

### Pitfall 2: Resend Uses Different Flow Than Original Signup (PKCE Issue)
**What goes wrong:** The `auth.resend()` method may not use the same PKCE flow as the original `signUp()` call, causing the confirmation link to behave differently.
**Why it happens:** Known Supabase issue (GitHub #42527) where `auth.resend()` may use implicit flow instead of PKCE flow.
**How to avoid:** Test that resent confirmation links work correctly through the existing `/auth/callback` route handler which calls `exchangeCodeForSession`. If the resent link uses implicit flow (hash fragment with access_token), the callback handler already works because it falls through to the redirect. Monitor for errors.
**Warning signs:** Resent confirmation links fail at the callback step or show "auth_callback_failed" error.

### Pitfall 3: Proxy Redirect Loop for Unverified Users
**What goes wrong:** The proxy redirects unauthenticated users to `/login`, but the verify-email page is not in the AUTH_PAGES list, causing a redirect loop if an unverified user tries to access it.
**Why it happens:** The proxy's `isAuthPage()` function checks a hardcoded list: `/login`, `/signup`, `/forgot-password`, `/update-password`, `/auth`. If `/verify-email` is not added, unauthenticated users can't access it.
**How to avoid:** Add `/verify-email` to the `AUTH_PAGES` array in `proxy.ts`. Since the verify-email page is within the `(auth)` route group, it should be treated as an auth page.
**Warning signs:** Users see a redirect loop or can't access the verify-email page when not logged in.

### Pitfall 4: Grandfathered Users Who Have email_confirmed_at = null
**What goes wrong:** If any existing users have `email_confirmed_at = null` in Supabase Auth (e.g., users created with "Confirm email" disabled before it was enabled), they would be blocked from logging in.
**Why it happens:** Supabase's `signInWithPassword` returns `email_not_confirmed` for users with null `email_confirmed_at` when "Confirm email" is enabled.
**How to avoid:** Before deployment, run a query against `auth.users` to check if any existing users have `email_confirmed_at IS NULL`. If found, use the admin API to set `email_confirmed_at` for those users. Admin-created users (Phase 37) already have `email_confirm: true` set, so they should be fine.
**Warning signs:** Existing teachers suddenly can't log in after deployment.

### Pitfall 5: Email Query Parameter Exposure
**What goes wrong:** The email address is passed as a URL query parameter (`/verify-email?email=xxx`), which could appear in browser history, server logs, or referrer headers.
**Why it happens:** Need to pass the email from signup/login to the verify-email page.
**How to avoid:** This is acceptable for this use case -- the email is not sensitive secret data, it's the user's own email being shown back to them. The existing signup flow already handles email in form data. Alternatively, store the email in a session cookie, but this adds complexity for minimal security gain.
**Warning signs:** None significant -- this is standard practice for verification flows.

### Pitfall 6: Supabase Built-in Email Rate Limit
**What goes wrong:** Supabase's built-in email service (without custom SMTP) only sends 2 emails per hour and only to project team members.
**Why it happens:** The project debug history (`email-verification-not-received.md`) confirms this limitation was discovered. Custom SMTP (Resend) must be configured.
**How to avoid:** Ensure Resend SMTP is configured in the Supabase Dashboard before deploying this phase. The `.env.example` already documents this requirement.
**Warning signs:** Users report not receiving verification emails.

## Code Examples

### Existing Auth Callback (No Changes Needed)
```typescript
// Source: src/app/auth/callback/route.ts (current code)
// This already handles the verification link click:
// 1. User clicks verification link in email
// 2. Supabase redirects to /auth/callback?code=xxx
// 3. exchangeCodeForSession() verifies the code, confirms the email, and creates a session
// 4. Redirect to /dashboard
// The auto-login requirement is already satisfied by this flow.
```

### Current signUp Action (Needs Modification)
```typescript
// Source: src/actions/auth.ts (current code that needs to change)
// Current: returns { success: 'Check your email...' } → shows inline message
// New: should redirect to /verify-email?email=xxx or return data for client redirect
```

### Supabase Auth Resend API
```typescript
// Source: Supabase official docs - https://supabase.com/docs/reference/javascript/auth-resend
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://example.com/auth/callback',
  },
})
```

### Checking Email Verification Status (Admin API)
```typescript
// Source: Supabase official docs - https://supabase.com/docs/guides/auth/users
// For grandfathering check or migration script:
const admin = createAdminClient()
const { data, error } = await admin.auth.admin.getUserById(userId)
if (data?.user?.email_confirmed_at) {
  // User is verified
}
```

### Verify-Email Page Structure
```typescript
// src/app/(auth)/verify-email/page.tsx
// Uses the existing (auth) layout which provides:
// - Centered card with shadow
// - SparkVotEDU logo + tagline
// - Gradient background (brand-blue/brand-amber)
// Page content: email icon, message, resend button, sign-out link, Google sign-in button
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Show inline "Check your email" text on signup form | Redirect to dedicated branded verification page | This phase | Better first impression, clearer user flow |
| Generic "Email not confirmed" error on login | Redirect to branded verify-email page with resend | This phase | Users understand what to do instead of being confused |
| No resend capability | `auth.resend({ type: 'signup' })` with cooldown | This phase | Users can self-serve if email is delayed |

**Deprecated/outdated:**
- None -- Supabase Auth email verification APIs are stable

## Discretion Recommendations

### Grandfathering Cutoff Method
**Recommendation:** Use Supabase's `email_confirmed_at` field as the natural cutoff. All existing users who have ever logged in successfully already have `email_confirmed_at` set (either from confirming their email, admin API with `email_confirm: true`, or OAuth auto-confirm). No date-based cutoff or Prisma schema change needed.

**Why this works:**
- **Email signup users who confirmed:** `email_confirmed_at` is set → Supabase allows login → no blocking
- **Admin-created users (Phase 37):** Created with `email_confirm: true` → `email_confirmed_at` is set → no blocking
- **Google OAuth users:** `email_confirmed_at` is automatically set by Supabase → no blocking
- **New email signups after Phase 38:** `email_confirmed_at` is null until they click the link → Supabase blocks with `email_not_confirmed` → redirect to verify-email page

**Risk mitigation:** Before deployment, run a one-time query to verify no existing users have `email_confirmed_at IS NULL`. If any are found, use admin API to confirm them.

**Confidence:** HIGH -- verified from Supabase docs that `email_confirmed_at` is the canonical field for this purpose, and the project's admin user creation code already sets `email_confirm: true`.

### Email Subject Line and Body
**Recommendation:** Customize the Supabase "Confirm signup" email template in the Supabase Dashboard:
- **Subject:** "Verify your SparkVotEDU email"
- **Sender name:** "SparkVotEDU" (configured in SMTP settings, not template)
- **Body tone:** Friendly, brief, teacher-appropriate. Example:

```
Hi {{ .Data.name }},

Welcome to SparkVotEDU! Click the link below to verify your email and start creating brackets and polls for your classroom.

{{ .ConfirmationURL }}

This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.

— The SparkVotEDU Team
```

**Confidence:** MEDIUM -- template variables verified from Supabase docs (`{{ .Data.name }}`, `{{ .ConfirmationURL }}`), but exact rendering should be tested.

### Verification Link Expiration
**Recommendation:** Use Supabase's default 24-hour expiration. This is the default for hosted Supabase projects and cannot be changed on hosted plans without self-hosting. This is generous enough for teachers who may not check email immediately.

**Confidence:** HIGH -- verified from Supabase docs and community discussions.

### Loading/Transition States
**Recommendation:**
- **Resend button:** Shows "Sending..." while the action is pending, then switches to "Resend in 60s" countdown
- **After signup redirect:** Brief loading state while redirecting from signup form to verify-email page (handled by Next.js router)
- **Verification link click:** The existing `/auth/callback` handles this -- shows nothing (instant redirect to dashboard)

**Confidence:** HIGH -- follows existing project patterns (e.g., login button shows "Signing in...", signup shows "Creating account...").

### Expired Link Handling
**Recommendation:** When a user clicks an expired verification link, the `/auth/callback` route handler's `exchangeCodeForSession()` call will return an error. Currently this redirects to `/login?error=auth_callback_failed`. Modify the callback to detect the specific expiration error and redirect to `/verify-email?expired=true&email=xxx` instead, showing a branded "link expired" message with a resend button.

**Confidence:** MEDIUM -- need to verify the exact error returned by `exchangeCodeForSession` for expired tokens. The error object from Supabase may use error codes like `otp_expired` or a generic auth error.

## Open Questions

1. **Current "Confirm email" Setting Status**
   - What we know: The signup action returns "Check your email for a confirmation link" and uses `emailRedirectTo`, strongly suggesting "Confirm email" is enabled. The debug file confirms email delivery issues were investigated.
   - What's unclear: Whether "Confirm email" is definitely enabled on the hosted Supabase project right now. If it's disabled, `signInWithPassword` won't return `email_not_confirmed` and the entire blocking flow won't trigger.
   - Recommendation: Verify in Supabase Dashboard > Authentication > Providers > Email that "Confirm email" is enabled. If not, enable it. This is a prerequisite for this phase.

2. **Existing Users with NULL email_confirmed_at**
   - What we know: Admin-created users have `email_confirm: true`. OAuth users are auto-confirmed. Users who completed email confirmation have the field set.
   - What's unclear: Whether any existing users have `email_confirmed_at IS NULL` (e.g., users created while "Confirm email" was briefly disabled, or test accounts).
   - Recommendation: Before deployment, run `SELECT id, email FROM auth.users WHERE email_confirmed_at IS NULL` via Supabase SQL editor. Confirm any found users with admin API.

3. **PKCE vs Implicit Flow for Resend**
   - What we know: Known Supabase issue (#42527) where `auth.resend()` may use implicit flow instead of PKCE.
   - What's unclear: Whether this affects the current project's callback handler.
   - Recommendation: Test resent links end-to-end. The existing callback handler calls `exchangeCodeForSession(code)` which expects a `code` parameter. If the resent link uses implicit flow (hash fragment), the callback may need adjustment. Low risk since the callback already handles the fallback case.

## Sources

### Primary (HIGH confidence)
- Supabase official docs: [signUp API](https://supabase.com/docs/reference/javascript/auth-signup) -- signUp behavior with Confirm email enabled/disabled
- Supabase official docs: [auth.resend API](https://supabase.com/docs/reference/javascript/auth-resend) -- resend method signature and parameters
- Supabase official docs: [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) -- email confirmation flow
- Supabase official docs: [JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) -- JWT claim fields
- Supabase official docs: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) -- template variables and customization
- Supabase official docs: [Users](https://supabase.com/docs/guides/auth/users) -- user object schema, email_confirmed_at field
- Supabase official docs: [Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) -- 60-second signup confirmation rate limit
- Supabase official docs: [General Configuration](https://supabase.com/docs/guides/auth/general-configuration) -- Confirm email setting behavior
- Supabase official docs: [Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes) -- `email_not_confirmed` (HTTP 422)
- Codebase: `src/actions/auth.ts` -- current signUp/signIn actions
- Codebase: `src/app/auth/callback/route.ts` -- current callback handler
- Codebase: `src/app/proxy.ts` -- current route protection
- Codebase: `src/lib/dal/auth.ts` -- getAuthenticatedTeacher using getClaims
- Codebase: `src/lib/dal/admin.ts` -- admin.createUser with email_confirm: true
- Codebase: `src/app/(auth)/layout.tsx` -- auth page layout (branded)
- Codebase: `.planning/debug/email-verification-not-received.md` -- SMTP configuration requirements

### Secondary (MEDIUM confidence)
- Supabase official docs: [PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- PKCE behavior for email confirmation
- GitHub Issue [#42527](https://github.com/supabase/supabase/issues/42527) -- resend() PKCE inconsistency

### Tertiary (LOW confidence)
- GitHub Issue [#802](https://github.com/supabase/supabase-js/issues/802) -- resend may not use emailRedirectTo correctly (needs testing)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages needed, all Supabase APIs verified in official docs
- Architecture: HIGH -- clear modification points identified in existing codebase, patterns follow project conventions
- Pitfalls: HIGH -- common issues documented from official docs and project history (SMTP requirement, rate limits, PKCE)
- Discretion recommendations: HIGH for grandfathering (email_confirmed_at is canonical), MEDIUM for email template (needs testing)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days -- Supabase Auth APIs are stable)
