---
phase: 08-sports-integration
plan: 01
subsystem: api, database
tags: [sportsdata-io, ncaa, rest-api, prisma, provider-pattern, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: Prisma schema, tier gating, Next.js config
  - phase: 06-billing-and-subscriptions
    provides: TIER_LIMITS with sportsIntegration flag
provides:
  - SportsDataProvider interface with 5 methods
  - SportsDataIOClient HTTP client for SportsDataIO REST API v3
  - SportsDataIOProvider concrete implementation
  - getProvider() factory function (cached singleton)
  - Pure mapper functions (mapGame, mapTeam, mapTournament, mapGameStatus)
  - Raw SportsDataIO API response types (isolated in sportsdataio/)
  - Prisma schema sports metadata fields on Bracket, Matchup, BracketEntrant
  - BracketData/MatchupData/BracketEntrantData type extensions for sports
  - 'sports' bracket type in BracketType union and pro_plus tier
  - Image domain configuration for SportsDataIO and ESPN CDN
affects: [08-02, 08-03, 08-04, sports-bracket-creation, live-score-sync]

# Tech tracking
tech-stack:
  added: [SportsDataIO REST API v3]
  patterns: [provider-abstraction, raw-type-isolation, mapper-pattern, factory-singleton]

key-files:
  created:
    - src/lib/sports/types.ts
    - src/lib/sports/provider.ts
    - src/lib/sports/sportsdataio/types.ts
    - src/lib/sports/sportsdataio/mappers.ts
    - src/lib/sports/sportsdataio/client.ts
    - src/lib/sports/sportsdataio/provider.ts
  modified:
    - prisma/schema.prisma
    - src/lib/bracket/types.ts
    - src/lib/gates/tiers.ts
    - next.config.ts
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
    - src/app/(dashboard)/brackets/[bracketId]/live/page.tsx
    - src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx
    - src/app/api/brackets/[bracketId]/state/route.ts
    - src/hooks/use-prediction-cascade.ts

key-decisions:
  - "Raw SportsDataIO types isolated in sportsdataio/ directory with pure mapper bridge -- never imported outside"
  - "Provider factory uses cached singleton (created once per process) with lazy env var read"
  - "All new Prisma fields optional/nullable -- zero migration risk for existing data"
  - "BracketEntrantData extended with externalTeamId, logoUrl, abbreviation for team logo display"
  - "MatchupData extended with externalGameId, homeScore, awayScore, gameStatus, gameStartTime for live scores"

patterns-established:
  - "Provider abstraction: SportsDataProvider interface decouples sports logic from specific API vendor"
  - "Raw type isolation: vendor API types confined to vendor subdirectory, mapped at boundary"
  - "Mapper pattern: pure functions convert vendor types to domain types (no side effects)"
  - "Nullable field extension: new optional fields on existing interfaces with null defaults at all construction sites"

# Metrics
duration: 6min
completed: 2026-02-15
---

# Phase 8 Plan 1: Sports Data Provider Foundation Summary

**SportsDataProvider abstraction with SportsDataIO implementation, NCAA basketball domain types, Prisma sports metadata fields, and image domain config**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-15T20:58:21Z
- **Completed:** 2026-02-15T21:04:24Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- SportsDataProvider interface with 5 methods covering tournament discovery, game retrieval, and live status checking
- SportsDataIOClient HTTP client with Ocp-Apim-Subscription-Key auth, gender-aware base URLs (CBB/WCBB), and Next.js revalidation caching
- Pure mapper functions bridging raw SportsDataIO PascalCase API responses to internal snake_case domain types
- Prisma schema extended with sports metadata on Bracket (tournament linkage), Matchup (game scores), and BracketEntrant (team identity)
- All 9 existing serialization sites updated with new nullable sports fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Sports domain types, provider interface, and SportsDataIO raw types + mappers** - `77e4b33` (feat)
2. **Task 2: SportsDataIO HTTP client + provider implementation + factory** - `0d24f70` (feat)
3. **Task 3: Prisma schema sports fields + type updates + tier gating + image domain config** - `72a1c03` (feat)

## Files Created/Modified
- `src/lib/sports/types.ts` - SportsTournament, SportsTeam, SportsGame domain types + SportsDataProvider interface (97 lines)
- `src/lib/sports/provider.ts` - getProvider() factory returning cached singleton
- `src/lib/sports/sportsdataio/types.ts` - Raw SportsDataIOGame, SportsDataIOTeam, SportsDataIOSeason, SportsDataIOTournament types (75 lines)
- `src/lib/sports/sportsdataio/mappers.ts` - mapGame, mapTeam, mapTournament, mapGameStatus pure functions
- `src/lib/sports/sportsdataio/client.ts` - SportsDataIOClient class with authenticated REST calls
- `src/lib/sports/sportsdataio/provider.ts` - SportsDataIOProvider implementing all 5 interface methods
- `prisma/schema.prisma` - Added externalTournamentId/dataSource/lastSyncAt/sportGender on Bracket, externalGameId/homeScore/awayScore/gameStatus/gameStartTime on Matchup, externalTeamId/logoUrl/abbreviation on BracketEntrant
- `src/lib/bracket/types.ts` - BracketData, MatchupData, BracketEntrantData extended with sports fields; 'sports' added to BracketType
- `src/lib/gates/tiers.ts` - 'sports' added to pro_plus.bracketTypes
- `next.config.ts` - remotePatterns for *.sportsdata.io and a.espncdn.com image domains
- `src/app/(dashboard)/brackets/[bracketId]/page.tsx` - Serialization updated with sports fields
- `src/app/(dashboard)/brackets/[bracketId]/live/page.tsx` - Serialization updated with sports fields
- `src/app/(student)/session/[sessionId]/bracket/[bracketId]/page.tsx` - BracketStateResponse + toBracketWithDetails updated
- `src/app/api/brackets/[bracketId]/state/route.ts` - Select includes new entrant fields, response includes matchup sports fields
- `src/hooks/use-prediction-cascade.ts` - Speculative entrant construction includes new nullable fields

## Decisions Made
- Raw SportsDataIO types isolated in sportsdataio/ directory with pure mapper bridge -- raw types never imported outside the vendor directory
- Provider factory uses cached singleton (created once per process lifetime) with lazy env var read on first call
- All new Prisma fields are optional/nullable -- zero migration risk for existing brackets, matchups, and entrants
- SportsDataIOClient uses Ocp-Apim-Subscription-Key header authentication (SportsDataIO standard)
- Date format conversion (YYYY-MM-DD to YYYY-MMM-DD) handled internally in provider
- Both men's and women's NCAA basketball supported via gender parameter on all client methods
- Game winner derived from scores at mapping layer (when game is closed and scores differ)
- Tournament status derived from game statuses: any in_progress -> active, all final -> completed, else upcoming

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated all serialization sites with new nullable fields**
- **Found during:** Task 3 (Type updates)
- **Issue:** Plan mentioned checking "at minimum" bracket.ts DAL, state API route, and activities API route, but TypeScript compiler revealed 6 additional sites that construct BracketData/MatchupData/BracketEntrantData objects
- **Fix:** Updated all 9 construction sites (detail page, live page, student page, state API, prediction cascade hook) with new nullable sports fields defaulting to null
- **Files modified:** 5 additional files beyond what plan specified
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 72a1c03 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for TypeScript compilation. All construction sites needed the new nullable fields to satisfy the extended interfaces.

## Issues Encountered
- Prisma client needed regeneration (`npx prisma generate`) after schema changes before the select fields on the state route would be recognized -- standard Prisma workflow, resolved immediately.

## User Setup Required

**External services require manual configuration:**
- **SPORTSDATAIO_API_KEY**: Sign up at https://sportsdata.io/free-trial, get API key from Dashboard -> API Keys, add to `.env.local`

## Next Phase Readiness
- Provider abstraction complete and ready for 08-02 (sports bracket creation flow)
- Schema supports sports metadata without breaking any existing features
- All TypeScript compiles cleanly with `npx tsc --noEmit`
- Image domains configured for team logos

---
*Phase: 08-sports-integration*
*Completed: 2026-02-15*
