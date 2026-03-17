# Phase 1: Sports Bracket Import Reliability - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix sports bracket import pipeline reliability: auto-fix play-in entrant placement in R1 slots by tournament seed, add Final Four pairing configuration UI, and fix R0 entrant assignment. This phase improves the existing ESPN-based sports bracket import — no new bracket types or providers.

</domain>

<decisions>
## Implementation Decisions

### Final Four Pairing Configuration
- Dropdown presets UI — show 3 possible region pairings as selectable options (only 3 unique combinations for 4 regions)
- Available during import flow AND in bracket settings (editable after creation)
- Auto-detect Men's vs Women's tournament from ESPN data — Men's uses geographic names (East, West, South, Midwest), Women's uses host city names (Albany, Portland, Greenville, Indianapolis)
- Auto-default to official NCAA pairing for that year if ESPN data reveals actual Final Four matchups (games with region info exist)
- Teacher can override the auto-detected pairing at any time
- Changing pairings in bracket settings immediately re-wires R4→R5 nextMatchupId links; warn teacher if students have predictions past R4

### Play-in Display & Placement
- Combined play-in entries show both abbreviations + seed (e.g., "11 TEX/NCSU") — no logo for combined entries
- When play-in game resolves, auto-replace combined entry with winning team's name, logo, and seed
- R0 (First Four) matchups are hidden from students — only R1+ bracket visible
- Students CAN pick the combined entry as a winner in predictions before play-in resolves; prediction updates to whichever team won (counts as correct if they picked that slot)

### Import Error Handling
- Import with warnings — proceed with import even if ESPN data is incomplete, show summary of issues at import time (missing play-in games, null seeds, partial regions)
- Warnings are import-time only — no persistent banner after import
- Duplicate team detection: if a team appears in both R0 and R1, prefer R0 treatment (skip R1 duplicate)
- Sync notification approach: Claude's discretion

### Auto-fix Behavior
- Auto-correct placement silently during import — fix seed/region mismatches without teacher action
- Fixes logged server-side for debugging, not shown to teacher
- Auto-fix runs on initial import only, NOT during syncs — syncs only update scores and winners
- If auto-fix can't resolve placement (missing seed data), place in next available slot and include in import-time warnings
- Manual re-import/refresh action: Claude's discretion

### Claude's Discretion
- Sync notification approach (toast vs silent)
- Whether to add a "Refresh from ESPN" button in bracket settings
- Server-side logging format for auto-fix actions
- Exact dropdown preset UI styling and placement within import wizard

</decisions>

<specifics>
## Specific Ideas

- Men's NCAA uses geographic region names (East, West, South, Midwest); Women's uses host city names — must auto-detect from ESPN tournament data
- Combined play-in display: "11 TEX/NCSU" format, consistent with current implementation
- Import warnings should feel informational, not alarming — "These may resolve on next sync"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `wireMatchupAdvancement()` in `src/lib/dal/sports.ts` — already handles region-based pairing, needs Final Four config parameter
- `SEED_TO_R1_POSITION` mapping in `src/lib/dal/sports.ts` — reusable for entrant placement validation
- `createSportsBracketDAL()` in `src/lib/dal/sports.ts` — main orchestration function, needs reliability enhancements
- ESPN provider at `src/lib/sports/espn/provider.ts` — auto-detects tournament type
- ESPN mappers at `src/lib/sports/espn/mappers.ts` — round/region/seed parsing

### Established Patterns
- Sports provider abstraction (`SportsDataProvider` interface) — all data access goes through provider factory
- Combined play-in entries created as "TEX/NCSU" format with `playInEntrantIds` map keyed by "region-opponentSeed"
- Region propagation from R1 feeders already implemented in `wireMatchupAdvancement()` (quick-44 fix)
- Matchup linkage via `nextMatchupId` for bracket cascade (quick-43 fix)

### Integration Points
- Import wizard UI at bracket creation flow — add Final Four pairing picker step
- Bracket settings panel — add Final Four pairing section
- `syncBracketResults()` — play-in resolution updates combined entries to winners
- MatchupBox component (`bracket-diagram.tsx`) — already supports `isSports` mode with seed display

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-sports-bracket-import-reliability-auto-fix-play-in-entrant-placement-in-r1-slots-by-tournament-seed-add-final-four-pairing-configuration-fix-r0-entrant-assignment*
*Context gathered: 2026-03-17*
