---
phase: quick-37
plan: 01
subsystem: sports-bracket
tags: [ncaa, bracket, sports, ux]
dependency_graph:
  requires: []
  provides: [incomplete-ncaa-detection, bracket-loading-warning]
  affects: [tournament-browser, sports-types, sportsdataio-mappers]
tech_stack:
  added: []
  patterns: [partial-data-detection, conditional-ui-warning]
key_files:
  created: []
  modified:
    - src/lib/sports/types.ts
    - src/lib/sports/sportsdataio/mappers.ts
    - src/components/bracket/tournament-browser.tsx
decisions:
  - NCAA threshold set at 60 teams (full bracket is 68)
  - gameCount field added to SportsTournament for future use
metrics:
  duration: 54s
  completed: "2026-03-15T22:49:00Z"
---

# Quick Task 37: Detect and warn on incomplete NCAA bracket data

Prevent teachers from importing partially-loaded NCAA tournament brackets by detecting when fewer than 60 of 68 teams are present and showing a loading warning instead of an import button.

## What Changed

### Task 1: Type and mapper updates (6b96b8a)
- Added `gameCount: number` field to `SportsTournament` interface
- Updated `mapTournament` to set `gameCount: games.length`
- NCAA tournaments with < 60 teams now marked as `teamsPopulated: false`
- Non-NCAA tournament logic unchanged (`teamIds.size > 0`)

### Task 2: UI warning for incomplete brackets (96972d2)
- Added `isIncompleteNCAA()` helper function
- NCAA tournaments with partial data show "Bracket loading... (X of 68 teams)"
- Amber warning explains data is still loading from the NCAA
- Game count displayed in tournament info row when available
- Import button remains disabled via existing `teamsPopulated` check

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation passes with no errors
- Import button disabled for NCAA tournaments with < 60 teams
- Non-NCAA tournaments unaffected by changes

## Self-Check: PASSED
