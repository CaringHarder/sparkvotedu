---
phase: 06-billing-and-subscriptions
plan: 03
subsystem: ui
tags: [pricing, billing, stripe, react, tailwind, server-actions]

# Dependency graph
requires:
  - phase: 06-billing-and-subscriptions
    provides: Static pricing config (PLANS, FREE_PLAN, BillingInterval) and Stripe server actions (createCheckoutSession, createPortalSession)
  - phase: 06-billing-and-subscriptions
    provides: Billing DAL (getTeacherBillingOverview) with usage counts and subscription state
  - phase: 01-foundation-and-auth
    provides: getAuthenticatedTeacher DAL, SubscriptionTier type, TIER_LIMITS, proxy.ts auth routing
provides:
  - PricingToggle component for Monthly/Annual billing interval selection
  - PricingCards component with 3-column tier comparison and context-aware CTAs
  - Public /pricing page accessible without authentication
  - In-app /billing page with current plan display, usage metrics, and Manage Subscription button
affects:
  - 06-04 (welcome page may reference billing page)
  - 06-05 (upgrade prompts may link to /pricing or /billing)

# Tech tracking
tech-stack:
  added: []
  patterns: [server component form action wrapper for void return, context-aware pricing cards with tier comparison]

key-files:
  created:
    - src/components/billing/pricing-toggle.tsx
    - src/components/billing/pricing-cards.tsx
    - src/app/pricing/page.tsx
    - src/app/(dashboard)/billing/page.tsx
  modified:
    - src/app/proxy.ts

key-decisions:
  - "Inline 'use server' wrapper for createPortalSession to satisfy form action void return type"
  - "Tier comparison via TIER_ORDER index for clean upgrade/downgrade/current detection"
  - "Polls usage shown with Infinity max (no tier limit on poll count) for honest display"

patterns-established:
  - "PricingCards: undefined currentTier = public mode, defined = authenticated mode with upgrade/downgrade logic"
  - "TierBadge component with color mapping per tier for consistent badge styling"
  - "UsageItem with progress bar ratio for visual limit feedback"
  - "Form action wrapper: inline async 'use server' function when server action return type mismatches form action signature"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 6 Plan 3: Pricing Page UI & Billing Management Summary

**3-column pricing cards with Monthly/Annual toggle, public /pricing route for visitors, and in-app /billing page with tier badge, usage metrics, and Stripe Customer Portal access**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-01T14:41:06Z
- **Completed:** 2026-02-01T14:44:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PricingToggle component with segmented Monthly/Annual control and "Save ~20%" badge on Annual option
- PricingCards renders 3-column grid (Free / Pro / Pro Plus) with interval-aware pricing, additive feature lists, "Most Popular" emphasis on Pro card, and context-aware CTAs
- Public /pricing page at top-level route (no auth required, added to PUBLIC_PAGES in proxy.ts)
- In-app /billing page with auth guard, tier badge, live/draft bracket usage against tier limits with progress bars, cancellation notice, and Manage Subscription button calling createPortalSession

## Task Commits

Each task was committed atomically:

1. **Task 1: PricingToggle and PricingCards components** - `746b92f` (feat)
2. **Task 2: Public /pricing page and in-app /billing page** - `859e195` (feat)

## Files Created/Modified
- `src/components/billing/pricing-toggle.tsx` - Monthly/Annual segmented toggle with save badge
- `src/components/billing/pricing-cards.tsx` - 3-column pricing card layout with tier comparison and checkout integration
- `src/app/pricing/page.tsx` - Public pricing page for visitors (static, no auth)
- `src/app/(dashboard)/billing/page.tsx` - In-app billing page with current plan, usage, and portal button
- `src/app/proxy.ts` - Added /pricing to PUBLIC_PAGES for unauthenticated access

## Decisions Made
- **Form action void return wrapper:** createPortalSession returns `{ error: string }` which doesn't satisfy the form action `(formData: FormData) => void | Promise<void>` signature. Wrapped in an inline `'use server'` async function that awaits the action and discards the return value. This pattern avoids modifying the server action's return type which is also used by client components.
- **Tier ordering via index:** Used a TIER_ORDER array with indexOf for clean upgrade/downgrade/current comparison rather than scattered if/else chains.
- **Polls shown with Infinity max:** The billing overview shows total polls but there's no tier limit on poll count, so the UsageItem displays "X of Unlimited" honestly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] createPortalSession form action type mismatch**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `createPortalSession` returns `Promise<{ error: string } | undefined>` but form action requires `(formData: FormData) => void | Promise<void>`. TypeScript error TS2322.
- **Fix:** Wrapped in inline `'use server'` async function: `async () => { 'use server'; await createPortalSession() }`
- **Files modified:** src/app/(dashboard)/billing/page.tsx
- **Verification:** npx tsc --noEmit passes, npm run build succeeds
- **Committed in:** 859e195 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - type mismatch)
**Impact on plan:** Minor type compatibility fix. No scope creep.

## Issues Encountered
None beyond the type mismatch auto-fixed above.

## Next Phase Readiness
- Pricing cards and billing page ready for upgrade prompt integration (Plan 06-05)
- /pricing route accessible for public visitors, /billing for authenticated teachers
- Both pages share PricingCards component ensuring consistent pricing display
- Manage Subscription button wired to Stripe Customer Portal

---
*Phase: 06-billing-and-subscriptions*
*Completed: 2026-02-01*
