---
phase: quick-39
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/sports/espn/types.ts
  - src/lib/sports/espn/client.ts
  - src/lib/sports/espn/mappers.ts
  - src/lib/sports/espn/provider.ts
  - src/lib/sports/provider.ts
autonomous: true
requirements: [ESPN-PROVIDER]

must_haves:
  truths:
    - "ESPN provider implements SportsDataProvider interface fully"
    - "getActiveTournaments returns men's and women's NCAA tournaments with correct metadata"
    - "getTournamentGames queries all tournament dates and returns mapped SportsGame[] with seeds, regions, rounds"
    - "areGamesInProgress checks today's ESPN scoreboard for live games"
    - "getProvider() defaults to ESPN without requiring any API key"
    - "SportsDataIO provider remains available via SPORTS_PROVIDER=sportsdataio env var"
  artifacts:
    - path: "src/lib/sports/espn/types.ts"
      provides: "Raw ESPN API response types matching actual endpoint shape"
    - path: "src/lib/sports/espn/client.ts"
      provides: "ESPN HTTP client with date-by-date scoreboard queries"
    - path: "src/lib/sports/espn/mappers.ts"
      provides: "ESPN event to domain type mappers (round, region, status, teams)"
    - path: "src/lib/sports/espn/provider.ts"
      provides: "ESPNProvider class implementing SportsDataProvider"
    - path: "src/lib/sports/provider.ts"
      provides: "Updated factory defaulting to ESPN"
  key_links:
    - from: "src/lib/sports/espn/provider.ts"
      to: "src/lib/sports/espn/client.ts"
      via: "ESPNProvider delegates HTTP to ESPNClient"
      pattern: "this\\.client\\."
    - from: "src/lib/sports/espn/provider.ts"
      to: "src/lib/sports/espn/mappers.ts"
      via: "Provider maps raw events to domain types"
      pattern: "map(Event|Game|Tournament|Team)"
    - from: "src/lib/sports/provider.ts"
      to: "src/lib/sports/espn/provider.ts"
      via: "Factory creates ESPNProvider as default"
      pattern: "new ESPNProvider"
    - from: "src/lib/sports/espn/provider.ts"
      to: "src/lib/sports/types.ts"
      via: "Implements SportsDataProvider interface"
      pattern: "implements SportsDataProvider"
---

<objective>
Build a complete ESPN provider for NCAA tournament data (men's and women's) using ESPN's free scoreboard API, and update the provider factory to use ESPN as the default.

Purpose: Replace SportsDataIO (which returns scrambled trial data) with ESPN's free, real production data for NCAA tournament brackets.
Output: Four new ESPN provider files + updated factory. Teachers can immediately import real NCAA brackets.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/39-build-espn-provider-for-ncaa-tournament-/39-CONTEXT.md

<interfaces>
<!-- Key types and contracts the executor needs. -->

From src/lib/sports/types.ts:
```typescript
export type SportGender = 'mens' | 'womens'
export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled'

export interface SportsTournament {
  externalId: string
  name: string
  season: number
  gender: SportGender
  startDate: string
  endDate: string
  teamCount: number
  gameCount: number
  teamsPopulated: boolean
  status: TournamentStatus
}

export interface SportsTeam {
  externalId: number
  name: string
  shortName: string
  abbreviation: string
  logoUrl: string | null
  conference: string
  seed: number | null
  region: string | null
}

export interface SportsGame {
  externalId: number
  tournamentId: string
  round: number
  bracket: string | null
  status: GameStatus
  homeTeam: SportsTeam
  awayTeam: SportsTeam
  homeScore: number | null
  awayScore: number | null
  startTime: string
  isClosed: boolean
  period: string | null
  timeRemaining: string | null
  winnerId: number | null
  displayOrder: number
  previousHomeGameId: number | null
  previousAwayGameId: number | null
}

export interface SportsDataProvider {
  getActiveTournaments(): Promise<SportsTournament[]>
  getTournamentGames(tournamentId: string, season: number): Promise<SportsGame[]>
  getGamesByDate(date: string): Promise<SportsGame[]>
  getGameById(gameId: number): Promise<SportsGame | null>
  areGamesInProgress(): Promise<boolean>
}
```

