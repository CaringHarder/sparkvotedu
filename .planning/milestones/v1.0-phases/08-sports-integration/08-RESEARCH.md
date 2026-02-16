# Phase 8: Sports Integration - Research

**Researched:** 2026-02-15
**Domain:** External sports data API integration, NCAA tournament bracket import, live score polling
**Confidence:** MEDIUM (API specifics verified via official docs + project analysis; pricing and some endpoint details require trial account validation)

## Summary

Phase 8 connects SparkVotEDU to live NCAA March Madness data via the SportsDataIO API, allowing teachers to import real tournament brackets as predictive brackets and auto-update results from live game data. The existing predictive bracket infrastructure from Phase 7/7.1 is the natural foundation -- a sports bracket IS a predictive bracket where results come from an external API instead of student votes or teacher manual entry.

The core architecture pattern is a **provider abstraction layer** -- a TypeScript interface defining operations (list tournaments, get bracket, get live scores, get game results) with SportsDataIO as the initial implementation. This abstraction enables future providers (ESPN, Sportradar, etc.) without touching consumer code. The data flow is: SportsDataIO API -> provider adapter -> internal bracket/matchup models -> existing bracket DAL + realtime broadcast.

**Primary recommendation:** Build an abstracted `SportsDataProvider` interface in `src/lib/sports/`, implement `SportsDataIOProvider` against it, create a Vercel cron job API route for periodic score polling during active tournaments, and extend the existing Bracket model with sports-specific metadata fields (external tournament ID, external game IDs per matchup, data source, last sync timestamp).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Sport & league scope**: NCAA March Madness only -- men's AND women's tournaments. Active season only (March-April), no historical bracket browsing. No pro leagues at launch.
- **Data provider strategy**: Abstracted data layer with TypeScript interface. SportsDataIO as initial provider. Provider interface covers: tournament listing, bracket/seeding data, live scores, game results, team metadata (name, logo).
- **Data freshness & updates**: Auto-update with manual override. Teacher can manually override any result. Polling interval and caching strategy: Claude's discretion.
- **Team logos**: Primary source: SportsDataIO API logo URLs (TeamLogoUrl field). Fallback: ESPN's public CDN for team logos.

### Claude's Discretion

- Bracket diagram approach: reuse existing BracketDiagram SVG or create sports-themed variant
- Game status display: whether to show LIVE/FINAL/upcoming badges on matchups
- Polling/caching architecture for live score updates
- How to handle the 68-team tournament format (play-in/First Four games) within existing bracket structures

### Deferred Ideas (OUT OF SCOPE)

- Pro league support (NBA, NFL, NHL, MLB) -- future phase
- Historical tournament browsing -- future enhancement
- Player stats and play-by-play data
- Odds/betting data display

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SportsDataIO REST API | v3 | NCAA Men's & Women's Basketball data | User-locked decision; free perpetual trial for dev, unlimited API calls on paid plans, dedicated tournament bracket endpoints |
| Next.js API Routes | 16.x (existing) | Cron job endpoints for score polling, API proxy for client-side data | Already in project stack; Vercel cron integration is native |
| Prisma | 7.x (existing) | Schema extension for sports metadata on Bracket/Matchup models | Already in project stack |
| Zod | 4.x (existing) | Validation for API responses and input schemas | Already in project stack |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel Cron Jobs | N/A (config) | Scheduled score polling during tournament | Production deployment; `vercel.json` cron config |
| next/image | 16.x (existing) | Team logo rendering with optimization | Displaying SportsDataIO/ESPN team logos |

### No New Dependencies Required

This phase requires **zero new npm packages**. Everything is built on:
- Native `fetch()` for SportsDataIO API calls (server-side)
- Existing Prisma for database operations
- Existing Supabase Realtime for broadcasting updates
- Existing bracket components for rendering
- Vercel cron configuration (no library needed)

