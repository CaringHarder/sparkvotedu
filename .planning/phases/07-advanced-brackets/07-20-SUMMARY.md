# Phase 7 Plan 20: Zoom Controls & Entrant Click Fix Summary

**One-liner:** stopPropagation on interactive children prevents usePanZoom pointer capture from stealing clicks on zoom buttons and SVG entrant rects

## Plan Info

- **Phase:** 07-advanced-brackets
- **Plan:** 20 (gap closure R2)
- **Type:** execute
- **Duration:** ~1 min
- **Completed:** 2026-02-02

## What Was Done

### Task 1: Add stopPropagation to zoom buttons and entrant click rects

Fixed the root cause of zoom control and entrant click failures in large bracket views: the `usePanZoom` hook's `handlePointerDown` calls `setPointerCapture` on every pointerdown event within the container. This redirects all subsequent pointer events to the container element, preventing the browser from synthesizing `click` events on child elements (zoom buttons, SVG entrant rects).

**Fix approach:** Add `onPointerDown={(e) => e.stopPropagation()}` to interactive child elements so the pointerdown event never reaches the container's native event listener where `setPointerCapture` is called.

**Changes:**

1. **bracket-zoom-wrapper.tsx** -- Added `onPointerDown` stopPropagation to the floating controls container div. This single handler covers all three zoom buttons (zoom in, zoom out, fit-to-screen) since they are children of this div.

2. **bracket-diagram.tsx** -- Added `onPointerDown` stopPropagation to:
   - Top entrant clickable rect (student voting)
   - Bottom entrant clickable rect (student voting)
   - Matchup box rect (teacher matchup click, conditional on `onMatchupClick` prop)

3. **use-pan-zoom.ts** -- NOT modified. The hook's `setPointerCapture` design is correct for reliable drag-to-pan behavior. The fix belongs at the child element level.

**Commit:** a77dde2

## Files Modified

| File | Change |
|------|--------|
| `src/components/bracket/bracket-zoom-wrapper.tsx` | Added onPointerDown stopPropagation to floating controls div |
| `src/components/bracket/bracket-diagram.tsx` | Added onPointerDown stopPropagation to 3 clickable SVG elements |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Fix at child level, not hook level | setPointerCapture is essential for reliable drag-to-pan; children opt out via stopPropagation |
| Conditional stopPropagation on matchup rect | Only prevents propagation when onMatchupClick is provided (teacher view), preserving default panning on non-clickable matchup boxes |
| Single handler on controls div vs per-button | All 3 zoom buttons share a parent div; one handler covers all |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Teacher matchup click rect also affected**

- **Found during:** Task 1
- **Issue:** The matchup box `<rect>` with `onMatchupClick` handler (teacher view) was also subject to pointer capture theft, but not mentioned in the plan
- **Fix:** Added conditional `onPointerDown` stopPropagation to the matchup box rect
- **Files modified:** `src/components/bracket/bracket-diagram.tsx`
- **Commit:** a77dde2

## Verification

- [x] `npx tsc --noEmit` passes with no errors
- [x] bracket-zoom-wrapper.tsx floating controls div has `onPointerDown={(e) => e.stopPropagation()}`
- [x] bracket-diagram.tsx top entrant rect has `onPointerDown={(e) => e.stopPropagation()}`
- [x] bracket-diagram.tsx bottom entrant rect has `onPointerDown={(e) => e.stopPropagation()}`
- [x] use-pan-zoom.ts is NOT modified (unchanged)