From src/lib/sports/provider.ts (current — will be modified):
```typescript
import type { SportsDataProvider } from './types'
import { SportsDataIOClient } from './sportsdataio/client'
import { SportsDataIOProvider } from './sportsdataio/provider'

let cachedProvider: SportsDataProvider | null = null

export function getProvider(): SportsDataProvider {
  if (cachedProvider) return cachedProvider
  const apiKey = process.env.SPORTSDATAIO_API_KEY
  if (!apiKey) throw new Error('SPORTSDATAIO_API_KEY ...')
  const client = new SportsDataIOClient({ apiKey })
  cachedProvider = new SportsDataIOProvider(client)
  return cachedProvider
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ESPN types, client, and mappers</name>
  <files>src/lib/sports/espn/types.ts, src/lib/sports/espn/client.ts, src/lib/sports/espn/mappers.ts</files>
  <action>
Create 3 files in `src/lib/sports/espn/`:

**types.ts** — Raw ESPN API response types matching the verified endpoint shape:
```typescript
// ESPN scoreboard response wrapper
export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
}

export interface ESPNEvent {
  id: string  // game ID as string
  name: string  // "Duke Blue Devils at Michigan State Spartans"
  shortName: string  // "DUKE VS MSU"
  status: {
    type: {
      id: string
      name: string  // "STATUS_SCHEDULED", "STATUS_IN_PROGRESS", "STATUS_FINAL"
      state: 'pre' | 'in' | 'post'
      completed: boolean
    }
  }
  competitions: ESPNCompetition[]
}

export interface ESPNCompetition {
  date: string  // ISO date
  venue: { fullName: string }
  tournamentId?: string  // "22" for men's
  notes: Array<{ type: string; headline: string }>
  competitors: ESPNCompetitor[]
}