**Installation:**
```bash
# No new packages -- only schema changes and vercel.json config
npx prisma migrate dev --name add-sports-integration-fields
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── sports/
│       ├── types.ts                    # SportsDataProvider interface + shared types
│       ├── provider.ts                 # getProvider() factory + provider registry
│       ├── sportsdataio/
│       │   ├── client.ts              # SportsDataIO HTTP client (auth, base URL, error handling)
│       │   ├── provider.ts            # SportsDataIOProvider implements SportsDataProvider
│       │   ├── types.ts               # Raw SportsDataIO API response types
│       │   └── mappers.ts            # Map SportsDataIO responses -> internal types
│       └── logo-resolver.ts           # Logo URL resolution: SportsDataIO -> ESPN CDN fallback
├── actions/
│   └── sports.ts                      # Server actions: importTournament, syncResults, overrideResult
├── app/
│   └── api/
│       └── cron/
│           └── sports-sync/
│               └── route.ts           # Vercel cron endpoint for periodic score sync
└── components/
    └── bracket/
        ├── tournament-browser.tsx     # Browse available NCAA tournaments
        ├── sports-matchup-box.tsx     # Enhanced matchup box with logos + score + status badge
        └── sports-bracket-detail.tsx  # Sports bracket view with auto-update indicator
```

### Pattern 1: Provider Abstraction

**What:** A TypeScript interface that all sports data providers must implement, with a factory function to resolve the active provider.

**When to use:** Always. Every sports data operation goes through this interface.

**Example:**
```typescript
// src/lib/sports/types.ts

export interface SportsTournament {
  externalId: string              // SportsDataIO TournamentID
  name: string                    // "NCAA Men's Basketball Tournament"
  season: number                  // 2026
  gender: 'mens' | 'womens'
  startDate: string               // ISO date
  endDate: string                 // ISO date
  teamCount: number               // 68
  status: 'upcoming' | 'active' | 'completed'
}

export interface SportsTeam {
  externalId: number              // SportsDataIO TeamID
  name: string                    // "Duke Blue Devils"
  shortName: string               // "Duke"
  abbreviation: string            // "DUKE"
  logoUrl: string | null          // Primary logo URL
  conference: string              // "ACC"
  seed: number | null             // Tournament seed (1-16)
  region: string | null           // "East", "West", "South", "Midwest"
}

export interface SportsGame {
  externalId: number              // SportsDataIO GameID
  tournamentId: string
  round: number                   // 1-6 (64, 32, Sweet 16, Elite 8, Final Four, Championship)
  bracket: string | null          // "East", "West", etc.
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled'
  homeTeam: SportsTeam
  awayTeam: SportsTeam
  homeScore: number | null
  awayScore: number | null
  startTime: string               // ISO datetime
  isClosed: boolean               // Final score verified
  period: string | null           // "1", "2", "Half", "OT", null
  timeRemaining: string | null    // "15:30" or null
  winnerId: number | null         // Winning team's externalId
  displayOrder: number            // TournamentDisplayOrder for bracket rendering
  previousHomeGameId: number | null
  previousAwayGameId: number | null
}

export interface SportsDataProvider {
  /** List available tournaments for the current season */
  getActiveTournaments(): Promise<SportsTournament[]>

  /** Get all games (bracket structure) for a tournament */
  getTournamentGames(tournamentId: string, season: number): Promise<SportsGame[]>

  /** Get updated scores for games on a specific date */
  getGamesByDate(date: string): Promise<SportsGame[]>

  /** Get a single game's current state */
  getGameById(gameId: number): Promise<SportsGame | null>

  /** Check if any games are currently in progress */
  areGamesInProgress(): Promise<boolean>
}
```

### Pattern 2: Import-as-Predictive-Bracket

**What:** When a teacher imports a sports tournament, it creates a Bracket record with `bracketType: 'sports'` (new type) using the existing bracket creation infrastructure. Each tournament game maps to a Matchup record with additional sports metadata.

**When to use:** Tournament import flow.

