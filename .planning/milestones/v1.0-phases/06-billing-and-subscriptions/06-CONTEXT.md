# Phase 6: Billing & Subscriptions - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can subscribe to Pro or Pro Plus tiers via Stripe, with features gated and upgrade prompts shown for locked capabilities. Covers pricing display, Stripe Checkout integration, Customer Portal access, webhook-driven tier sync, server-side enforcement, and UI upgrade prompts. Does not include building new paid features themselves (those are Phase 7+).

</domain>

<decisions>
## Implementation Decisions

### Pricing & tier presentation
- 3-column card layout with Pro visually emphasized as "Most Popular" (larger card or accent border)
- Monthly/Annual toggle on pricing page; annual saves ~20% ($10/mo Pro, $16/mo Pro Plus billed annually)
- Toggle defaults to monthly view
- Free tier framed as "generous starter" — positive framing, not limiting
- Additive feature lists: Free shows base, Pro shows "Everything in Free plus...", Pro Plus shows "Everything in Pro plus..."
- Prices are final: $12/mo Pro, $20/mo Pro Plus (monthly); ~20% annual discount
- No social proof or trust signals on pricing cards
- Pro Plus gets no special visual treatment beyond having more features — same design language as other cards
- Pricing accessible at both public /pricing route (for visitors) and in-app settings (for logged-in teachers)
- Dashboard card for logged-in teachers shows current plan name + key usage metrics (e.g., "2 of 2 live brackets")

### Upgrade prompts & gates
- Lock icon + tooltip inline when teacher encounters a locked feature — non-intrusive
- Mixed visibility: major features visible-but-locked (double-elimination, CSV export), minor limits hidden (entrant counts, bracket count caps)
- Smart targeting: prompt says "Upgrade to Pro" or "Upgrade to Pro Plus" based on teacher's current tier and what the feature requires
- Passive only — no unsolicited upgrade messaging, nudges only appear when teacher encounters a locked feature

### Checkout & portal flow
- Stripe Checkout (redirect) for all subscriptions — teacher leaves the app to complete payment on Stripe-hosted page
- After successful checkout, teacher lands on a dedicated welcome/confirmation page showing what they just unlocked, then link back to dashboard
- Stripe Customer Portal for all subscription management (upgrade, downgrade, cancel, update payment, view invoices)
- 3-day grace period on failed payments — teacher keeps paid features for 3 days while they fix their card

### Free tier boundaries
- At limit: hard block with option to archive/complete an existing item to free up a slot (e.g., "You've reached 2 live brackets. Complete or archive one, or upgrade to Pro.")
- On downgrade: existing content preserved but read-only — can view everything, can't create new content past free limits
- No student count limit per session — participation is never gated
- No free trial — free tier is genuinely free forever, teachers upgrade when they need more

### Claude's Discretion
- Exact Stripe webhook event handling and retry logic
- Database schema for subscription state
- Toast/notification design for payment events
- Welcome page layout and content
- Stripe Customer Portal branding configuration

</decisions>

<specifics>
## Specific Ideas

- Pro card should be visually highlighted as "Most Popular" in the 3-column layout
- Dashboard plan card should feel informational, not pushy — shows usage naturally
- Pricing toggle between Monthly/Annual should be clean and obvious
- Archive-to-free-slot flow should feel helpful, not punishing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-billing-and-subscriptions*
*Context gathered: 2026-01-31*
