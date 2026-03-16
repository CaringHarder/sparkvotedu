---
phase: quick-40
plan: 1
subsystem: database, ui
tags: [prisma, ncaa, bracket, sports, seed]

requires:
  - phase: quick-39
    provides: "ESPN provider for NCAA tournament data with team seeds"
provides:
  - "tournamentSeed column on BracketEntrant for real NCAA seed display"
  - "Seed-based R1 matchup position ordering matching standard NCAA bracket layout"
  - "Tournament seed prefix display in bracket matchup boxes"
affects: [sports-brackets, bracket-rendering]

tech-stack:
  added: []
  patterns: ["Seed-based position mapping for NCAA bracket ordering"]

key-files:
  created:
    - prisma/migrations/20260316201500_add_tournament_seed/migration.sql
  modified:
    - prisma/schema.prisma
    - src/lib/dal/sports.ts
    - src/lib/bracket/types.ts
    - src/components/bracket/sports-matchup-box.tsx
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
    - src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
    - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
    - src/app/api/brackets/[bracketId]/state/route.ts
    - src/hooks/use-prediction-cascade.ts

key-decisions:
  - "Use SEED_TO_R1_POSITION map with regionIndex*8 offset for globally unique R1 positions"
  - "Display seed as plain number prefix (e.g., '1 Duke') not parenthesized"

requirements-completed: [SEED-DISPLAY, MATCHUP-ORDER]

duration: 5min
completed: 2026-03-16
---

# Quick Task 40: Fix NCAA Bracket Matchup Ordering Summary

**NCAA R1 matchups ordered by standard seeding (1v16, 8v9, 5v12...) with tournament seed display prefix**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T20:15:10Z
- **Completed:** 2026-03-16T20:20:28Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added tournamentSeed column to BracketEntrant with Prisma migration
- R1 matchup positions now follow standard NCAA bracket order within each region
- Tournament seeds (1-16) display as prefix next to team names in bracket boxes
- All serialization paths updated (teacher detail, live, student, API state)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tournamentSeed column and update types + serialization** - `f51437b` (feat)
2. **Task 2: Fix DAL matchup ordering and set tournamentSeed on entrant creation** - `13e9b49` (feat)
3. **Task 3: Display tournamentSeed in SportsEntrantRow** - `9d87822` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added tournamentSeed Int? column to BracketEntrant
- `prisma/migrations/20260316201500_add_tournament_seed/migration.sql` - Migration SQL
- `src/lib/dal/sports.ts` - SEED_TO_R1_POSITION map, region-based position assignment, tournamentSeed storage
- `src/lib/bracket/types.ts` - Added tournamentSeed to BracketEntrantData interface
- `src/components/bracket/sports-matchup-box.tsx` - Seed prefix display in SportsEntrantRow
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - tournamentSeed serialization
- `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` - tournamentSeed serialization
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` - tournamentSeed in BracketStateResponse type and serialization
- `src/app/api/brackets/[bracketId]/state/route.ts` - tournamentSeed in Prisma select queries
- `src/hooks/use-prediction-cascade.ts` - tournamentSeed in speculative entrant creation

## Decisions Made
- Used `regionIndex * 8 + seedPosition` for globally unique R1 positions across 4 regions
- Display seed as plain number prefix ("1 Duke") rather than parenthesized ("(1) Duke")
- Reduced maxChars by 2 in SportsEntrantRow to accommodate seed prefix space

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated student bracket page, API state route, and prediction cascade hook**
- **Found during:** Task 1 (serialization)
- **Issue:** Plan only mentioned teacher detail and live pages, but student page, API state route, and prediction cascade hook also serialize BracketEntrantData
- **Fix:** Added tournamentSeed to BracketStateResponse type, API select queries, and prediction cascade speculative entrant
- **Files modified:** src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx, src/app/api/brackets/[bracketId]/state/route.ts, src/hooks/use-prediction-cascade.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** f51437b (Task 1 commit)

**2. [Rule 3 - Blocking] Regenerated Prisma client after schema change**
- **Found during:** Task 1 (verification)
- **Issue:** TypeScript errors because Prisma client didn't know about tournamentSeed field
- **Fix:** Ran `npx prisma generate` to regenerate client
- **Committed in:** f51437b (Task 1 commit)

**3. [Rule 3 - Blocking] Used db push instead of migrate dev due to shadow database error**
- **Found during:** Task 1 (migration)
- **Issue:** `prisma migrate dev` failed due to shadow database RLS migration conflict
- **Fix:** Used `prisma db push` to apply schema change, created migration file manually for record-keeping
- **Committed in:** f51437b (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Existing brackets need re-import to get correct ordering and seed data
- Future bracket creation will automatically have correct ordering and seeds

---
*Quick Task: 40*
*Completed: 2026-03-16*