**Example:**
```typescript
// Conceptual flow in actions/sports.ts
export async function importTournament(input: {
  tournamentId: string
  season: number
  sessionId: string
}) {
  // 1. Fetch tournament games from provider
  const provider = getProvider()
  const games = await provider.getTournamentGames(input.tournamentId, input.season)

  // 2. Map to entrants (teams) + matchups structure
  const teams = extractUniqueTeams(games)
  const entrants = teams.map((team, i) => ({
    name: team.shortName,
    seedPosition: team.seed ?? i + 1,
  }))

  // 3. Create bracket using existing DAL pattern
  // Sports brackets use a separate creation path that:
  //   - Sets bracketType = 'sports'
  //   - Stores externalTournamentId, dataSource
  //   - Creates matchups with externalGameId metadata
  //   - Opens predictions immediately (predictionStatus = 'predictions_open')
  const bracket = await createSportsBracketDAL(teacherId, {
    name: `March Madness ${season} - Men's`,
    size: 64, // main bracket size (excluding First Four)
    sessionId: input.sessionId,
    externalTournamentId: input.tournamentId,
    dataSource: 'sportsdataio',
  }, entrants, games)

  return bracket
}
```

### Pattern 3: Cron-Based Score Sync

**What:** A Vercel cron job that runs periodically during tournament season, fetches updated scores, and writes results to matchup records + broadcasts updates.

**When to use:** During active tournament (March-April).

**Example:**
```typescript
// src/app/api/cron/sports-sync/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Check if any games are in progress
  const provider = getProvider()
  const gamesInProgress = await provider.areGamesInProgress()

  if (!gamesInProgress) {
    return NextResponse.json({ status: 'no_active_games' })
  }

  // 2. Fetch today's games with updated scores
  const today = new Date().toISOString().split('T')[0]
  const games = await provider.getGamesByDate(today)

  // 3. Find all active sports brackets
  const sportsBrackets = await prisma.bracket.findMany({
    where: { bracketType: 'sports', status: 'active' },
    include: { matchups: true },
  })

  // 4. For each bracket, update matchups with new scores
  for (const bracket of sportsBrackets) {
    await syncBracketResults(bracket, games)
  }

  return NextResponse.json({ status: 'synced', gamesUpdated: games.length })
}
```

### Pattern 4: Manual Override (Existing Pattern Reuse)

**What:** The existing `overrideMatchupWinnerDAL` from Phase 7.1's predictive brackets is directly reusable for sports bracket overrides. Teachers click a matchup, select the winner, and the override propagates through the bracket.

**When to use:** When API data is delayed/incorrect and teacher wants to manually set a game result.

### Anti-Patterns to Avoid

- **Client-side API calls:** NEVER call SportsDataIO from the browser. API keys must stay server-side. All data flows through server actions or API routes.
- **Real-time WebSocket to SportsDataIO:** SportsDataIO is REST-only. Do not attempt WebSocket connections. Use server-side polling + Supabase broadcast to push updates to clients.
- **Storing raw API responses:** Always map through adapter types. Raw SportsDataIO response shapes should never leak beyond `sportsdataio/` directory.
- **Polling from client:** Do not poll SportsDataIO from individual browser tabs. Use a single server-side cron job that syncs all active brackets, then broadcast via existing Supabase Realtime.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bracket structure generation | Custom 68-team bracket builder | SportsDataIO pre-built tournament bracket data | Tournament structure, seedings, game links (previousGameId) are all provided by the API. Import directly. |
| Score polling scheduling | node-cron or custom scheduler | Vercel cron jobs (`vercel.json` config) | Serverless environment; in-process schedulers don't survive between invocations |
| Team logo hosting | Self-hosted logo images | SportsDataIO `TeamLogoUrl` + ESPN CDN fallback | API provides URLs; ESPN CDN is reliable and covers all D1 schools |
| Bracket rendering | New sports-specific bracket SVG | Existing `BracketDiagram` + `RegionBracketView` with enhanced matchup boxes | The bracket structure is the same; only the matchup box content changes (add logos, scores, status) |
| Result propagation | Custom cascade logic | Existing `overrideMatchupWinnerDAL` + advancement logic | Sports result writing is identical to setting a matchup winner -- use the same DAL |

**Key insight:** A sports bracket is a predictive bracket where results are set by an external data source instead of student votes. The existing predictive bracket infrastructure handles 90% of the work. The new code is primarily: (1) data ingestion from SportsDataIO, (2) scheduled syncing, (3) enhanced UI for scores/logos.

## Common Pitfalls

### Pitfall 1: 68-Team Format vs 64-Team Bracket
**What goes wrong:** NCAA March Madness has 68 teams, not 64. The "First Four" games trim 68 to 64 before the main bracket begins. Trying to render a 68-team bracket would break existing bracket rendering.
**Why it happens:** Developers treat the First Four as part of the main bracket.
**How to avoid:** Import the tournament as a 64-team bracket. The First Four winners are treated as the 4 "lowest" seeds that play into R1 positions. SportsDataIO handles this -- First Four games have `Round: 0` or separate pre-round IDs, and winners feed into `Round: 1` via `PreviousGameID`. Store First Four games as metadata or play-in matchups (the existing `playInEnabled` pattern from double-elimination brackets can be repurposed).
**Warning signs:** Bracket rendering shows blank or misaligned matchups in round 1.

### Pitfall 2: API Key Exposure
**What goes wrong:** SportsDataIO API key leaks to the client via `NEXT_PUBLIC_` prefix or inline in client components.
**Why it happens:** Developer adds API key as NEXT_PUBLIC env var for convenience.
**How to avoid:** Use server-only env var (e.g., `SPORTSDATAIO_API_KEY`). All API calls happen in server actions, API routes, or cron endpoints. Never import the sports client in a `'use client'` component.
**Warning signs:** API key visible in browser network tab or source.

### Pitfall 3: Polling Storm During Tournament
**What goes wrong:** Cron job runs too frequently, hits rate limits or generates excessive database writes when no games are active.
**Why it happens:** Fixed high-frequency polling regardless of game state.
**How to avoid:** Implement adaptive polling:
  - Pre-game (no games today): Poll once per day for schedule changes
  - Game day, no games in progress: Poll every 15 minutes
  - Games in progress: Poll every 60 seconds (SportsDataIO updates scores every 30-60 seconds)
  - Use `AreAnyGamesInProgress` endpoint as a cheap gate before fetching full scores
**Warning signs:** Unnecessary API calls, stale data during games, fresh data when no games are happening.

### Pitfall 4: Women's Tournament Timing Difference
**What goes wrong:** Women's bracket data is not available live on Selection Sunday like men's data.
**Why it happens:** SportsDataIO documentation states: "Women's College Basketball brackets are not updated live and will appear following the announcement of the entire bracket seeding."
**How to avoid:** Handle the women's tournament import with a slight delay expectation. Show "awaiting bracket data" state. Do not assume both brackets are available simultaneously.
**Warning signs:** Women's tournament import fails or returns TBD teams when men's bracket already has full seedings.

### Pitfall 5: Scrambled Free Trial Data
**What goes wrong:** Developer builds and tests with the free trial, but the data is scrambled (names, scores, IDs don't match real data).
**Why it happens:** SportsDataIO's free trial provides "scrambled but realistic data" -- same structure, different content.
**How to avoid:** Use the Replay feature for testing with real historical data. Document that production requires a paid subscription key. Structure code so switching from trial to production key requires only an env var change.
**Warning signs:** Team names don't match real teams, scores are unrealistic.

### Pitfall 6: Image Domain Allowlist
**What goes wrong:** Team logos don't render because Next.js `<Image>` blocks external domains.
**Why it happens:** Next.js requires explicit domain allowlisting for `next/image`.
**How to avoid:** Add SportsDataIO and ESPN CDN domains to `next.config.ts` `images.remotePatterns`. Current config is empty, so this must be added.
**Warning signs:** Broken logo images, console errors about unoptimized images.

## Code Examples

### SportsDataIO Client
```typescript
// src/lib/sports/sportsdataio/client.ts

