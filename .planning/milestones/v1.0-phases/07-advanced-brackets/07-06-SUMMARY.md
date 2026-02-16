---
phase: 07-advanced-brackets
plan: "06"
subsystem: bracket-creation-ui
tags: [bracket-form, type-selector, custom-sizing, pan-zoom, drag-and-drop, byes]
depends_on:
  requires: ["07-01"]
  provides: ["Updated bracket creation wizard with all bracket types, custom sizing, bye-aware DnD, pan/zoom infrastructure"]
  affects: ["07-07", "07-08", "07-09", "07-10"]
tech-stack:
  added: []
  patterns: ["usePanZoom CSS transform hook", "bye-aware entrant reordering", "2x2 type selector cards", "custom size input with preset fallback"]
key-files:
  created:
    - src/hooks/use-pan-zoom.ts
    - src/components/bracket/bracket-zoom-wrapper.tsx
  modified:
    - src/components/bracket/bracket-form.tsx
    - src/components/bracket/entrant-list.tsx
    - src/actions/bracket.ts
    - src/lib/dal/bracket.ts
decisions:
  - "Preset sizes [4,8,16,32,64] + Custom toggle with number input for arbitrary sizes 3-128"
  - "2x2 grid card layout for bracket type selector with tier badges as visual indicators"
  - "BYE badge computed via useMemo from calculateBracketSizeWithByes on each reorder"
  - "Pan/zoom uses CSS transforms with useRef-based event listeners for zero re-renders during drag"
metrics:
  duration: "~4.8m"
  completed: "2026-02-01"
---

# Phase 7 Plan 6: Bracket Creation Wizard & Pan/Zoom Summary

**One-liner:** Multi-type bracket wizard with 4-type selector, custom sizing (3-128), bye-aware DnD, and CSS-transform pan/zoom infrastructure.

## What Was Done

### Task 1: Update bracket creation wizard with type selection, custom sizing, and bye-aware entrant reordering

Refactored bracket-form.tsx from a simple single-elimination wizard into a multi-type creation interface:

- **Type selector:** 4 cards in 2x2 grid -- Single Elimination (Trophy), Double Elimination (Swords, Pro+), Round Robin (Grid, Pro+), Predictive (Brain, Pro Plus). Badges are visual indicators only; server-side gating enforces access.
- **Size selector:** Preset buttons [4, 8, 16, 32, 64] plus "Custom" toggle revealing number input. Round-robin filters to max 8 with helper text. All types support 3-128 range.
- **Type-specific options:** Round-robin shows pacing (round-by-round/all-at-once), voting style (simple/advanced), standings mode (live/suspenseful). Predictive shows prediction mode (simple/advanced) and resolution mode (manual/vote-based). Double-elimination shows play-in toggle.
- **Bye awareness in Step 2:** Shows bye count note in header. EntrantList shows BYE badge on positions that receive first-round byes. Helper text shows "Entrants at positions 1-N will receive first-round byes."
- **Review step updated:** Shows type label, bye count, and type-specific options in summary.

Updated entrant-list.tsx:
- Added `bracketType` and `totalEntrants` props
- Bye seeds calculated via `calculateBracketSizeWithByes` from byes.ts
- Amber BYE badge rendered next to seed positions receiving byes
- Round-robin skips bye indicator (inherent in schedule)
- DnD reordering works for all bracket types (seed positions recalculated on drop)

**Deviation [Rule 3 - Blocking]:** Updated `createBracketDAL` data parameter to accept and persist `bracketType`, `roundRobinPacing`, `roundRobinVotingStyle`, `roundRobinStandingsMode`, `predictiveMode`, `predictiveResolutionMode`, and `playInEnabled` fields. Without this, the new form fields would be silently dropped.

**Deviation [Rule 1 - Bug]:** Cleaned up `bracket.ts` action -- replaced unsafe `(bracketData as Record<string, unknown>).bracketType` cast with proper Zod-parsed `bracketData.bracketType` field access.

### Task 2: Build pan/zoom hook and wrapper component

Created `usePanZoom` hook (`src/hooks/use-pan-zoom.ts`):
- Wheel zoom: deltaY direction controls zoom in/out (*1.1 / *0.9), clamped to configurable min/max (default 0.1-3x)
- Pointer drag: pointerdown/pointermove/pointerup with pointer capture for reliable tracking
- Touch pinch: two-finger distance tracking with proportional scale adjustment
- Programmatic controls: `zoomIn()` / `zoomOut()` (+/- 20%) and `resetZoom()` (return to initial state)
- Event listener cleanup in useEffect return
- Returns CSS transform string ready for inline style application

Created `BracketZoomWrapper` component (`src/components/bracket/bracket-zoom-wrapper.tsx`):
- Overflow-hidden container with CSS transform on inner div
- `transform-origin: 0 0` for predictable scaling behavior
- `touch-action: none` for proper touch gesture handling
- Floating zoom controls (bottom-right): ZoomIn, ZoomOut, zoom percentage display, and Fit-to-screen (Maximize) button
- Configurable via `options` prop for custom min/max scale, initial scale, and step

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened DAL data parameter for new bracket fields**
- **Found during:** Task 1
- **Issue:** `createBracketDAL` only accepted `name`, `description`, `size`, `sessionId` -- new bracket type and options fields would be silently dropped
- **Fix:** Extended data type to include all Phase 7 bracket fields and spread them into Prisma create call
- **Files modified:** src/lib/dal/bracket.ts
- **Commit:** 1e57099

**2. [Rule 1 - Bug] Fixed unsafe bracketType cast in action**
- **Found during:** Task 1
- **Issue:** Action used `(bracketData as Record<string, unknown>).bracketType` -- unsafe cast bypassing Zod type safety
- **Fix:** Changed to `bracketData.bracketType` which is properly typed from Zod parse
- **Files modified:** src/actions/bracket.ts
- **Commit:** 1e57099

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Preset sizes [4,8,16,32,64] + Custom input | Covers common tournament sizes while allowing arbitrary 3-128 for flexibility |
| 2x2 card grid for type selector | Gives each type visual weight with icon + description; badges indicate tier requirement |
| BYE badge via useMemo recalculation | Automatically updates on DnD reorder since seedPositions change; no manual recalculation needed |
| CSS transform-based pan/zoom | Zero-dependency, works with any child content (SVG or DOM), GPU-accelerated via will-change |
| useRef for drag/pinch state | Prevents unnecessary re-renders during continuous pointer/touch events |

## Next Phase Readiness

Plan 07-07 (Bracket Wiring) can now:
- Wire the updated bracket form to the full bye engine for round-1 matchup generation
- Use BracketZoomWrapper to wrap bracket diagrams for large brackets (32+/64)
- Build on the type-specific options stored in the database

No blockers or concerns for downstream plans.
