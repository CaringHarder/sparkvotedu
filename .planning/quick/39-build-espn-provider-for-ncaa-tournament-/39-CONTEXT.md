# Quick Task 39: Build ESPN Provider for NCAA Tournament Data - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Task Boundary

Build an ESPN provider (ESPNProvider) behind the existing SportsDataProvider interface using ESPN's free hidden scoreboard API. Support both men's and women's NCAA tournaments with real data. ESPN becomes the default provider, replacing SportsDataIO. Update the full end-to-end flow so teachers can import ESPN-sourced brackets immediately.

</domain>

<decisions>
## Implementation Decisions

### Provider Strategy
- ESPN replaces SportsDataIO as the **default provider**
- SportsDataIO code remains but is dormant unless switched back via env var
- Provider factory (`getProvider()`) defaults to ESPN

### Bracket Structure
- **Auto-build from games**: Query ESPN scoreboard for tournament games, extract teams/seeds/regions, and auto-wire the bracket topology using the standard NCAA bracket structure
- No static JSON template needed — derive structure from game data + standard NCAA format
- The 68-team bracket topology is the same every year (4 regions × 16 seeds + 4 First Four play-in games)

### Scope
- **Full end-to-end**: Build ESPN provider + update provider factory + update tournament browser + import flow
- Teachers should be able to import ESPN-sourced brackets today

### Claude's Discretion
- ESPN API response parsing and field mapping details
- Error handling for ESPN's undocumented rate limits
- How to handle ESPN's game-by-game data vs SportsDataIO's bulk tournament endpoint

</decisions>

<specifics>
## Specific Ideas

### ESPN API Endpoints (confirmed working)
- Scoreboard: `site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100`
- Women's: `site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=100`
- `groups=100` filters to NCAA Tournament games only
- Key fields: curatedRank.current (seed), notes (region/round info), competitors, score, status

### Key Differences from SportsDataIO
- No bulk tournament endpoint — must query scoreboard by date or current day
- No explicit bracket wiring (previousGameId) — must infer from region/round/seed
- Seeds in `curatedRank.current` field, not dedicated seed field
- No API key needed (fully open)
- Real production data (not scrambled like SportsDataIO trial)

</specifics>