const BASE_URL = 'https://api.sportsdata.io/v3/cbb'

interface SportsDataIOClientOptions {
  apiKey: string
  format?: 'json' | 'xml'
}

export class SportsDataIOClient {
  private apiKey: string
  private format: string

  constructor(options: SportsDataIOClientOptions) {
    this.apiKey = options.apiKey
    this.format = options.format ?? 'json'
  }

  private async get<T>(endpoint: string): Promise<T> {
    const url = `${BASE_URL}/${this.format}/${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      // Cache for 60 seconds on server side
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`SportsDataIO API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  // Key endpoints used by this phase:

  async getCurrentSeason(): Promise<number> {
    return this.get<number>('CurrentSeason')
  }

  async areGamesInProgress(): Promise<boolean> {
    return this.get<boolean>('AreAnyGamesInProgress')
  }

  async getSchedule(season: string): Promise<SportsDataIOGame[]> {
    // season format: "2026POST" for postseason (tournament)
    return this.get<SportsDataIOGame[]>(`Games/${season}`)
  }

  async getGamesByDate(date: string): Promise<SportsDataIOGame[]> {
    // date format: "2026-MAR-20"
    return this.get<SportsDataIOGame[]>(`GamesByDate/${date}`)
  }

  async getTeams(): Promise<SportsDataIOTeam[]> {
    return this.get<SportsDataIOTeam[]>('TeamsBasic')
  }
}
```

### Prisma Schema Extension
```prisma
// Additions to Bracket model:
model Bracket {
  // ... existing fields ...

  // Sports integration fields
  externalTournamentId  String?   @map("external_tournament_id")
  dataSource           String?    @map("data_source")        // 'sportsdataio' | null
  lastSyncAt           DateTime?  @map("last_sync_at")
  sportGender          String?    @map("sport_gender")       // 'mens' | 'womens'
}

// Additions to Matchup model:
model Matchup {
  // ... existing fields ...

  // Sports integration fields
  externalGameId       Int?       @map("external_game_id")
  homeScore            Int?       @map("home_score")
  awayScore            Int?       @map("away_score")
  gameStatus           String?    @map("game_status")        // 'scheduled' | 'in_progress' | 'final'
  gameStartTime        DateTime?  @map("game_start_time")
}

// Additions to BracketEntrant model:
model BracketEntrant {
  // ... existing fields ...

  // Sports integration fields
  externalTeamId       Int?       @map("external_team_id")
  logoUrl              String?    @map("logo_url")
  abbreviation         String?
}
```

### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sports-sync",
      "schedule": "*/2 * * * *"
    }
  ]
}
```
Note: The `*/2` schedule (every 2 minutes) is the cron frequency. The endpoint itself checks `AreAnyGamesInProgress` and exits early if no games are active, so the actual SportsDataIO API load is minimal outside game times.

### Logo Resolution with Fallback
```typescript
// src/lib/sports/logo-resolver.ts

/**
 * Resolve a team logo URL with fallback chain:
 * 1. SportsDataIO TeamLogoUrl (from API response)
 * 2. ESPN CDN (well-known URL pattern)
 * 3. null (component renders team abbreviation instead)
 */
export function resolveTeamLogoUrl(
  sportsDataIOLogoUrl: string | null,
  teamAbbreviation: string
): string | null {
  if (sportsDataIOLogoUrl) return sportsDataIOLogoUrl

  // ESPN CDN fallback: https://a.espncdn.com/i/teamlogos/ncaa/500/{teamId}.png
  // Note: ESPN uses numeric team IDs, not abbreviations.
  // A static mapping from SportsDataIO TeamID -> ESPN TeamID would be needed.
  // For MVP, return null and render abbreviation.
  return null
}
```

### Next.js Image Domain Config
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.sportsdata.io',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/i/teamlogos/**',
      },
    ],
  },
};

