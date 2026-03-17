---
phase: "42"
plan: 1
subsystem: bracket-rendering
tags: [sports-bracket, prediction-ux, svg, overlay-removal]
dependency_graph:
  requires: []
  provides: [unified-sports-matchup-rendering, inline-sports-scores]
  affects: [bracket-diagram, sports-matchup-box]
tech_stack:
  patterns: [inline-sports-rendering, conditional-name-formatting]
key_files:
  modified:
    - src/components/bracket/bracket-diagram.tsx
    - src/components/bracket/sports-matchup-box.tsx
decisions:
  - "Removed SportsMatchupOverlay architecture entirely in favor of inline rendering within MatchupBox"
  - "Sports entrant names use abbreviation when scores are visible, full name otherwise"
  - "Vote labels hidden when sports scores are displayed (scores take precedence)"
metrics:
  duration: "29 minutes"
  completed: "2026-03-17"
---

# Quick Task 42: Merge Sports Bracket Rendering into MatchupBox Summary

Removed SportsMatchupOverlay architecture and merged sports rendering (seeds, scores, status badges) inline into MatchupBox, fixing 5 prediction UX bugs caused by the overlay hiding click handlers and visual feedback.

## What Was Done

### Task 1: Merge sports rendering into MatchupBox and remove overlay

**In `bracket-diagram.tsx`:**
- Removed the `<g style={isSports ? {display:'none'} : undefined}>` wrapper that was hiding all text, logos, click rects, and vote highlights for sports brackets
- Added sports-aware entrant name computation: `"{tournamentSeed} {abbreviation|name}"` with abbreviation used when scores are visible
- Added inline score display (right-aligned, bold for winners) for `homeScore`/`awayScore`
- Added `SportsStatusBadge` rendering inline after the divider line for game status (LIVE, FINAL, scheduled, POSTPONED)
- Removed the entire `SportsMatchupOverlay` rendering block from `BracketDiagram`
- Updated import from `SportsMatchupOverlay` to `SportsStatusBadge`
- Vote labels conditionally hidden when sports scores are present (scores take precedence)

**In `sports-matchup-box.tsx`:**
- Deleted `SportsEntrantRow` component and its interface (merged into MatchupBox)
- Deleted `SportsMatchupOverlay` component and its interface (removed entirely)
- Exported `formatGameTime` for external use
- Removed unused `BracketEntrantData` import
- File now only exports: `isSportsBracket`, `SportsStatusBadge`, `formatGameTime`

### Task 2: Human verification (approved)

Playwright-assisted verification confirmed all 5 bugs fixed:
1. No double text -- each entrant name appears once
2. Both halves clickable -- top and bottom entrants both respond to clicks with checkmarks
3. Vote highlights visible -- green highlights render, non-voted entrants dimmed
4. Winner highlights use standard primary color-mix (no green rgba from old overlay)
5. Prediction cascade code is correct (R2 TBD is pre-existing data issue: `next_matchup_id` is NULL in database)

Non-sports brackets render normally (no regression). TypeScript compiles clean.

## Deviations from Plan

None -- plan executed exactly as written.

## Pre-existing Issue Discovered

Prediction cascade shows TBD in R2 because `next_matchup_id` is NULL for all matchups in the database. This is a data-level issue unrelated to the rendering changes. The cascade hook logic is correct but has no links to follow. Logged for future investigation.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `a56e0cb` | feat(42-1): merge sports bracket rendering into MatchupBox, remove overlay |

## Net Code Change

- **68 lines added, 206 lines deleted** (net -138 lines)
- Simplified architecture: one rendering path instead of two overlapping layers

## Self-Check: PASSED
