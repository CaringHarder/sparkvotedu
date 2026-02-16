---
phase: 06-billing-and-subscriptions
plan: 02
subsystem: payments
tags: [stripe, checkout, portal, billing, dal, server-actions]

# Dependency graph
requires:
  - phase: 06-billing-and-subscriptions
    provides: Stripe SDK singleton, static pricing config with PRICE_IDS, Subscription Prisma model
  - phase: 01-foundation-and-auth
    provides: getAuthenticatedTeacher DAL, Teacher model with stripeCustomerId
provides:
  - Billing DAL with subscription lookups by teacherId, Stripe ID, and billing overview with usage counts
  - createCheckoutSession server action with auth guard, price validation, and Stripe redirect
  - createPortalSession server action with auth guard and Stripe Portal redirect
affects:
  - 06-03 (billing/pricing pages will call these server actions)
  - 06-04 (pricing page uses billing overview for current tier display)
  - 06-05 (upgrade prompts may link to checkout action)

# Tech tracking
tech-stack:
  added: []
  patterns: [server action Stripe redirect with separated try/catch, billing DAL parallel queries for overview]

key-files:
  created:
    - src/lib/dal/billing.ts
    - src/actions/billing.ts
  modified: []

key-decisions:
  - "redirect() placed outside try/catch to avoid swallowing Next.js internal throw"
  - "Session URL captured in variable before redirect call for clean control flow"
  - "Promise.all for billing overview queries (teacher+subscription, bracket counts, poll count) for parallel performance"
  - "allow_promotion_codes enabled on checkout for future promo code support"

patterns-established:
  - "Billing DAL: no auth checks in DAL functions, callers handle authentication"
  - "Stripe redirect actions: capture URL in try/catch, redirect outside try/catch"
  - "Price validation: PRICE_IDS.includes(priceId) guard before Stripe API call"
  - "teacherId in both session.metadata and subscription_data.metadata for webhook linkage"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 6 Plan 2: Billing DAL & Checkout/Portal Server Actions Summary

**Billing DAL with subscription lookups and usage overview, plus createCheckoutSession and createPortalSession server actions with auth guards, price validation, and Stripe redirect flow**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-01T05:21:43Z
- **Completed:** 2026-02-01T05:23:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Billing DAL provides 4 query functions: subscription by teacherId, teacher with subscription, subscription by Stripe ID, and comprehensive billing overview with usage counts
- createCheckoutSession validates priceId against known PRICE_IDS, includes teacherId in both session and subscription metadata, enables promo codes, and redirects to Stripe Checkout
- createPortalSession verifies stripeCustomerId exists before creating Stripe Portal session and redirecting
- Both server actions follow established auth-first pattern with getAuthenticatedTeacher guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Billing DAL for subscription queries** - `5eecacc` (feat)
2. **Task 2: Checkout and Portal server actions** - `cae8ec2` (feat)

## Files Created/Modified
- `src/lib/dal/billing.ts` - Billing DAL: getTeacherSubscription, getTeacherWithSubscription, getSubscriptionByStripeId, getTeacherBillingOverview
- `src/actions/billing.ts` - Server actions: createCheckoutSession (Stripe Checkout redirect), createPortalSession (Stripe Portal redirect)

## Decisions Made
- **redirect() placement:** Placed outside try/catch blocks to avoid swallowing the internal throw that Next.js uses for redirects. Session URL captured in a variable within the try block, then redirect called after.
- **Parallel billing overview queries:** Used Promise.all for getTeacherBillingOverview to run teacher lookup, live bracket count, draft bracket count, and poll count concurrently rather than sequentially.
- **Price validation approach:** Simple PRICE_IDS.includes() check rather than Zod schema, matching the straightforward validation pattern in the existing codebase.
- **Promo codes enabled:** Set allow_promotion_codes: true on checkout sessions for future promo code support without requiring a code change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Billing DAL ready for pricing page and billing management page (Plan 06-03/04)
- Server actions ready to be called from pricing card buttons and subscription management UI
- Webhook handler (06-01) will process events from sessions created by these actions

---
*Phase: 06-billing-and-subscriptions*
*Completed: 2026-02-01*
