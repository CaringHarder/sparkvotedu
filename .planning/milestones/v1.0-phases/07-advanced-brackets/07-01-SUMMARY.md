---
phase: 07-advanced-brackets
plan: 01
subsystem: database, api
tags: [prisma, zod, typescript, schema, bracket-types, predictions, round-robin, double-elimination]

# Dependency graph
requires:
  - phase: 03-bracket-creation-management
    provides: "Bracket, Matchup, BracketEntrant Prisma models and TypeScript types"
  - phase: 06-billing-and-subscriptions
    provides: "Feature gating with canUseBracketType for tier-based bracket type access"
provides:
  - "Prediction Prisma model with @@unique([bracketId, participantId, matchupId])"
  - "Bracket model extended with 8 optional Phase 7 fields"
  - "Matchup model extended with bracketRegion, isBye, roundRobinRound"
  - "BracketType, BracketRegion, PredictionStatus, RoundRobinRound TypeScript types"
  - "PredictionData, PredictionScore, DoubleElimMatchups, MatchupSeedWithBye interfaces"
  - "bracketSizeSchema (3-128 range), bracketTypeSchema, prediction/round-robin Zod schemas"
affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10, 07-11, 07-12, 07-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional fields with defaults for backwards-compatible schema evolution"
    - "BracketSize widened from literal union to number; validation moved to Zod layer"

key-files:
  created: []
  modified:
    - "prisma/schema.prisma"
    - "src/lib/bracket/types.ts"
    - "src/lib/utils/validation.ts"
    - "src/app/(dashboard)/brackets/[bracketId]/page.tsx"
    - "src/app/(dashboard)/brackets/[bracketId]/live/page.tsx"
    - "src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx"

key-decisions:
  - "BracketSize widened to number type alias (not removed) for backwards compatibility with bracket-form.tsx imports"
  - "All new Bracket/Matchup fields optional or have defaults to preserve existing single-elimination data"
  - "bracketTypeSchema uses Zod .default('single_elimination') so existing create flows work unchanged"
  - "updateEntrantsSchema min lowered from 4 to 3 to match bracketSizeSchema.min(3)"

patterns-established:
  - "Schema evolution pattern: optional fields + defaults for non-breaking additions"
  - "Type widening pattern: widen type alias, move constraints to Zod validation layer"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 7 Plan 01: Schema Evolution Summary

**Prisma Prediction model, Bracket/Matchup extensions for all bracket types, widened BracketSize to 3-128, bracketType discriminator in Zod validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01T17:32:27Z
- **Completed:** 2026-02-01T17:36:21Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Prediction model added to Prisma schema with composite unique constraint and cascade deletes
- Bracket model extended with 8 new fields for round-robin, predictive, and double-elimination config
- Matchup model extended with bracketRegion, isBye, roundRobinRound for multi-format support
- TypeScript types expanded with 15+ new type definitions covering all Phase 7 bracket formats
- Zod validation updated to accept 3-128 entrants and all bracket types with sensible defaults
- All existing bracket functionality preserved -- 50 tests pass, no type errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with Phase 7 models and fields** - `cf86b3a` (feat)
2. **Task 2: Extend TypeScript types for all bracket types** - `74161c7` (feat)
3. **Task 3: Update Zod validation schemas for expanded bracket support** - `0f23026` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Prediction model, Bracket extensions (8 fields), Matchup extensions (3 fields), relation wiring
- `src/lib/bracket/types.ts` - BracketType, BracketRegion, RoundRobinRound, PredictionData, PredictionScore, DoubleElimMatchups, MatchupSeedWithBye
- `src/lib/utils/validation.ts` - bracketSizeSchema (3-128), bracketTypeSchema, createBracketSchema extended, prediction/round-robin schemas
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - Add new fields to bracket and matchup serialization
- `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` - Add new fields to bracket and matchup serialization
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` - Add new fields to toBracketWithDetails helper

## Decisions Made
- BracketSize widened to `number` type alias (not removed) to avoid breaking bracket-form.tsx imports
- All new Bracket/Matchup fields are optional or have defaults -- zero migration risk for existing data
- `bracketTypeSchema` uses `.default('single_elimination')` so existing create flow needs no changes
- `updateEntrantsSchema` min lowered from 4 to 3 to match bracketSizeSchema minimum

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed BracketData/MatchupData serialization in 3 page components**
- **Found during:** Task 2 (TypeScript types extension)
- **Issue:** Adding new required fields to BracketData and MatchupData interfaces caused type errors in bracket detail page, live dashboard page, and student bracket page where objects were serialized without the new fields
- **Fix:** Added the new Phase 7 fields to all serialization points: bracket detail (predictionStatus, roundRobinPacing, etc.), live page, and student toBracketWithDetails helper with sensible defaults (null/false)
- **Files modified:** 3 page components (bracket detail, live, student bracket)
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `74161c7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to maintain type safety. No scope creep -- these serialization points are the direct consumers of the extended types.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation ready for all subsequent Phase 7 plans
- Types ready for bracket engine modules (double-elim, round-robin, predictive, byes)
- Validation schemas ready for new server actions
- Existing functionality verified intact (50 tests pass, zero type errors)

---
*Phase: 07-advanced-brackets*
*Completed: 2026-02-01*
