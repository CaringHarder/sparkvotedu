---
phase: quick-39
plan: 01
subsystem: api
tags: [espn, ncaa, sports, provider, basketball]

requires:
  - phase: sports-bracket-infrastructure
    provides: SportsDataProvider interface, DAL, tournament browser
provides:
  - ESPN provider for NCAA tournament data (men's and women's)
  - Free API alternative to SportsDataIO (no key required)
  - Dynamic provider factory with env-var switching
affects: [sports-bracket, tournament-import, live-scores]

tech-stack:
  added: []
  patterns: [provider-factory-with-env-switching, date-range-scoreboard-queries]

key-files:
  created:
    - src/lib/sports/espn/types.ts
    - src/lib/sports/espn/client.ts
    - src/lib/sports/espn/mappers.ts
    - src/lib/sports/espn/provider.ts
  modified:
    - src/lib/sports/provider.ts
    - src/lib/dal/sports.ts

key-decisions:
  - "ESPN as default provider -- free, no API key, real production data"
  - "Tournament IDs use espn-mens-ncaat / espn-womens-ncaat convention"
  - "150ms delay between date requests to respect ESPN rate limits"
  - "Seed 99 from ESPN treated as null (TBD placeholder)"

patterns-established:
  - "Provider switching via SPORTS_PROVIDER env var with ESPN default"
  - "Date-range scoreboard queries with deduplication for tournament data"

requirements-completed: [ESPN-PROVIDER]

duration: 3min
completed: 2026-03-16
---

# Quick Task 39: Build ESPN Provider Summary

**ESPN NCAA tournament provider with free public API, covering both men's and women's brackets with full round/region/seed mapping**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T18:02:52Z
- **Completed:** 2026-03-16T18:05:49Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Complete ESPN provider implementing all 5 SportsDataProvider methods (getActiveTournaments, getTournamentGames, getGamesByDate, getGameById, areGamesInProgress)
- Provider factory defaults to ESPN with no configuration -- SportsDataIO available via SPORTS_PROVIDER=sportsdataio
- DAL dataSource dynamically reflects active provider instead of hardcoded 'sportsdataio'
- Verified against live ESPN API: 16 men's R1 games and 16 women's R1 games returned with correct seeds, regions, and status
- Full project compiles clean and Next.js build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ESPN types, client, and mappers** - `4bf8d55` (feat)
2. **Task 2: Create ESPN provider, update factory, fix DAL** - `06badac` (feat)
3. **Task 3: Smoke test and verify end-to-end** - verification only, no code changes

## Files Created/Modified
- `src/lib/sports/espn/types.ts` - Raw ESPN API response types matching live endpoint shape
- `src/lib/sports/espn/client.ts` - HTTP client with date-based scoreboard queries and rate limiting
- `src/lib/sports/espn/mappers.ts` - Pure mappers for status, round, region, teams, games, tournaments
- `src/lib/sports/espn/provider.ts` - ESPNProvider implementing SportsDataProvider interface
- `src/lib/sports/provider.ts` - Updated factory defaulting to ESPN, added getProviderName() export
- `src/lib/dal/sports.ts` - Dynamic dataSource using getProviderName()

## Decisions Made
- Used ESPN's free public scoreboard API (no auth needed) instead of requiring paid SportsDataIO
- Tournament IDs follow `espn-mens-ncaat` / `espn-womens-ncaat` convention to avoid collision with SportsDataIO numeric IDs
- Date range March 17 - April 8 covers full tournament window; empty dates return no events (no cost)
- Seed 99 from ESPN (TBD teams) normalized to null
- 150ms delay between date requests for rate limit respect
- Conference field left empty (ESPN scoreboard doesn't include it) -- not needed for bracket display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - ESPN provider requires no API key or configuration. It works out of the box.

## Next Steps
- Teachers can immediately import real NCAA brackets via the existing tournament browser UI
- Live score polling (quick task 38) works automatically with the ESPN provider
- SportsDataIO remains available as fallback via SPORTS_PROVIDER=sportsdataio

---
*Quick Task: 39-build-espn-provider*
*Completed: 2026-03-16*