export interface ESPNCompetitor {
  team: {
    id: string
    displayName: string
    shortDisplayName: string
    abbreviation: string
    logo: string  // ESPN CDN URL
  }
  curatedRank: { current: number } // THIS IS THE SEED
  homeAway: 'home' | 'away'
  score: string  // "0", "72", etc.
  winner: boolean
}
```

**client.ts** — ESPN HTTP client (no auth needed):
- Base URL: `https://site.api.espn.com/apis/site/v2/sports/basketball`
- Sport path: `mens-college-basketball` or `womens-college-basketball` based on SportGender
- `fetchScoreboard(gender: SportGender, date: string): Promise<ESPNScoreboardResponse>` — date is YYYYMMDD format, uses `?groups=100&dates={date}&limit=100`
- `fetchScoreboardForDates(gender: SportGender, dates: string[]): Promise<ESPNEvent[]>` — queries each date sequentially (to avoid rate limits), collects all events, deduplicates by event.id
- Use `cache: 'no-store'` on fetch (same pattern as SportsDataIO client)
- Add 100ms delay between date requests to be respectful of ESPN's servers
- Error handling: log and continue on individual date failures (don't fail entire batch)

**mappers.ts** — Pure mapping functions:

`mapEventStatus(event: ESPNEvent): GameStatus`:
- `state === 'pre'` -> `'scheduled'`
- `state === 'in'` -> `'in_progress'`
- `state === 'post' && completed` -> `'final'`
- Default: `'scheduled'`

`parseRoundFromHeadline(headline: string): number`:
- "First Four" -> 0
- "1st Round" -> 1
- "2nd Round" -> 2
- "Sweet 16" or "Regional Semifinal" -> 3 (women's uses "Regional Semifinal")
- "Elite Eight" or "Elite 8" or "Regional Final" -> 4 (women's uses "Regional Final")
- "Final Four" -> 5
- "National Championship" -> 6
- Default: 0

`parseRegionFromHeadline(headline: string): string | null`:
- Match "East Region", "West Region", "South Region", "Midwest Region" -> return the region name (e.g., "East")
- Match "Regional (\d+) in (.+)" for women's -> return "Regional {N}" (e.g., "Regional 1")
- "Final Four" or "National Championship" -> return "Final Four"
- Default: null

`computeDisplayOrder(round: number, region: string | null, seed1: number, seed2: number): number`:
- Encode: `round * 10000 + regionIndex * 1000 + Math.min(seed1, seed2)` where regionIndex maps East=0, West=1, South=2, Midwest=3, Regional 1-4 = 0-3, Final Four=4

`mapEventToGame(event: ESPNEvent, tournamentId: string): SportsGame`:
- Extract competition from `event.competitions[0]`
- Parse headline from `competition.notes[0]?.headline ?? ''`
- Find home/away competitors by `homeAway` field
- Map each competitor to SportsTeam: `externalId` = parseInt(team.id), `name` = displayName, `shortName` = shortDisplayName, `abbreviation` = abbreviation, `logoUrl` = team.logo, `conference` = '' (ESPN doesn't provide this in scoreboard), `seed` = curatedRank.current (use 0 if missing), `region` = parseRegionFromHeadline(headline)
- `externalId` = parseInt(event.id)
- `round` = parseRoundFromHeadline(headline)
- `bracket` = parseRegionFromHeadline(headline)
- `homeScore`/`awayScore` = parseInt(competitor.score) or null if pre-game
- `isClosed` = status.type.completed
- `winnerId` = find competitor with winner=true, use parseInt(team.id), or null
- `startTime` = competition.date
- `period` = null (ESPN scoreboard doesn't expose period cleanly in this endpoint)
- `timeRemaining` = null (same reason)
- `displayOrder` = computeDisplayOrder(round, region, homeSeed, awaySeed)
- `previousHomeGameId` = null (ESPN doesn't provide bracket wiring)
- `previousAwayGameId` = null

`mapEventsToTournament(events: ESPNEvent[], gender: SportGender, tournamentId: string): SportsTournament`:
- Extract unique teams from all events
- Derive start/end dates from event competition dates (sort)
- Determine season: if current month >= 10, season = currentYear + 1, else season = currentYear
- Status: any in-progress -> 'active', all completed -> 'completed', some completed -> 'active', else 'upcoming'
- `teamsPopulated` = teamCount >= 60 (same threshold as SportsDataIO)
- `name` = gender === 'mens' ? "NCAA Men's Basketball Tournament" : "NCAA Women's Basketball Tournament"
- `externalId` = tournamentId
- `gameCount` = events.length
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/lib/sports/espn/types.ts src/lib/sports/espn/client.ts src/lib/sports/espn/mappers.ts 2>&1 | head -30</automated>
  </verify>
  <done>Three ESPN module files exist, all types compile without errors, mappers cover all round/region/status parsing cases documented in the ESPN API shape</done>
</task>

<task type="auto">
  <name>Task 2: Create ESPN provider and update factory</name>
  <files>src/lib/sports/espn/provider.ts, src/lib/sports/provider.ts</files>
  <action>
**src/lib/sports/espn/provider.ts** — ESPNProvider implements SportsDataProvider:

```typescript
export class ESPNProvider implements SportsDataProvider {
  private client: ESPNClient
  constructor(client: ESPNClient) { this.client = client }
```

Define tournament date ranges as constants (these are known NCAA tournament dates for 2025-26 season, but make it configurable for future seasons):

```typescript
// NCAA tournament date ranges by gender
// These cover the full tournament window — extra dates just return empty results
function getTournamentDates(gender: SportGender): string[] {
  // Generate dates from March 17 through April 8 (covers both men's and women's entire window)
  // Format: YYYYMMDD
  const year = new Date().getFullYear()
  const dates: string[] = []
  // March 17 through March 31
  for (let day = 17; day <= 31; day++) {
    dates.push(`${year}${String(3).padStart(2, '0')}${String(day).padStart(2, '0')}`)
  }
  // April 1 through April 8
  for (let day = 1; day <= 8; day++) {
    dates.push(`${year}${String(4).padStart(2, '0')}${String(day).padStart(2, '0')}`)
  }
  return dates
}
```

**getActiveTournaments():**
- For each gender ('mens', 'womens'):
  - Pick a known tournament date (e.g., March 21 — R1 for both) and query it
  - If events come back with tournament-related notes headlines, tournament exists
  - Build SportsTournament using `mapEventsToTournament` from those sample events
  - Note: this is just a probe — we don't need ALL games here, just enough to confirm tournament exists and get metadata
- Return array of found tournaments
- Wrap each gender in try/catch (log warn, continue)

**getTournamentGames(tournamentId: string, season: number):**
- Determine gender from tournamentId: use convention — if tournamentId starts with "espn-mens" -> mens, "espn-womens" -> womens. (Define these IDs in the mappers/constants.)
- Actually, simpler: store gender in the tournamentId itself: `espn-mens-ncaat` and `espn-womens-ncaat`
- Get all tournament dates for that gender
- Call `client.fetchScoreboardForDates(gender, dates)` to get all events
- Map each event using `mapEventToGame(event, tournamentId)`
- Return the full SportsGame[]

**getGamesByDate(date: string):**
- Convert YYYY-MM-DD to YYYYMMDD
- Fetch scoreboard for both genders for that date
- Map all events to SportsGame[]

**getGameById(gameId: number):**
- This is rarely called and ESPN has no single-game endpoint in the scoreboard API
- Query today's scoreboard for both genders, search for matching event.id === gameId.toString()
- If not found, return null (acceptable since this is primarily used during live sync which works through getTournamentGames)

**areGamesInProgress():**
- Get today's date as YYYYMMDD
- Fetch scoreboard for both genders for today
- Return true if any event has `status.type.state === 'in'`

**src/lib/sports/provider.ts** — Update factory:
- Import ESPNClient and ESPNProvider
- Change logic:
  ```typescript
  export function getProvider(): SportsDataProvider {
    if (cachedProvider) return cachedProvider

    const providerType = process.env.SPORTS_PROVIDER ?? 'espn'

    if (providerType === 'sportsdataio') {
      const apiKey = process.env.SPORTSDATAIO_API_KEY
      if (!apiKey) {
        throw new Error('SPORTSDATAIO_API_KEY environment variable is required when SPORTS_PROVIDER=sportsdataio')
      }
      const client = new SportsDataIOClient({ apiKey })
      cachedProvider = new SportsDataIOProvider(client)
    } else {
      // ESPN provider — no API key needed
      const client = new ESPNClient()
      cachedProvider = new ESPNProvider(client)
    }

    return cachedProvider
  }
  ```
- Keep existing SportsDataIO imports
- Add ESPN imports
- Update JSDoc comment to reflect ESPN as default

**IMPORTANT tournament ID convention:**
In `getActiveTournaments()`, use `externalId: 'espn-mens-ncaat'` and `externalId: 'espn-womens-ncaat'`. In `getTournamentGames()`, parse gender from this ID. This keeps it simple and avoids collisions with SportsDataIO numeric IDs.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit src/lib/sports/espn/provider.ts src/lib/sports/provider.ts 2>&1 | head -30</automated>
  </verify>
  <done>ESPNProvider fully implements SportsDataProvider, getProvider() defaults to ESPN with no env var needed, SportsDataIO still available via SPORTS_PROVIDER=sportsdataio, TypeScript compiles clean</done>
</task>

<task type="auto">
  <name>Task 3: Smoke test ESPN provider against live API</name>
  <files>src/lib/sports/espn/provider.ts</files>
  <action>
Run a quick smoke test to verify the ESPN provider works against the live API. Create a temporary test script (delete after):

```typescript
// /tmp/espn-smoke-test.ts — run with npx tsx
import { ESPNClient } from './src/lib/sports/espn/client'

async function main() {
  const client = new ESPNClient()
  // Test: fetch March 20 2026 scoreboard (R1 for men's)
  const response = await client.fetchScoreboard('mens', '20260320')
  console.log(`Men's R1 games found: ${response.events.length}`)
  if (response.events.length > 0) {
    const e = response.events[0]
    console.log(`First game: ${e.name}`)
    console.log(`Status: ${e.status.type.state}`)
    const comp = e.competitions[0]
    console.log(`Notes: ${comp.notes[0]?.headline ?? 'none'}`)
    console.log(`Home: ${comp.competitors.find(c => c.homeAway === 'home')?.team.displayName}`)
    console.log(`Away: ${comp.competitors.find(c => c.homeAway === 'away')?.team.displayName}`)
  }
}
main().catch(console.error)
```

Run: `npx tsx /tmp/espn-smoke-test.ts`

If the test returns games, the provider is working. If it returns 0 games (tournament hasn't started yet or date is wrong), try a known active date.

Then verify the full provider flow:
1. Ensure `npx tsc --noEmit` passes for the entire project (not just ESPN files)
2. Ensure `npm run build` succeeds (Next.js build catches additional issues)

If there are any type errors or runtime issues, fix them. Common issues to watch for:
- ESPN might return `curatedRank` as undefined for some competitors (e.g., non-tournament teams in exhibition games) — add null checks
- `notes` array might be empty for some events — handle gracefully
- Some events might have `competitions` as empty array — skip those
- `score` field might be empty string instead of "0" for pre-game — handle in parseInt

After verification, delete the smoke test file.
  </action>
  <verify>
    <automated>cd /Users/davidreynoldsjr/VibeCoding/SparkVotEDU && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>Full project compiles with no type errors, ESPN provider successfully fetches and maps real tournament data from ESPN's live API, provider factory defaults to ESPN</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — full project compiles clean
2. `npm run build` — Next.js build succeeds
3. Provider factory returns ESPNProvider by default (no env var needed)
4. Provider factory returns SportsDataIOProvider when SPORTS_PROVIDER=sportsdataio
5. ESPN types match the verified API shape from live endpoint testing
</verification>

<success_criteria>
- ESPN provider implements all 5 SportsDataProvider methods
- getActiveTournaments returns both men's and women's NCAA tournaments
- getTournamentGames returns 60+ games with correct seeds, regions, and rounds
- Provider factory defaults to ESPN, falls back to SportsDataIO via env var
- Full project builds without errors
</success_criteria>

<output>
After completion, create `.planning/quick/39-build-espn-provider-for-ncaa-tournament-/39-SUMMARY.md`
</output>
