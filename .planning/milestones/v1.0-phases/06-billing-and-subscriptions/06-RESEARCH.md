# Phase 6: Billing & Subscriptions - Research

**Researched:** 2026-01-31
**Domain:** Stripe subscription billing, feature gating, Next.js App Router integration
**Confidence:** HIGH

## Summary

Phase 6 integrates Stripe Checkout and Customer Portal into an existing Next.js 16 App Router application that already has a complete feature-gating system (`canAccess()`, `TIER_LIMITS`, `upgradeTarget()` in `src/lib/gates/`), a Teacher model with `subscriptionTier` and `stripeCustomerId` fields, and an established pattern of server actions + DAL for mutations.

The standard approach is: install the `stripe` server-side SDK, create 2 Products in Stripe (Pro, Pro Plus) each with 2 Prices (monthly, annual), use server actions to create Checkout Sessions (redirect mode), handle subscription lifecycle via a webhook route handler at `app/api/webhooks/stripe/route.ts`, sync subscription state to a new `Subscription` model in Prisma, and update the Teacher's `subscriptionTier` field on webhook events. The existing `canAccess()` system already reads `teacher.subscriptionTier` -- so once the webhook updates the tier, all existing gate checks work automatically.

Key architectural decisions are already locked: Stripe Checkout (redirect, not embedded), Customer Portal for management, 3-day grace period on failed payments, no free trial. The main implementation work is: (1) Stripe Products/Prices setup, (2) checkout server action, (3) webhook route handler, (4) Prisma Subscription model, (5) pricing page UI, (6) upgrade prompt components, (7) Customer Portal server action, (8) welcome/confirmation page.

**Primary recommendation:** Use `stripe` v20.x server SDK only (no `@stripe/stripe-js` client SDK needed since using redirect-only Checkout). Create a single webhook route handler with signature verification, handle 5 core events, and store full subscription state in a new `Subscription` table while keeping the denormalized `subscriptionTier` on Teacher for fast gate checks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | ^20.2.0 | Server-side Stripe SDK | Official Node.js SDK for Stripe API. Handles Checkout Sessions, Customer Portal Sessions, webhook signature verification, and all Stripe API calls. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | latest | Local webhook testing | During development to forward webhook events to `localhost:3000/api/webhooks/stripe` |

### Not Needed
| Library | Why Not |
|---------|---------|
| `@stripe/stripe-js` | Only needed for embedded Checkout or Payment Elements. We use redirect-only Checkout. |
| `@stripe/react-stripe-js` | React bindings for embedded Stripe UI. Not needed with redirect flow. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (redirect) | Stripe Payment Elements (embedded) | Embedded gives more UI control but adds complexity and requires `@stripe/stripe-js` + `@stripe/react-stripe-js`. Redirect is simpler and already decided in CONTEXT.md. |
| Separate Subscription table | Just `subscriptionTier` on Teacher | Subscription table stores Stripe IDs, period end, status for webhook idempotency and portal management. The denormalized `subscriptionTier` on Teacher stays for fast gate checks. |

**Installation:**
```bash
npm install stripe
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/
│   └── billing.ts               # Server actions: createCheckout, createPortalSession
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts      # Webhook route handler (POST only)
│   ├── (dashboard)/
│   │   ├── billing/
│   │   │   └── page.tsx          # In-app billing/plan management page
│   │   └── billing/
│   │       └── welcome/
│   │           └── page.tsx      # Post-checkout welcome page
│   └── pricing/
│       └── page.tsx              # Public pricing page (no auth required)
├── components/
│   ├── billing/
│   │   ├── pricing-cards.tsx     # 3-column pricing card layout
│   │   ├── pricing-toggle.tsx    # Monthly/Annual toggle
│   │   ├── plan-badge.tsx        # Current plan display badge
│   │   └── upgrade-prompt.tsx    # Lock icon + tooltip upgrade prompt
│   └── ui/
│       └── (existing components)
├── lib/
│   ├── stripe.ts                 # Stripe client singleton
│   ├── gates/
│   │   ├── tiers.ts              # (existing) TIER_LIMITS, SubscriptionTier
│   │   └── features.ts           # (existing) canAccess(), canCreateBracket(), etc.
│   └── dal/
│       └── billing.ts            # DAL for subscription queries/updates
└── config/
    └── pricing.ts                # Price IDs, tier metadata, feature lists (static config)
```