export default nextConfig;
```

## Discretion Recommendations

### Bracket Diagram Approach: Reuse Existing with Enhanced Matchup Boxes

**Recommendation:** Reuse the existing `BracketDiagram` and `RegionBracketView` components. The 64-team NCAA bracket naturally maps to the existing `RegionBracketView` which already splits into 4 regions. Create a new `SportsMatchupBox` subcomponent that replaces the standard matchup box content with:
- Team logo (small, 20x20px) + team name
- Score (when game is in progress or final)
- Status badge (LIVE / FINAL / scheduled time)

**Rationale:** The bracket structure rendering (SVG layout, round positioning, zoom/pan, region navigation) is identical to the existing 64-entrant bracket. Only the content inside each matchup box changes. Building a new diagram would be massive unnecessary duplication.

### Game Status Display: Show Status Badges

**Recommendation:** Show status badges on matchup boxes:
- Scheduled games: show date/time in muted text
- In-progress games (`status: 'in_progress'`): show pulsing "LIVE" badge in red + current score + period/time
- Completed games (`status: 'final'`): show "FINAL" badge in muted text + final score
- Winner is highlighted (bold text, subtle green accent) same as existing winner highlighting

**Rationale:** Status badges are low-effort, high-information. Students need to know at a glance which games are live vs decided. The existing matchup box already has winner highlighting patterns. Adding a small status indicator is additive, not structural.

### Polling/Caching Architecture

**Recommendation:** Three-tier adaptive polling via a single Vercel cron job:

| Condition | Cron Frequency | API Calls per Cron Run |
|-----------|---------------|----------------------|
| No active sports brackets | Cron runs but exits immediately | 0 |
| Active brackets, no games today | Full sync once per day | 1 (schedule check) |
| Active brackets, games today but not in progress | Check `AreGamesInProgress` | 1 (cheap boolean endpoint) |
| Active brackets, games in progress | Fetch `GamesByDate`, sync all | 2-3 (progress check + scores) |

The cron runs every 2 minutes in `vercel.json`. The endpoint itself is smart about what it fetches. This means:
- During off-hours: 720 cheap calls/day (just the boolean check) = negligible
- During game time: ~60 full score fetches over 2 hours per game session = very manageable

After syncing, broadcast updates via existing `broadcastBracketUpdate()` to push to connected clients in real-time. Clients never poll SportsDataIO directly.

Server-side caching: Use Next.js `fetch` with `next: { revalidate: 60 }` for non-live data (teams, schedule). Live score fetches use `cache: 'no-store'`.

### 68-Team Format Handling

**Recommendation:** Handle First Four as play-in games using the existing `playInEnabled` pattern:

1. Import the tournament as a **64-team single-elimination bracket** (6 rounds)
2. Store the 4 First Four games as round-0 play-in matchups (same pattern as double-elimination play-ins)
3. The 4 First Four winners feed into specific R1 positions via `nextMatchupId`
4. SportsDataIO provides `AwayTeamPreviousGameID` / `HomeTeamPreviousGameID` to wire this automatically
5. When First Four games complete, the cron sync writes the winner to the R1 slot just like existing bye/play-in advancement

**Rationale:** The existing codebase already has a play-in concept (round 0 matchups with `nextMatchupId` wiring to R1). The 68 -> 64 reduction is exactly what the First Four does. No new bracket rendering logic needed -- round 0 play-in matchups are already rendered by the diagram.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESPN hidden API (free, unofficial) | SportsDataIO paid API (official, supported) | Ongoing risk since ESPN never had an official API | ESPN can break any time; SportsDataIO has SLA |
| Client-side polling to sports APIs | Server-side cron + realtime broadcast | Standard since Vercel cron launch (2023) | Single poll source, fan out via WebSocket |
| Custom bracket rendering for sports | Reuse existing bracket diagrams | N/A (app-specific) | 80% less new UI code |

**Deprecated/outdated:**
- FantasyData was the old brand name for SportsDataIO -- URLs may reference `fantasydata.com` but `sportsdata.io` is the current domain
- SportsDataIO v2 API is deprecated; v3 is current for college basketball

## Open Questions

1. **SportsDataIO NCAA Basketball exact API base URL**
   - What we know: General pattern is `https://api.sportsdata.io/v3/cbb/{format}/{endpoint}` but women's basketball may use a different path segment (e.g., `wcbb` vs `cbb`)
   - What's unclear: Exact base URL for women's basketball API; whether men's and women's use the same subscription key
   - Recommendation: Validate during free trial account setup. Store base URL as provider config, not hardcoded.

