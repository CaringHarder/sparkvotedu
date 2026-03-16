# Sports Bracket Prediction UX — Handoff for Phase Planning

**Date:** 2026-03-16
**Context:** 10+ quick fixes on NCAA bracket integration. Core feature works but prediction UX has architectural issues needing a focused phase.

## Current State

### What Works
- ESPN provider (`src/lib/sports/espn/`) fetches men's + women's NCAA tournaments
- Import creates 64 entrants (60 main + 4 combined play-in like "TEX/NCSU")
- Bracket detail page shows correct seeding (1v16, 8v9, 5v12...) with tournament seeds + logos
- Region-based display (East/West/South/Midwest) via `computeRegionsFromBracketField()`
- Live dashboard has auto-sync 60s, manual sync, "Open Predictions" button
- Student routed to `PredictiveStudentView` for predictions
- `predictionStatus: 'draft'` set on creation, `predictiveMode: 'advanced'`

### What's Broken (5 bugs, all same root cause)

1. **Double text on combined play-in entries** — `SportsMatchupOverlay` renders "16 LEH/PV" AND the standard `MatchupBox` abbreviation fallback "LEH/PV" leaks through despite `display: none` wrapper
2. **Only top half of matchup clickable** — Standard `MatchupBox` click rects are inside the `display: none` group. SportsMatchupOverlay has no click handlers.
3. **No visual selection feedback** — Green vote highlights render under the opaque SportsMatchupOverlay (invisible)
4. **No prediction cascade** — Augmented matchup data from `use-prediction-cascade.ts` flows into R2+ matchups but SportsMatchupOverlay reads original entrant data, not augmented
5. **Live dashboard still shows seedPosition numbers** — Live dashboard's diagram doesn't fully utilize sports overlay

## Root Cause: Overlay Architecture

The current approach has TWO separate SVG layers:
1. **`MatchupBox`** function in `bracket-diagram.tsx` — renders background rect, winner highlights, click handlers, checkmarks, vote counts, AND entrant names/logos
2. **`SportsMatchupOverlay`** in `sports-matchup-box.tsx` — renders team logos, tournament seeds, scores, game times ON TOP of MatchupBox

When `isSports=true`, we hide MatchupBox's text via `<g style={isSports ? {display:'none'} : undefined}>`. But this also hides the click handlers and vote indicators that are inside that `<g>` group.

## Recommended Fix: Merge Sports Rendering Into MatchupBox

Instead of overlay, make `MatchupBox` natively support sports mode:

When `isSports` is true in `MatchupBox`:
- **Replace entrant name text** with: `{tournamentSeed} {name}` + team logo image
- **Replace "TBD" text** with game start time from matchup data
- **Add score display** next to team names when `homeScore`/`awayScore` exist
- **Keep ALL prediction infrastructure intact**: click rects, vote highlights, checkmarks, cascade augmented entrants

Then **remove `SportsMatchupOverlay` entirely** — no more overlay layer.

## Key Files

| File | Role | Change Needed |
|------|------|---------------|
| `src/components/bracket/bracket-diagram.tsx` | MatchupBox function (~line 135-496) | Add `isSports` rendering path inside standard flow |
| `src/components/bracket/sports-matchup-box.tsx` | SportsMatchupOverlay + SportsEntrantRow | **Delete or reduce to helper functions only** |
| `src/components/bracket/region-bracket-view.tsx` | Region computation + rendering | Pass matchup game data (gameStatus, homeScore, awayScore, gameStartTime) through |
| `src/components/teacher/live-dashboard.tsx` | Teacher live view | Already passes `isSports` — should work once MatchupBox handles it |
| `src/components/bracket/predictive-bracket.tsx` | PredictiveDiagram wrapper | Already passes `isSports` to all 10 call sites |
| `src/lib/bracket/types.ts` | MatchupData type | Already has externalGameId, homeScore, awayScore, gameStatus, gameStartTime |

## MatchupBox Data Available (MatchupData type)

The matchup data already has everything needed for sports rendering:
```typescript
interface MatchupData {
  // Standard fields
  entrant1: { name, seedPosition, logoUrl, abbreviation, tournamentSeed, externalTeamId } | null
  entrant2: { ... } | null
  winnerId, status, round, position

  // Sports fields (already on the type)
  externalGameId: number | null
  homeScore: number | null
  awayScore: number | null
  gameStatus: string | null    // 'scheduled' | 'in_progress' | 'final'
  gameStartTime: string | null // ISO datetime
}
```

## Implementation Approach

### Step 1: Modify MatchupBox entrant name rendering
When `isSports && entrant.tournamentSeed`:
- Show logo (14x14 image) + `"{seed} {name}"` instead of `"{seedPosition}. {name}"`
- Use `entrant.tournamentSeed` (1-16) not `entrant.seedPosition` (auto-increment)
- Combined play-in entries have `tournamentSeed` and no logo — show abbreviation + seed

### Step 2: Add game time/score display
When `isSports && matchup.gameStartTime`:
- Show formatted game time in the top-right of the matchup box
- When `gameStatus === 'in_progress'`: show live score
- When `gameStatus === 'final'`: show final score

### Step 3: Remove SportsMatchupOverlay rendering
In `BracketDiagram` component (~line 700):
```tsx
{/* Delete this entire block */}
{isSports && positionedMatchups.map(({ matchup, pos }) => (
  <SportsMatchupOverlay ... />
))}
```

### Step 4: Remove the `display: none` wrapper
The `<g style={isSports ? {display:'none'} : undefined}>` wrapper around text is no longer needed since sports text renders in the standard flow.

### Step 5: Test prediction flow end-to-end
- Click entrant → selection highlights (green background)
- Checkmark appears on selected entrant
- Winner cascades to next round matchup
- All 32 R1 matchups clickable (including combined play-in)
- R2 → R6 cascade works when all picks made

## Quick Tasks Completed Today (37-41)
- 37: Detect incomplete NCAA bracket data
- 38: Add auto-polling for live scores (60s)
- 39: Build ESPN provider (full end-to-end)
- 40: Fix matchup ordering + tournamentSeed display
- 41: Combined play-in entrants for First Four

Plus ~10 hotfix commits for: import failures, stack overflow, activation validation, seed uniqueness, region grouping, prediction routing, double text, click handlers.