### Pattern 1: Server Action for Checkout Session Creation
**What:** Create Stripe Checkout Sessions via server actions (matching existing bracket/poll action patterns).
**When to use:** When teacher clicks "Subscribe to Pro" or "Subscribe to Pro Plus".
**Example:**
```typescript
// src/actions/billing.ts
'use server'

import { getAuthenticatedTeacher } from '@/lib/dal/auth'
import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(priceId: string) {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    customer: teacher.stripeCustomerId || undefined,
    customer_email: !teacher.stripeCustomerId ? teacher.email : undefined,
    metadata: {
      teacherId: teacher.id,
    },
    subscription_data: {
      metadata: {
        teacherId: teacher.id,
      },
    },
  })

  redirect(session.url!)
}
```
**Source:** [Stripe Checkout Quickstart](https://docs.stripe.com/checkout/quickstart), [Stripe + Next.js Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)

### Pattern 2: Webhook Route Handler with Signature Verification
**What:** A Next.js App Router route handler that receives and verifies Stripe webhook events.
**When to use:** For all subscription lifecycle events.
**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const body = await request.text()  // MUST use .text() for raw body
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
```
**Source:** [Stripe Webhooks Docs](https://docs.stripe.com/webhooks), [Next.js App Router Webhook Pattern](https://www.geeksforgeeks.org/reactjs/how-to-add-stripe-webhook-using-nextjs-13-app-router/)

### Pattern 3: Customer Portal Server Action
**What:** Create a Stripe Customer Portal session and redirect the teacher.
**When to use:** When teacher clicks "Manage Subscription" in billing settings.
**Example:**
```typescript
// src/actions/billing.ts (continued)
export async function createPortalSession() {
  const teacher = await getAuthenticatedTeacher()
  if (!teacher) {
    return { error: 'Not authenticated' }
  }

  if (!teacher.stripeCustomerId) {
    return { error: 'No subscription found' }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: teacher.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
  })

  redirect(session.url)
}
```
**Source:** [Stripe Customer Portal API](https://docs.stripe.com/billing/subscriptions/integrating-customer-portal)

### Pattern 4: Stripe Client Singleton
**What:** A module-level Stripe instance to avoid repeated initialization.
**When to use:** Import in all server-side Stripe operations.
**Example:**
```typescript
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})
```
**Source:** [Stripe Node.js SDK](https://github.com/stripe/stripe-node)

### Pattern 5: Pricing Configuration (Static, not from Stripe API)
**What:** A static config file mapping tier names to Stripe Price IDs and feature lists.
**When to use:** For pricing page rendering and checkout session creation.
**Example:**
```typescript
// src/config/pricing.ts
export const PLANS = {
  pro: {
    name: 'Pro',
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
    monthlyPrice: 12,
    annualPrice: 10,  // per month, billed annually ($120/year)
    features: [
      'Everything in Free plus...',
      'Unlimited brackets',
      'Full analytics + CSV export',
      'Simple and ranked polls',
      'Up to 32 entrants per bracket',
    ],
  },
  pro_plus: {
    name: 'Pro Plus',
    monthlyPriceId: process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID!,
    annualPriceId: process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID!,
    monthlyPrice: 20,
    annualPrice: 16,  // per month, billed annually ($192/year)
    features: [
      'Everything in Pro plus...',
      'Predictive brackets',
      'Double-elimination, round-robin',
      'Non-power-of-two sizes',
      'Up to 64 entrants per bracket',
    ],
  },
} as const
```

### Anti-Patterns to Avoid
- **Storing price amounts in the database:** Prices are static and defined in Stripe. Use a static config file; don't fetch prices from Stripe API on every render.
- **Using server actions for webhooks:** Webhooks must be route handlers (POST endpoints), not server actions. Server actions require authentication; webhooks use signature verification.
- **Checking `subscriptionTier` from Stripe API on every request:** The denormalized `subscriptionTier` on Teacher is the fast path. Webhooks keep it in sync. Never call Stripe API for tier checks in hot paths.
- **Trusting client-side tier data:** Always verify tier server-side via the Teacher record. Never pass tier from client to server action.
- **JSON-parsing the webhook body before verification:** Use `request.text()` to get raw body. Parsing to JSON first breaks signature verification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment collection | Custom payment form | Stripe Checkout (redirect) | PCI compliance, fraud detection, 3D Secure, mobile optimization all handled |
| Subscription management UI | Custom upgrade/downgrade/cancel forms | Stripe Customer Portal | Portal handles proration, payment method updates, invoice history, cancellation flows |
| Webhook signature verification | Manual HMAC comparison | `stripe.webhooks.constructEvent()` | Handles timing attacks, replay prevention, signature rotation |
| Payment retry logic | Custom retry scheduler | Stripe Smart Retries | AI-driven retry timing, configurable via Dashboard |
| Invoice generation | Custom invoice system | Stripe Invoices (automatic with subscriptions) | Tax calculation, PDF generation, email delivery |
| Subscription proration | Manual proration math | Stripe's built-in proration | Handles mid-cycle upgrades/downgrades correctly |

**Key insight:** Stripe handles the hard parts of billing (payment collection, PCI compliance, retry logic, proration, invoicing). The application's job is: (1) create sessions for Checkout/Portal, (2) sync state from webhooks, (3) enforce features based on synced tier.

## Common Pitfalls

### Pitfall 1: Webhook body parsing breaks signature verification
**What goes wrong:** `stripe.webhooks.constructEvent()` fails with "signature verification failed" error.
**Why it happens:** Next.js App Router doesn't auto-parse request bodies, but developers may call `request.json()` before `constructEvent()`, or middleware may transform the body.
**How to avoid:** Always use `await request.text()` to get the raw body string. Do NOT parse JSON first. Do NOT use middleware that modifies the request body on the webhook route.
**Warning signs:** 400 errors from webhook endpoint; Stripe Dashboard shows failed webhook deliveries.

### Pitfall 2: Missing teacherId linkage in webhook handlers
**What goes wrong:** Webhook receives subscription events but can't link them back to the correct Teacher record.
**Why it happens:** Developer forgets to include `teacherId` in Checkout Session metadata or subscription metadata.
**How to avoid:** Always set `metadata.teacherId` on both the Checkout Session AND the `subscription_data.metadata`. The Checkout Session metadata is available on `checkout.session.completed`; the subscription metadata is available on `customer.subscription.updated/deleted`.
**Warning signs:** Teachers complete checkout but tier doesn't update; subscription records created without teacher association.

### Pitfall 3: Race condition between Checkout success redirect and webhook
**What goes wrong:** Teacher lands on welcome page but their tier hasn't updated yet because the webhook hasn't been processed.
**Why it happens:** The success redirect happens immediately after payment, but the webhook may arrive milliseconds to seconds later.
**How to avoid:** The welcome page should either: (a) poll for tier update, (b) use the `session_id` query param to verify checkout completion directly via `stripe.checkout.sessions.retrieve()`, or (c) show a generic "processing" state that resolves when the tier updates.
**Warning signs:** Teacher sees "Free" tier badge on welcome page immediately after paying.

### Pitfall 4: Not handling duplicate webhook events (idempotency)
**What goes wrong:** Subscription state gets corrupted or duplicate records created.
**Why it happens:** Stripe retries failed webhook deliveries (up to ~3 days). If a webhook handler partially succeeds then errors, the retry will re-process the same event.
**How to avoid:** Use `event.id` for idempotency checks. Before processing, check if a record with that event ID already exists. Use `upsert` instead of `create` for subscription records. Store the Stripe event ID on processed records.
**Warning signs:** Duplicate database records; subscription status flip-flops between states.

### Pitfall 5: Grace period implementation confusion
**What goes wrong:** Teacher loses access immediately on first failed payment instead of getting 3-day grace.
**Why it happens:** Developer downgrades tier on `invoice.payment_failed` instead of waiting for `customer.subscription.deleted` or checking subscription status.
**How to avoid:** The 3-day grace period is implemented via Stripe's retry/dunning settings (configured in Stripe Dashboard: Billing > Revenue Recovery). When a payment fails, the subscription enters `past_due` status. During `past_due`, the teacher should KEEP their paid tier. Only downgrade when the subscription transitions to `canceled` or `unpaid` (which happens after the configured retry period). Store `subscriptionStatus` alongside `subscriptionTier` and treat `past_due` as still having access.
**Warning signs:** Teachers lose access immediately on failed payment; 3-day window not respected.

### Pitfall 6: Pricing page renders wrong for public vs authenticated visitors
**What goes wrong:** Public visitors see the pricing page without issues, but authenticated teachers don't see their current plan highlighted or get wrong CTA buttons.
**Why it happens:** Pricing page needs to work for both public (no auth) and authenticated (teacher with tier) visitors.
**How to avoid:** Design the pricing page component to accept an optional `currentTier` prop. Public route passes no tier. In-app route passes the teacher's tier. CTAs change: public shows "Get Started" (links to signup), authenticated shows "Current Plan" / "Upgrade" / "Downgrade" appropriately.
**Warning signs:** Authenticated teacher can subscribe to a plan they already have; public visitor sees "Manage Subscription" button.

### Pitfall 7: TIER_LIMITS discrepancy with requirements
**What goes wrong:** Free tier has `analytics: false` in current `tiers.ts` but BILL-01 mentions "basic analytics."
**Why it happens:** The TIER_LIMITS were built in Phase 1 based on early architecture research. The BILL-01 requirement says "basic analytics" for free tier, but the analytics feature (ANLYT-01/02) is a separate phase and hasn't been built yet.
**How to avoid:** During Phase 6 planning, clarify whether "basic analytics" means the `analytics` boolean in TIER_LIMITS should be `true` for free tier, or if it refers to something simpler (like vote counts visible on bracket/poll pages, which already exist). The planner should flag this for reconciliation. The current TIER_LIMITS may need a minor update (e.g., split `analytics` into `basicAnalytics` and `fullAnalytics`).
**Warning signs:** Pricing page claims free tier has "basic analytics" but the feature gate blocks it.

## Code Examples

### Stripe Client Initialization
```typescript
// src/lib/stripe.ts
// Source: https://github.com/stripe/stripe-node
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})
```

### Subscription Model (Prisma schema addition)
```prisma
// Addition to prisma/schema.prisma
model Subscription {
  id                     String    @id @default(uuid())
  teacherId              String    @unique @map("teacher_id")
  teacher                Teacher   @relation(fields: [teacherId], references: [id])
  stripeSubscriptionId   String    @unique @map("stripe_subscription_id")
  stripePriceId          String    @map("stripe_price_id")
  stripeCurrentPeriodEnd DateTime  @map("stripe_current_period_end")
  status                 String    // active, past_due, canceled, unpaid, incomplete
  cancelAtPeriodEnd      Boolean   @default(false) @map("cancel_at_period_end")
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  @@index([stripeSubscriptionId])
  @@map("subscriptions")
}
```

Teacher model addition:
```prisma
model Teacher {
  // ... existing fields ...
  subscription  Subscription?  // Add this relation
}
```

### Webhook Handler: checkout.session.completed
```typescript
// Source: Stripe docs + Next.js App Router pattern
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const teacherId = session.metadata?.teacherId
  if (!teacherId) {
    console.error('No teacherId in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id
  const tier = priceIdToTier(priceId) // Maps price ID -> 'pro' | 'pro_plus'

  // Upsert subscription record (idempotent)
  await prisma.subscription.upsert({
    where: { teacherId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    create: {
      teacherId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  // Update teacher's denormalized tier + customer ID
  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      subscriptionTier: tier,
      stripeCustomerId: session.customer as string,
    },
  })
}
```

### Price ID to Tier Mapping
```typescript
// src/config/pricing.ts (helper)
const PRICE_TO_TIER: Record<string, 'pro' | 'pro_plus'> = {
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]: 'pro',
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]: 'pro',
  [process.env.STRIPE_PRO_PLUS_MONTHLY_PRICE_ID!]: 'pro_plus',
  [process.env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID!]: 'pro_plus',
}

