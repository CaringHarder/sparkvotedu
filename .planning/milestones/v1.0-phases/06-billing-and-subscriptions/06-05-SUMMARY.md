---
phase: 06-billing-and-subscriptions
plan: 05
subsystem: api
tags: [feature-gates, server-actions, tier-limits, security, brackets, polls]

# Dependency graph
requires:
  - phase: 01-05
    provides: "TIER_LIMITS, gate functions (canAccess, canCreateBracket, canUseBracketType, canUseEntrantCount, canUsePollType, canUsePollOptionCount)"
  - phase: 06-02
    provides: "Billing DAL with subscription tier on Teacher model"
provides:
  - "Server-side feature gating enforced in all bracket and poll creation/update actions"
  - "TIER_LIMITS analytics split into basicAnalytics (all tiers) and csvExport (pro+)"
  - "canCreateLiveBracket() and canCreateDraftBracket() gate functions"
  - "getTeacherBracketCounts() and getTeacherPollCount() DAL helpers"
affects: ["07-advanced-features", "09-analytics-and-reporting"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate-before-mutation pattern: all server actions check tier limits before DB writes"
    - "Count DAL helpers with Promise.all for parallel count queries"

key-files:
  created: []
  modified:
    - "src/lib/gates/tiers.ts"
    - "src/lib/gates/features.ts"
    - "src/lib/gates/__tests__/features.test.ts"
    - "src/actions/bracket.ts"
    - "src/actions/poll.ts"
    - "src/lib/dal/bracket.ts"
    - "src/lib/dal/poll.ts"

key-decisions:
  - "Split analytics into basicAnalytics (true for all tiers) and csvExport (false for free, true for pro/pro_plus) to reconcile BILL-01 and BILL-02"
  - "Bracket type gate uses safe fallback to single_elimination since schema does not yet include bracketType field"
  - "New brackets always created as draft, so createBracket checks draft limit; updateBracketStatus checks live limit on activation"

patterns-established:
  - "Gate-before-mutation: gate checks in server actions execute before any prisma call, return { error } for UI display"
  - "Count query helpers: getTeacherBracketCounts returns { live, draft, total } via parallel prisma.count calls"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 6 Plan 5: Server-Side Feature Gating Summary

**Server-side tier enforcement wired into bracket/poll actions with analytics split and live/draft bracket count gates**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-01T14:42:08Z
- **Completed:** 2026-02-01T14:53:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- TIER_LIMITS analytics field reconciled: split into basicAnalytics (true for all tiers, covering participation counts and vote distribution) and csvExport (free=false, pro/pro_plus=true)
- New canCreateLiveBracket() and canCreateDraftBracket() gate functions enforce per-tier live (free=2, pro=10, pro_plus=unlimited) and draft (free=2, pro=15, pro_plus=unlimited) bracket limits
- Bracket creation action checks 5 gates: total count, draft count, bracket type, entrant count, plus live count on activation
- Poll creation/update actions check poll type and option count server-side
- All gate checks happen before database mutations, preventing bypass via curl/devtools

## Task Commits

Each task was committed atomically:

1. **Task 1: Update TIER_LIMITS and add live/draft bracket gate functions** - `8624ccd` (feat)
2. **Task 2: Wire gate checks into bracket and poll server actions** - `a0afb74` (feat)

## Files Created/Modified
- `src/lib/gates/tiers.ts` - TIER_LIMITS with basicAnalytics/csvExport replacing analytics
- `src/lib/gates/features.ts` - Added canCreateLiveBracket(), canCreateDraftBracket() gate functions
- `src/lib/gates/__tests__/features.test.ts` - Updated tests for analytics split, added 20 new tests for live/draft gates
- `src/actions/bracket.ts` - Wired 5 gate checks into createBracket, live limit check into updateBracketStatus
- `src/actions/poll.ts` - Wired poll type check into updatePoll action
- `src/lib/dal/bracket.ts` - Added getTeacherBracketCounts() helper
- `src/lib/dal/poll.ts` - Added getTeacherPollCount() helper

## Decisions Made
- Split `analytics` boolean into `basicAnalytics` (true for all tiers) and `csvExport` (false for free) -- reconciles BILL-01 requirement that free tier gets "basic analytics" with BILL-02 requirement that pro gets "full analytics + CSV export"
- Bracket type gate uses safe fallback to `'single_elimination'` since createBracketSchema does not yet include a bracketType field (database default handles it). When multi-type bracket creation UI is added, the schema will be extended and the gate will automatically enforce
- New brackets always created as `draft` status, so createBracket checks the draft bracket limit. The live bracket limit is checked separately in updateBracketStatus when transitioning draft -> active, preventing the bypass of activating through the draft path
- Poll creation already had gate checks from Phase 5 (canUsePollType, canUsePollOptionCount); this plan added the poll type check to updatePoll for type changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript error on `bracketData.bracketType` -- the createBracketSchema does not include bracketType field (it's a DB default). Resolved by using safe type cast with fallback to 'single_elimination'.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All server-side feature gating complete -- free tier cannot bypass limits via direct action calls
- Phase 6 billing infrastructure fully complete (Stripe webhooks, checkout/portal, pricing UI, billing dashboard, feature gates)
- Ready for Phase 7 (Advanced Features) which builds on these tier restrictions

---
*Phase: 06-billing-and-subscriptions*
*Completed: 2026-02-01*
