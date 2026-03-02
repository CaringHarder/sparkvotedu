---
phase: 38-require-email-verification-before-login
plan: 01
subsystem: auth
tags: [supabase, email-verification, server-actions, proxy, next-js]

# Dependency graph
requires:
  - phase: 37-user-profile-admin-access
    provides: Admin-created accounts with mustChangePassword and temp password flow
provides:
  - Modified signUp action returning redirectToVerify instead of inline success text
  - Modified signIn action intercepting email_not_confirmed error with redirectToVerify
  - New resendVerification server action calling supabase.auth.resend
  - /verify-email added to proxy AUTH_PAGES for unauthenticated access
  - Auth callback expired link redirect to /verify-email?expired=true
affects: [38-02, 38-03, verify-email-page, signup-form, login-form]

# Tech tracking
tech-stack:
  added: []
  patterns: [SignUpState/SignInState explicit return types for server actions, expired verification link redirect pattern]

key-files:
  created: []
  modified:
    - src/actions/auth.ts
    - src/app/proxy.ts
    - src/app/auth/callback/route.ts

key-decisions:
  - "Explicit return types (SignUpState, SignInState) to prevent TypeScript narrowing issues with useActionState consumers"
  - "Case-insensitive check for email_not_confirmed error to handle potential Supabase message variations"
  - "All code exchange failures redirect to /verify-email?expired=true (safe default -- resend button is correct action regardless)"

patterns-established:
  - "redirectToVerify pattern: server action returns email string, client component handles redirect to /verify-email"
  - "Expired link redirect: callback route sends failed verifications to /verify-email instead of generic login error"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 38 Plan 01: Server-Side Auth Actions & Routing Summary

**Modified signUp/signIn actions with redirectToVerify, added resendVerification action, updated proxy AUTH_PAGES and callback expired link handling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T12:14:08Z
- **Completed:** 2026-03-02T12:16:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- signUp action now returns `{ redirectToVerify: email }` on success instead of inline success text
- signIn action intercepts `email_not_confirmed` error and returns `{ redirectToVerify: email }` for client redirect
- New `resendVerification` server action calls `supabase.auth.resend({ type: 'signup' })` with emailRedirectTo
- `/verify-email` added to proxy AUTH_PAGES for unauthenticated access
- Auth callback redirects failed verification link clicks to `/verify-email?expired=true` instead of generic login error

## Task Commits

Each task was committed atomically:

1. **Task 1: Modify auth actions (signUp, signIn, resendVerification)** - `7d19e41` (feat)
2. **Task 2: Update proxy AUTH_PAGES and callback expired link handling** - `1be4a8a` (feat)

## Files Created/Modified
- `src/actions/auth.ts` - Modified signUp, signIn return types + new resendVerification action
- `src/app/proxy.ts` - Added /verify-email to AUTH_PAGES array
- `src/app/auth/callback/route.ts` - Expired verification link redirect to /verify-email?expired=true

## Decisions Made
- Used explicit return types (SignUpState, SignInState) instead of inline type annotations to prevent TypeScript inference narrowing that broke existing consumers (signup-form still references `state?.success`)
- Case-insensitive check for "email not confirmed" error message to handle potential Supabase message variations across versions
- All code exchange failures redirect to /verify-email?expired=true (safe default -- the verify-email page provides a resend button which is the correct action whether the link was expired, invalid, or corrupted)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript compilation error from return type narrowing**
- **Found during:** Task 1 (auth action modification)
- **Issue:** After removing `{ success: '...' }` return from signUp, TypeScript narrowed the return type and `signup-form.tsx` failed compilation with `Property 'success' does not exist on type`
- **Fix:** Added explicit `SignUpState` and `SignInState` type aliases with all optional fields, used as `Promise<SignUpState>` return type annotation
- **Files modified:** src/actions/auth.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 7d19e41 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed TypeScript narrowing issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend auth actions and routing ready for Plan 02 (verify-email page UI)
- Client components (signup-form, login-form) need Plan 02 updates to handle `redirectToVerify` field and redirect to `/verify-email?email=xxx`
- The `resendVerification` action is ready for the verify-email-card component to consume

## Self-Check: PASSED

- All 3 modified files exist on disk
- Both task commits (7d19e41, 1be4a8a) verified in git log
- TypeScript compilation passes cleanly

---
*Phase: 38-require-email-verification-before-login*
*Completed: 2026-03-02*
