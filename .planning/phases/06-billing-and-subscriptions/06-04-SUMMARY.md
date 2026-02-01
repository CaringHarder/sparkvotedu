---
phase: 06-billing-and-subscriptions
plan: 04
subsystem: ui
tags: [billing, components, upgrade-prompt, plan-badge, welcome-page, sidebar, dashboard]

# Dependency graph
requires:
  - phase: 06-billing-and-subscriptions
    provides: Billing DAL with getTeacherBillingOverview, Stripe SDK singleton, pricing config with priceIdToTier
  - phase: 01-foundation-and-auth
    provides: getAuthenticatedTeacher DAL, SubscriptionTier type, TIER_LIMITS, feature gates
provides:
  - UpgradePrompt component for inline lock icon + tooltip on locked features
  - PlanBadge component with color-coded tier badges (Free/Pro/Pro Plus)
  - Post-checkout welcome page at /billing/welcome with Stripe session verification
  - Sidebar Billing nav link with CreditCard icon
  - Dashboard Plan & Usage card with live/draft bracket counts
affects:
  - 06-05 (upgrade prompts will use UpgradePrompt component on feature-gated UI)
  - Future phases using feature gates can render UpgradePrompt inline

# Tech tracking
tech-stack:
  added: []
  patterns: [CSS-only tooltip with group-hover, tier index comparison for safe guard, direct Stripe session retrieval for webhook race avoidance, parallel Promise.all for dashboard data]

key-files:
  created:
    - src/components/billing/upgrade-prompt.tsx
    - src/components/billing/plan-badge.tsx
    - src/app/(dashboard)/billing/welcome/page.tsx
  modified:
    - src/components/dashboard/sidebar-nav.tsx
    - src/components/dashboard/shell.tsx

key-decisions:
  - "CSS-only tooltip (invisible group-hover:visible) for zero-JS hover interaction on UpgradePrompt"
  - "TIER_ORDER index comparison as safety guard to prevent showing upgrade prompt when user already has access"
  - "Welcome page reads Stripe Checkout Session directly to avoid webhook race condition"
  - "Parallel Promise.all for sessions + billing overview in dashboard shell"

patterns-established:
  - "UpgradePrompt: non-intrusive lock icon + tooltip pattern for all feature gates"
  - "PlanBadge: reusable tier badge with color-coded styling for dashboard and billing pages"
  - "Stripe session direct retrieval: preferred pattern for post-checkout confirmation to avoid webhook timing dependency"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 6 Plan 4: Billing UI Components & Dashboard Integration Summary

**UpgradePrompt lock-icon tooltip, PlanBadge color-coded tier badge, post-checkout welcome page with direct Stripe session verification, sidebar Billing link, and dashboard Plan & Usage card**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-01T14:41:10Z
- **Completed:** 2026-02-01T14:44:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- UpgradePrompt component renders non-intrusive lock icon with CSS-only hover tooltip, supports optional clickable Link wrapper, and guards against showing when user already has the required tier
- PlanBadge component provides color-coded badges for all 3 tiers (neutral/primary/amber with dark mode support)
- Welcome page at /billing/welcome retrieves Stripe Checkout Session directly to confirm payment, displays tier features on success, and shows processing state for pending payments
- Sidebar nav updated with Billing link (CreditCard icon) between Sessions and Activities
- Dashboard shell replaced plain text tier badge with PlanBadge component and added Plan & Usage card showing live/draft bracket counts against tier limits

## Task Commits

Each task was committed atomically:

1. **Task 1: UpgradePrompt and PlanBadge components** - `d828cd2` (feat)
2. **Task 2: Welcome page, sidebar nav, dashboard plan card** - `f919487` (feat)

## Files Created/Modified
- `src/components/billing/upgrade-prompt.tsx` - Client component: inline lock icon + CSS hover tooltip for locked features
- `src/components/billing/plan-badge.tsx` - Server component: color-coded plan name badge (Free/Pro/Pro Plus)
- `src/app/(dashboard)/billing/welcome/page.tsx` - Post-checkout confirmation page with Stripe session retrieval
- `src/components/dashboard/sidebar-nav.tsx` - Added Billing nav item with CreditCard icon
- `src/components/dashboard/shell.tsx` - PlanBadge integration, Plan & Usage card with billing overview data

## Decisions Made
- **CSS-only tooltip approach:** Used `invisible group-hover:visible` on an absolute-positioned span rather than JS-based tooltip library. Keeps the component lightweight and avoids additional dependencies.
- **TIER_ORDER index comparison:** UpgradePrompt compares tier indices (free=0, pro=1, pro_plus=2) as a safety guard. Returns null if currentTier >= requiredTier, even though callers should also check.
- **Direct Stripe session retrieval on welcome page:** Per 06-RESEARCH.md recommendation, the welcome page calls `stripe.checkout.sessions.retrieve(sessionId)` rather than reading the Teacher record, avoiding the race condition where the webhook hasn't processed yet.
- **Parallel dashboard fetching:** Dashboard shell uses Promise.all to fetch sessions and billing overview concurrently, matching the established parallel query pattern from the billing DAL.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- UpgradePrompt ready to be used inline wherever feature gates appear in the UI
- PlanBadge available for billing page and any other location needing tier display
- Welcome page provides complete post-checkout flow from Stripe redirect
- Dashboard and sidebar are billing-aware, linking to /billing for plan management

---
*Phase: 06-billing-and-subscriptions*
*Completed: 2026-02-01*
