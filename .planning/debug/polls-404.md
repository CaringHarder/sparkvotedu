---
status: resolved
trigger: "Polls sidebar link goes to 404"
created: 2026-01-31T23:00:00Z
updated: 2026-01-31T23:00:00Z
---

## Current Focus

hypothesis: Missing /polls index page
test: Complete
expecting: Diagnosis complete
next_action: Report findings

## Symptoms

expected: Clicking "Polls" sub-item in sidebar should show a polls list page
actual: Clicking "Polls" sub-item shows 404 page
errors: Next.js 404 - page not found
reproduction: Navigate to /polls from sidebar or directly
started: Since polls feature was added

## Eliminated

N/A - Root cause identified immediately

## Evidence

- timestamp: 2026-01-31T23:00:00Z
  checked: src/components/dashboard/sidebar-nav.tsx line 38
  found: Polls sub-item links to href="/polls"
  implication: Sidebar expects a /polls route to exist

- timestamp: 2026-01-31T23:00:00Z
  checked: src/app/(dashboard)/polls/ directory structure
  found: Only these pages exist:
    - /polls/new/page.tsx
    - /polls/[pollId]/page.tsx
    - /polls/[pollId]/live/page.tsx
  implication: No /polls/page.tsx (index page)

- timestamp: 2026-01-31T23:00:00Z
  checked: src/app/(dashboard)/activities/page.tsx
  found: Activities page shows combined list of all brackets AND polls
  implication: Activities page already serves as the unified list view

## Resolution

root_cause: Missing /polls/page.tsx - the sidebar links to /polls but no index page exists at that route. Next.js App Router requires an explicit page.tsx file for each route.

fix: Two valid approaches:
1. **Redirect approach (recommended):** Create /polls/page.tsx that redirects to /activities (since that's the unified list)
2. **Update link approach:** Change sidebar link from /polls to /activities (but this loses semantic URL structure)

verification: N/A - diagnosis only

files_changed: []

## Recommendation

**Recommended fix:** Create src/app/(dashboard)/polls/page.tsx with a redirect to /activities

**Reasoning:**
- The /activities page (from 05-06) already shows all polls in a unified list with brackets
- This maintains the /polls URL structure for semantic clarity
- Users clicking "Polls" will land on the activities page (which includes polls)
- Alternatively, if polls should have their own dedicated list view separate from brackets, a full polls list page should be created instead of redirecting

**Alternative consideration:**
If the UX intention is for "Polls" to show ONLY polls (not combined with brackets), then /polls/page.tsx should be implemented as a polls-only list page, similar to how /activities works but filtered to polls only.