export function priceIdToTier(priceId: string): 'pro' | 'pro_plus' {
  return PRICE_TO_TIER[priceId] ?? 'pro'  // Fallback to pro if unknown
}
```

### Upgrade Prompt Component Pattern
```typescript
// src/components/billing/upgrade-prompt.tsx
// Source: CONTEXT.md decision - lock icon + tooltip inline
import { Lock } from 'lucide-react'
import type { SubscriptionTier } from '@/lib/gates/tiers'

interface UpgradePromptProps {
  currentTier: SubscriptionTier
  requiredTier: SubscriptionTier
  featureName: string
}

export function UpgradePrompt({ currentTier, requiredTier, featureName }: UpgradePromptProps) {
  const tierLabel = requiredTier === 'pro' ? 'Pro' : 'Pro Plus'

  return (
    <div className="group relative inline-flex items-center gap-1 text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      <span className="invisible absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:visible">
        Upgrade to {tierLabel} to unlock {featureName}
      </span>
    </div>
  )
}
```

### Environment Variables Required
```bash
# .env.local additions for Phase 6
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Only if needed for future embedded UI

# Price IDs (created in Stripe Dashboard)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_PLUS_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_PLUS_ANNUAL_PRICE_ID=price_...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `pages/api/webhook.ts` with `micro` buffer | App Router `app/api/webhooks/stripe/route.ts` with `request.text()` | Next.js 13+ (2023) | No `micro` dependency needed; cleaner route handler pattern |
| Stripe Checkout embedded (custom UI) | Stripe Checkout redirect OR embedded | Always available | Redirect is simpler, PCI-compliant by default, recommended for most SaaS |
| Manual subscription management UI | Stripe Customer Portal | 2020+ | Portal handles proration, payment updates, cancellation with no custom code |
| `bodyParser: false` config export | Not needed in App Router | Next.js 13+ | App Router route handlers don't auto-parse; `request.text()` gives raw body natively |
| Stripe API version pinning in constructor | Still recommended but SDK defaults work | Ongoing | Latest Stripe API version is `2026-01-28.clover`; SDK defaults to its bundled version |

