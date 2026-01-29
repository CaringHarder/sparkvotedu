---
phase: 01-foundation-and-auth
plan: 05
subsystem: auth
tags: [feature-gating, subscription-tiers, pure-functions, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 project scaffold with TypeScript and package.json
provides:
  - TIER_LIMITS constant defining Free/Pro/Pro Plus feature boundaries
  - canAccess() pure function for boolean feature gating
  - canCreateBracket() pure function for bracket count enforcement
  - canUseBracketType() pure function for bracket type gating
  - canUseEntrantCount() pure function for entrant limit enforcement
  - Vitest test infrastructure configured for the project
affects: [brackets, polls, analytics, sports-integration, billing, student-experience]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [pure-function-gates, smart-upgrade-target, tier-limit-constants]

key-files:
  created:
    - src/lib/gates/tiers.ts
    - src/lib/gates/features.ts
    - src/lib/gates/__tests__/features.test.ts
    - vitest.config.ts
  modified:
    - package.json

key-decisions:
  - "Pure functions over middleware: gate functions take tier as input, caller handles DB lookup"
  - "Smart upgradeTarget: skips intermediate tiers when feature requires higher tier (free->pro_plus for sportsIntegration)"
  - "Vitest over Jest: ESM-native, lighter weight, matches project type:module"
  - "as const on TIER_LIMITS for TypeScript literal type inference"

patterns-established:
  - "Feature gate pattern: pure function(tier, context) -> AccessResult{allowed, reason, upgradeTarget}"
  - "Tier escalation: TIER_ORDER array enables minimum-tier lookups"
  - "Test organization: __tests__/ co-located with source, descriptive spec-style names"

# Metrics
duration: 43min
completed: 2026-01-29
---

# Phase 1 Plan 5: Feature Gating Summary

**Pure-function subscription gates (canAccess, canCreateBracket, canUseBracketType, canUseEntrantCount) with TIER_LIMITS for Free/Pro/Pro Plus and 40 unit tests via Vitest**

## Performance

- **Duration:** 43 min
- **Started:** 2026-01-29T15:02:34Z
- **Completed:** 2026-01-29T15:45:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TIER_LIMITS constant defining complete feature boundaries for Free, Pro ($12/mo), and Pro Plus ($20/mo) subscription tiers
- Four pure gate functions (canAccess, canCreateBracket, canUseBracketType, canUseEntrantCount) with smart upgradeTarget selection
- Vitest configured as project test runner with path alias support
- 40 comprehensive unit tests covering all tiers, boundary conditions, and upgrade target intelligence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tier definitions and feature gate functions** - `f3a0e96` (feat)
2. **Task 2: Write unit tests for feature gate functions** - `b72bfe5` (test)

## Files Created/Modified
- `src/lib/gates/tiers.ts` - SubscriptionTier type and TIER_LIMITS constant with Free/Pro/Pro Plus definitions
- `src/lib/gates/features.ts` - canAccess(), canCreateBracket(), canUseBracketType(), canUseEntrantCount() pure functions
- `src/lib/gates/__tests__/features.test.ts` - 40 unit tests covering all gate functions across all tiers
- `vitest.config.ts` - Vitest configuration with path alias support matching tsconfig
- `package.json` - Added test and test:watch scripts, vitest devDependency

## Decisions Made
- **Pure functions over middleware:** Gate functions take tier as input parameter; the caller is responsible for looking up the teacher's tier from the database. This keeps gates testable, synchronous, and free of side effects.
- **Smart upgradeTarget:** When a feature is not available on 'pro' (e.g., sportsIntegration), even a 'free' user's upgradeTarget points to 'pro_plus', skipping the intermediate tier. This prevents users from upgrading to pro only to find the feature still missing.
- **Vitest over Jest:** Chosen for ESM-native support matching the project's `"type": "module"`, lighter footprint, and faster execution (40 tests in 2ms).
- **`as const` on TIER_LIMITS:** Enables TypeScript literal type inference so FeatureKey is derived from the actual object keys, keeping types and values in sync.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Feature gating foundation is complete and ready for use by all subsequent phases
- Every feature that needs tier enforcement (brackets, polls, analytics, sports) can import and call these pure functions
- Test infrastructure (Vitest) is configured and ready for all future test files
- Pattern established: `canAccess(tier, feature)` returns `{ allowed, reason, upgradeTarget }` -- consistent API for all gate checks

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-01-29*