2. **SportsDataIO production pricing for NCAA Basketball**
   - What we know: API analysis doc estimates $200-600/month for live data. Free trial is perpetual with scrambled data. Replay feature provides real historical data.
   - What's unclear: Exact cost for NCAA men's + women's basketball combined
   - Recommendation: Contact SportsDataIO sales before tournament season. Budget $300-600/month for production data during March-April.

3. **ESPN CDN logo URL mapping**
   - What we know: ESPN CDN pattern is `https://a.espncdn.com/i/teamlogos/ncaa/500/{espnTeamId}.png` but uses ESPN's internal team IDs, not SportsDataIO IDs
   - What's unclear: Whether a reliable SportsDataIO-to-ESPN ID mapping exists
   - Recommendation: Use SportsDataIO's `TeamLogoUrl` as primary. For the fallback, if SportsDataIO logos are missing, render team abbreviation text as the fallback rather than attempting ESPN CDN mapping. ESPN logo fallback can be added incrementally if needed.

4. **Tournament game scheduling edge cases**
   - What we know: Games can be postponed, delayed, canceled, or go to overtime
   - What's unclear: How SportsDataIO handles mid-game status changes and whether `IsClosed` flag is reliable for determining when a game result is truly final
   - Recommendation: Use `IsClosed: true` as the definitive "game is final" signal. Only auto-write matchup winners when `IsClosed: true`. Show "In Progress" for everything else.