**Deprecated/outdated:**
- `express.raw()` middleware for webhooks: Not applicable in Next.js App Router
- `micro` package for raw body access: Only needed for Pages Router
- `stripe.webhooks.constructEvent` with Buffer: String body from `request.text()` works fine

## Open Questions

1. **TIER_LIMITS `analytics` field vs "basic analytics" in BILL-01**
   - What we know: `tiers.ts` has `analytics: false` for free tier. BILL-01 says "basic analytics."
   - What's unclear: Whether "basic analytics" is the same feature gated by the `analytics` boolean, or something simpler that free users already have (e.g., vote counts on brackets/polls).
   - Recommendation: The planner should either (a) split `analytics` into `basicAnalytics: true` and `fullAnalytics: false` for free tier, or (b) clarify that "basic analytics" in BILL-01 refers to the existing vote count display and is not gated. This is a minor reconciliation task.

2. **Stripe Products/Prices: Dashboard vs API creation**
   - What we know: Products and Prices can be created via Stripe Dashboard (GUI) or API.
   - What's unclear: Whether the planner wants a setup script or manual Dashboard configuration.
   - Recommendation: Create Products/Prices manually in Stripe Dashboard during development. Document the setup steps. Price IDs go into `.env`. No need for a migration script for 4 prices.

