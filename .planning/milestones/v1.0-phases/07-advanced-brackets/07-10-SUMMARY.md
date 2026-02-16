---
phase: 07-advanced-brackets
plan: 10
subsystem: bracket-round-robin
tags: [round-robin, standings, matchups, dal, server-actions]
depends_on: ["07-01", "07-04"]
provides: ["round-robin-dal", "round-robin-actions", "round-robin-ui"]
affects: ["07-11", "07-12", "07-13"]
tech-stack:
  added: []
  patterns: ["round-robin bracket pipeline", "pacing mode switching", "result recording with tie support"]
key-files:
  created:
    - src/lib/dal/round-robin.ts
    - src/actions/round-robin.ts
    - src/components/bracket/round-robin-standings.tsx
    - src/components/bracket/round-robin-matchups.tsx
  modified:
    - src/lib/dal/bracket.ts
    - src/app/(dashboard)/brackets/[bracketId]/page.tsx
    - src/components/bracket/bracket-detail.tsx
decisions:
  - "Round-robin DAL routes from createBracketDAL via bracketType branch (not a separate action endpoint)"
  - "Matchup position is globally unique within bracket (incrementing across all rounds)"
  - "Round advancement opens next round by setting pending matchups to voting status"
  - "Standings fetched server-side on bracket detail page and passed as prop"
metrics:
  duration: "~4.4m"
  completed: "2026-02-01"
---

# Phase 7 Plan 10: Round-Robin Bracket Pipeline Summary

Complete round-robin bracket creation, result recording, standings calculation, and UI display with round-by-round and all-at-once pacing modes.

## What Was Built

### Task 1: Round-Robin DAL and Server Actions

**DAL (src/lib/dal/round-robin.ts):**
- `createRoundRobinBracketDAL`: Creates bracket with all round-robin matchups organized by round using the circle method schedule generator. Each matchup gets roundRobinRound metadata for filtering. No nextMatchupId chaining (matchups are independent).
- `recordRoundRobinResult`: Records win/loss/tie on a matchup with ownership verification through bracket.teacherId. Ties set winnerId=null + status='decided'. Broadcasts bracket update non-blocking.
- `getRoundRobinStandings`: Queries all decided matchups, maps to RoundRobinResult format, calls pure calculateRoundRobinStandings engine, enriches with entrant names from DB.
- `advanceRoundRobinRound`: Opens matchups for a specific round by setting status from 'pending' to 'voting'. Used for round-by-round pacing mode.

**Server Actions (src/actions/round-robin.ts):**
- `recordResult`: Auth -> validate (recordRoundRobinResultSchema) -> DAL -> revalidate
- `advanceRound`: Auth -> validate -> DAL -> revalidate
- `getRoundRobinStandingsAction`: Auth -> DAL -> return standings

**Bracket DAL Integration (src/lib/dal/bracket.ts):**
- Added bracketType branch in createBracketDAL: when `bracketType === 'round_robin'`, routes to createRoundRobinBracketDAL

### Task 2: UI Components and Detail Page Routing

**Standings Component (src/components/bracket/round-robin-standings.tsx, 111 lines):**
- League table with columns: Rank (#), Entrant Name, W, L, T, Pts
- Gold/silver/bronze badge styling for top 3 ranks
- Supports isLive prop: when false and no results, shows "Reveal after round closes"
- Green/red/muted color coding for W/L/T columns

**Matchup Grid Component (src/components/bracket/round-robin-matchups.tsx, 256 lines):**
- Groups matchups by roundRobinRound with collapsible round headers
- Round-by-round pacing: only current round expanded by default
- All-at-once pacing: all rounds expanded
- Teacher controls: 3 buttons per voting matchup (Entrant 1 Wins / Tie / Entrant 2 Wins)
- Status badges: Upcoming (pending), Decided (green), Tie (yellow)
- Completion indicator per round

**Bracket Detail Page Updates:**
- Server page fetches standings via getRoundRobinStandings for round-robin brackets
- Calculates totalRounds correctly for round-robin (N-1 for even, N for odd) vs log2 for elimination
- BracketDetail component renders standings table + matchup grid instead of BracketDiagram for round-robin
- "Open Round N" button for round-by-round pacing advancement
- Result recording wired via onRecordResult callback through server action

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Route from createBracketDAL via branch | Maintains single entry point for bracket creation; bracket action works unchanged |
| Global position increment for matchups | Avoids unique constraint conflicts; position is unique within bracket |
| Server-side standings fetch on page load | Matches server component data fetching pattern used throughout app |
| Advance button opens NEXT round (not current) | Current round is already voting/decided; teacher advances to open the upcoming round |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

Round-robin pipeline is complete. The remaining wave 3 plans (07-11 through 07-13) can build on these components for integration testing and refinements.
