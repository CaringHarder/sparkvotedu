---
phase: 06-billing-and-subscriptions
plan: 01
subsystem: payments
tags: [stripe, webhooks, subscriptions, prisma, billing]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: Teacher model with subscriptionTier and stripeCustomerId fields
  - phase: 01-foundation-and-auth
    provides: Feature gating system (canAccess, TIER_LIMITS, SubscriptionTier)
provides:
  - Stripe SDK singleton for all server-side Stripe operations
  - Subscription Prisma model for tracking Stripe subscription state
  - Static pricing config mapping Price IDs to tiers
  - Webhook route handler processing 5 Stripe lifecycle events
  - priceIdToTier function for price-to-tier mapping
affects:
  - 06-02 (checkout session creation uses stripe singleton + pricing config)
  - 06-03 (customer portal uses stripe singleton)
  - 06-04 (pricing page uses PLANS, FREE_PLAN config)
  - 06-05 (upgrade prompts reference pricing tiers)

# Tech tracking
tech-stack:
  added: [stripe v20.x]
  patterns: [webhook signature verification, subscription lifecycle sync, upsert for idempotency]

key-files:
  created:
    - src/lib/stripe.ts
    - src/config/pricing.ts
    - src/app/api/webhooks/stripe/route.ts
  modified:
    - prisma/schema.prisma
    - src/app/proxy.ts

key-decisions:
  - "Stripe v20 API (2026-01-28.clover): current_period_end on subscription items, not subscription object"
  - "Invoice subscription ID accessed via invoice.parent.subscription_details.subscription (v20 structure)"
  - "past_due status preserves paid tier access (grace period via Stripe dunning settings)"
  - "Webhook returns 200 even on processing errors to prevent Stripe retries for app-level bugs"
  - "Upsert for all subscription DB writes ensures idempotent webhook processing"

patterns-established:
  - "Webhook raw body: request.text() for signature verification (never request.json())"
  - "Price-to-tier mapping: static Record lookup with priceIdToTier function"
  - "Subscription state sync: upsert Subscription record + update Teacher.subscriptionTier"
  - "Try/catch per DB operation in webhooks: prevents partial failure from blocking acknowledgment"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 6 Plan 1: Stripe Foundation & Webhook Handler Summary

**Stripe v20 SDK singleton, Subscription Prisma model, static pricing config with price-to-tier mapping, and webhook handler processing 5 subscription lifecycle events**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-01T05:02:32Z
- **Completed:** 2026-02-01T05:07:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Stripe SDK installed and configured as singleton for all server-side operations
- Subscription model created in database with Stripe IDs, status, and period tracking
- Static pricing config maps 4 Stripe Price IDs to 2 tiers (pro, pro_plus) without runtime API calls
- Webhook handler at /api/webhooks/stripe processes checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, and invoice.payment_failed
- Teacher subscriptionTier denormalized on webhook events for fast gate checks
- Grace period: past_due status preserves paid access, only canceled/unpaid/incomplete_expired downgrade to free

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Stripe SDK, create pricing config, Stripe singleton, and Subscription model** - `755e10c` (feat)
2. **Task 2: Webhook route handler with signature verification and event processing** - `bbd22eb` (feat)

## Files Created/Modified
- `src/lib/stripe.ts` - Stripe client singleton (server-side only)
- `src/config/pricing.ts` - Static pricing config: FREE_PLAN, PLANS, PRICE_IDS, priceIdToTier, BillingInterval
- `prisma/schema.prisma` - Added Subscription model + Teacher.subscription relation
- `src/app/api/webhooks/stripe/route.ts` - POST-only webhook route with signature verification and 5 event handlers
- `src/app/proxy.ts` - Added /api/webhooks/ to public routes

## Decisions Made
- **Stripe v20 API adaptation:** `current_period_end` moved from Subscription to SubscriptionItem in API version 2026-01-28.clover. Used `subscription.items.data[0].current_period_end` instead.
- **Invoice parent structure:** In v20, `invoice.subscription` replaced by `invoice.parent?.subscription_details?.subscription`. Adapted handleInvoicePaid and handlePaymentFailed accordingly.
- **Webhook error handling:** Return 200 even on processing errors (after successful signature verification) to prevent Stripe from retrying for application-level bugs. Errors logged for investigation.
- **Per-operation try/catch:** Each DB operation in webhook handlers wrapped individually so a failure in one (e.g., subscription upsert) doesn't prevent the next (e.g., teacher tier update).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe v20 API type changes for current_period_end**
- **Found during:** Task 2 (Webhook handler implementation)
- **Issue:** Plan referenced `subscription.current_period_end` which was removed in Stripe SDK v20 (API 2026-01-28.clover). TypeScript compilation failed.
- **Fix:** Changed to `subscription.items.data[0].current_period_end` per v20 API structure
- **Files modified:** src/app/api/webhooks/stripe/route.ts
- **Verification:** npx tsc --noEmit passes, npm run build succeeds
- **Committed in:** bbd22eb (Task 2 commit)

**2. [Rule 1 - Bug] Stripe v20 API type changes for invoice.subscription**
- **Found during:** Task 2 (Webhook handler implementation)
- **Issue:** Plan referenced `invoice.subscription` which was restructured in v20 to `invoice.parent.subscription_details.subscription`. TypeScript compilation failed.
- **Fix:** Changed to `invoice.parent?.subscription_details?.subscription` with proper null checking
- **Files modified:** src/app/api/webhooks/stripe/route.ts
- **Verification:** npx tsc --noEmit passes, npm run build succeeds
- **Committed in:** bbd22eb (Task 2 commit)

**3. [Rule 3 - Blocking] Prisma client regeneration needed after schema change**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `prisma.subscription` not recognized because Prisma client was stale after adding Subscription model in Task 1
- **Fix:** Ran `npx prisma generate` to regenerate the client
- **Verification:** TypeScript recognizes prisma.subscription, all operations compile
- **Committed in:** bbd22eb (Task 2 commit, client generation is runtime)

---

**Total deviations:** 3 auto-fixed (2 bugs from Stripe v20 API changes, 1 blocking Prisma client regen)
**Impact on plan:** All auto-fixes necessary for correct compilation with current Stripe SDK version. No scope creep.

## Issues Encountered
- Stripe SDK v20 ships with API version 2026-01-28.clover which restructured several fields compared to patterns documented in the research phase. The research was correct at time of writing but the installed SDK version introduced breaking type changes. All resolved by consulting the actual TypeScript definitions in node_modules.

## User Setup Required

**External services require manual configuration.** The plan frontmatter documents Stripe Dashboard setup:
- Create Pro and Pro Plus products with Monthly/Annual prices in Stripe Dashboard
- Add 6 environment variables to .env.local (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 4 price IDs)
- Create webhook endpoint in Stripe Dashboard pointing to /api/webhooks/stripe
- Configure revenue recovery retry schedule to ~3 days

## Next Phase Readiness
- Stripe singleton ready for checkout session creation (Plan 06-02)
- Pricing config ready for pricing page rendering (Plan 06-04)
- Webhook handler ready to receive events once Stripe Dashboard is configured
- Subscription model in database, ready for portal and billing management queries

---
*Phase: 06-billing-and-subscriptions*
*Completed: 2026-01-31*
