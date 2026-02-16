---
phase: 08-sports-integration
plan: 02
subsystem: api, database
tags: [ncaa, sports-bracket, dal, server-actions, prisma, feature-gate, realtime]

# Dependency graph
requires:
  - phase: 08-sports-integration
    plan: 01
    provides: SportsDataProvider interface, getProvider() factory, sports Prisma fields, domain types
  - phase: 01-foundation-and-auth
    provides: Prisma, getAuthenticatedTeacher, canAccess feature gating
  - phase: 04-voting-and-real-time
    provides: broadcastBracketUpdate, broadcastActivityUpdate, position parity advancement
  - phase: 06-billing-and-subscriptions
    provides: TIER_LIMITS with sportsIntegration flag
provides:
  - createSportsBracketDAL for importing NCAA tournaments as 64+4 brackets with team metadata
  - syncBracketResults for live score updates with auto-winner advancement
  - getActiveSportsBrackets for cron sync support
  - getAvailableTournaments server action with feature gate
  - importTournament server action with duplicate prevention and session ownership
  - triggerSportsSync server action for manual sync
  - resolveTeamLogoUrl for team logo display with null fallback
  - importTournamentSchema Zod validation for tournament import
affects: [08-03, 08-04, sports-bracket-ui, live-score-display, cron-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [sports-dal-creation, two-pass-matchup-wiring, sync-with-advancement, feature-gated-server-actions]

key-files:
  created:
    - src/lib/dal/sports.ts
    - src/actions/sports.ts
    - src/lib/sports/logo-resolver.ts
  modified:
    - src/lib/utils/validation.ts

key-decisions:
  - "Two-pass matchup creation: first create all matchups, then wire nextMatchupId via previousHomeGameId/previousAwayGameId"
  - "Position parity for winner propagation in sync (odd->entrant1, even->entrant2) reusing existing advancement convention"
  - "Season extraction from bracket name regex for sync (avoids storing season separately)"
  - "Non-blocking broadcast on sync completion using .catch(console.error) pattern"
  - "Duplicate import prevention per session via externalTournamentId + sessionId query"

patterns-established:
  - "Sports DAL creation: 30s transaction, team map -> entrant creation -> matchup creation -> wiring -> winner propagation"
  - "Sync engine: fetch games, match by externalGameId, update scores, auto-advance closed games, broadcast update"
  - "Feature-gated server actions: canAccess(tier, 'sportsIntegration') before any data operation"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 8 Plan 2: Sports Bracket Creation DAL and Server Actions Summary

**Sports DAL with 68-team NCAA tournament import, live score sync with auto-advancement, and feature-gated server actions for browsing/import/sync**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T21:09:10Z
- **Completed:** 2026-02-15T21:11:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Sports bracket creation DAL that maps 68-team NCAA tournament data into a 64+4 bracket structure with team logos, abbreviations, external IDs, game scores, and status
- Sync engine that updates matchup scores from live game data and auto-advances winners using position parity propagation
- Three server actions (getAvailableTournaments, importTournament, triggerSportsSync) all gated behind sportsIntegration feature (Pro Plus only)
- Logo resolver with SportsDataIO URL primary source and null fallback for abbreviation text rendering
- Zod validation schema for tournament import input

## Task Commits

Each task was committed atomically:

1. **Task 1: Logo resolver + validation schemas + sports bracket creation DAL** - `46b49c0` (feat)
2. **Task 2: Server actions for tournament browsing and import** - `7cbf977` (feat)

## Files Created/Modified
- `src/lib/dal/sports.ts` - createSportsBracketDAL, syncBracketResults, getActiveSportsBrackets (373 lines)
- `src/actions/sports.ts` - getAvailableTournaments, importTournament, triggerSportsSync server actions with feature gating (167 lines)
- `src/lib/sports/logo-resolver.ts` - resolveTeamLogoUrl with SportsDataIO primary and null fallback (29 lines)
- `src/lib/utils/validation.ts` - Added importTournamentSchema and ImportTournamentInput type

## Decisions Made
- Two-pass matchup creation approach: create all matchups first (without nextMatchupId), then wire advancement chain via previousHomeGameId/previousAwayGameId from SportsDataIO game data
- Position parity for winner propagation during sync reuses the existing convention (odd positions -> entrant1Id, even -> entrant2Id)
- Season extraction from bracket name via regex pattern match (`/\b(20\d{2})\b/`) avoids storing season as a separate field on the bracket model
- Duplicate import prevention queries by externalTournamentId + sessionId rather than adding a unique constraint (more flexible, allows same tournament in different sessions)
- Logo resolver returns null (not a placeholder URL) when SportsDataIO URL is absent, letting components decide how to render the fallback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Next Phase Readiness
- Sports DAL and server actions complete, ready for 08-03 (UI components for tournament browsing and import)
- Sync engine ready for 08-04 (cron-based automatic sync)
- All TypeScript compiles cleanly with `npx tsc --noEmit`

## Self-Check: PASSED

- All 4 files exist on disk
- Both task commits verified in git log (46b49c0, 7cbf977)
- `npx tsc --noEmit` passes cleanly

---
*Phase: 08-sports-integration*
*Completed: 2026-02-15*
