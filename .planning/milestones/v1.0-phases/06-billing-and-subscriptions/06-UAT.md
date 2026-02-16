---
status: passed
phase: 06-billing-and-subscriptions
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-02-01T16:00:00Z
updated: 2026-02-01T16:00:00Z
round: 1
note: Initial UAT for Phase 6 Billing & Subscriptions
---

## Current Test

[testing complete]

## Tests

### 1. Public Pricing Page Loads Without Auth
expected: Open an incognito/private browser window (no login). Navigate to http://localhost:3001/pricing. The page should load without redirecting to login. You should see 3 pricing cards (Free, Pro at $12/mo, Pro Plus at $20/mo), a Monthly/Annual toggle, and "Get Started" buttons.
result: pass

### 2. Monthly/Annual Toggle Updates Prices
expected: On the /pricing page, click the "Annual" toggle. The Pro card should show an annual price (~$115/yr or similar with ~20% savings) and the Pro Plus card should show its annual price. A "Save ~20%" badge should appear on the Annual option. Toggling back to Monthly should restore the monthly prices.
result: pass

### 3. In-App Billing Page Shows Current Plan
expected: Log in as a teacher (free tier). Navigate to /billing (or click "Billing" in the sidebar). The page should show your current plan as "Free" with a plan badge, usage metrics showing "X of 2 live brackets" and "X of 2 draft brackets" with progress bars, and pricing cards below for upgrading.
result: pass
reported: "Free badge is light gray, not colored — this is by design (neutral for free, color for paid tiers)"

### 4. Sidebar Shows Billing Link
expected: While logged in as a teacher, look at the left sidebar navigation. There should be a "Billing" link with a credit card icon. Clicking it should navigate to /billing.
result: pass

### 5. Dashboard Shows Plan Badge
expected: Navigate to the teacher dashboard (home page after login). The dashboard should show your current plan (e.g., "Free") as a colored badge somewhere visible, and a "Plan & Usage" card showing bracket counts against your tier limits.
result: pass

### 6. Upgrade Prompt on Locked Features
expected: As a free tier teacher, navigate to the bracket creation page. If there are any Pro/Pro Plus features visible (like double-elimination bracket type), they should show a small lock icon. Hovering over the lock should display a tooltip suggesting an upgrade (e.g., "Upgrade to Pro Plus to unlock").
result: skip
reported: "Advanced bracket types not yet surfaced in UI (Phase 7). UpgradePrompt component exists but no UI triggers it yet."

### 7. Free Tier Bracket Limit Enforcement
expected: As a free tier teacher, create 2 brackets and set them both to "active" (live). Then try to create and activate a 3rd bracket. You should see an error message indicating the live bracket limit has been reached (2 max for free tier). The 3rd bracket should NOT be activated.
result: pass

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1
skipped: 1