3. **Grace period: Stripe Dashboard config vs application-level logic**
   - What we know: The 3-day grace period maps to Stripe's dunning/retry settings. The subscription enters `past_due` status during retries. After retries exhaust, it transitions to `canceled` or `unpaid`.
   - What's unclear: Whether the app should also track a `graceEndsAt` timestamp, or simply rely on Stripe's subscription status (`past_due` = still active, `canceled` = downgrade).
   - Recommendation: Rely on Stripe's subscription `status` field. Treat `active` and `past_due` as "has access." Treat `canceled`, `unpaid`, `incomplete_expired` as "downgrade to free." Configure Stripe Dashboard retry settings to ~3 days. No custom grace period logic needed in the app.

4. **Welcome page: session_id verification vs polling**
   - What we know: After checkout, teacher lands on `/billing/welcome?session_id={CHECKOUT_SESSION_ID}`. The webhook may not have processed yet.
   - What's unclear: Whether to verify via `stripe.checkout.sessions.retrieve(sessionId)` on page load, or show a loading state until teacher record updates.
   - Recommendation: On the welcome page, retrieve the Checkout Session server-side using the `session_id` param to confirm payment succeeded and display the tier name. Don't depend on the Teacher record being updated yet. This is faster and more reliable than polling.

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout Quickstart (Next.js)](https://docs.stripe.com/checkout/quickstart?lang=node&client=next) - Checkout session creation, redirect flow
- [Stripe Build Subscriptions Guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions?ui=checkout) - Subscription lifecycle, webhook events
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) - Signature verification, event handling, retry logic
- [Stripe Customer Portal Integration](https://docs.stripe.com/billing/subscriptions/integrating-customer-portal) - Portal session creation, capabilities
- [Stripe Customer Portal Session API](https://docs.stripe.com/api/customer_portal/sessions/create) - API parameters, return values
- [Stripe Revenue Recovery / Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries) - Dunning configuration, retry logic
- [Stripe Subscription Webhook Events](https://docs.stripe.com/billing/subscriptions/webhooks) - Event types for subscription lifecycle
- [Stripe CLI Documentation](https://docs.stripe.com/stripe-cli) - Local webhook testing
- [stripe npm package (v20.2.0)](https://www.npmjs.com/package/stripe) - Current version, API

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 15 Complete Guide (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - Full implementation patterns with server actions, webhook handlers, TypeScript patterns
- [Stripe Webhooks in Next.js App Router (DEV Community)](https://dev.to/thekarlesi/how-to-handle-stripe-and-paystack-webhooks-in-nextjs-the-app-router-way-5bgi) - App Router webhook pattern
- [GeeksforGeeks: Stripe Webhook Next.js App Router](https://www.geeksforgeeks.org/reactjs/how-to-add-stripe-webhook-using-nextjs-13-app-router/) - Raw body handling in route handlers
- [Stripe CLI Listen Command](https://docs.stripe.com/cli/listen) - Local webhook forwarding

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Stripe docs + npm registry confirm `stripe` v20.2.0 as the sole server dependency needed
- Architecture: HIGH - Patterns verified against official Stripe docs, Next.js App Router conventions, and existing codebase patterns (server actions, DAL, Prisma)
- Pitfalls: HIGH - Common issues documented across multiple sources (Stripe docs, GitHub issues, blog posts); raw body handling confirmed as the most frequent issue
- Database schema: HIGH - Standard Prisma pattern for Stripe subscription storage, verified across multiple implementation guides

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (Stripe SDK is stable; Next.js 16 patterns are established)