5. **Free trial data for women's basketball**
   - What we know: Men's bracket data is pre-created 21 days before Selection Sunday. Women's bracket "is not updated live and will appear following the announcement of the entire bracket seeding"
   - What's unclear: Whether free trial includes women's basketball at all
   - Recommendation: Validate with free trial. If women's data is not available on trial, ensure the provider gracefully returns empty results rather than erroring.

## Sources

### Primary (HIGH confidence)
- [SportsDataIO NCAA Basketball API Documentation](https://sportsdata.io/developers/api-documentation/ncaa-basketball) - Endpoint listing, auth method
- [SportsDataIO NCAA Basketball Workflow Guide](https://sportsdata.io/developers/workflow-guide/ncaa-basketball) - Integration workflow, polling intervals, tournament timeline
- [SportsDataIO NCAA Basketball Data Dictionary](https://sportsdata.io/developers/data-dictionary/ncaa-basketball) - Game, Team, Tournament field definitions
- [SportsDataIO NCAA Women's Basketball API](https://sportsdata.io/developers/api-documentation/ncaa-womens-basketball) - Women's tournament endpoint coverage
- [SportsDataIO NCAA Basketball Coverage](https://sportsdata.io/developers/coverages/ncaa-basketball) - Update frequencies, data types
- [SportsDataIO Free Trial](https://sportsdata.io/free-trial) - Trial terms: perpetual, scrambled data, Replay feature
- Project codebase analysis - Prisma schema, bracket DAL, prediction DAL, bracket components, realtime broadcast

### Secondary (MEDIUM confidence)
- `march_madness_api_analysis (1).docx` (project root) - 6-provider comparison, pricing estimates, feature matrix
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs) - Cron configuration, CRON_SECRET auth
- [ESPN CDN logo patterns](https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b) - ESPN hidden API documentation gist

### Tertiary (LOW confidence)
- SportsDataIO pricing estimates ($200-600/month) from the march_madness_api_analysis doc - requires sales contact for actual quotes
- ESPN CDN team logo URL format - unofficial, could change

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SportsDataIO is user-locked decision; API docs verified; no new npm deps needed
- Architecture: HIGH - Provider abstraction is well-understood pattern; existing bracket infrastructure maps directly to sports bracket needs
- Pitfalls: MEDIUM - Most pitfalls identified from API docs and codebase analysis; some edge cases (overtime, postponements) need runtime validation
- Pricing: LOW - Requires sales contact for production costs; estimates from analysis doc may be outdated

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (tournament starts mid-March; API capabilities stable until then)
