---
phase: 07-advanced-brackets
plan: 34
subsystem: bracket-rendering
tags: [quadrant-layout, 64-entrant, fallback, teacher-views]
depends_on:
  requires: [07-31, 07-32]
  provides: ["Consistent bracket.size fallback for 64+ detection across all teacher views"]
  affects: []
tech-stack:
  added: []
  patterns: ["bracket.size fallback for maxEntrants null safety"]
key-files:
  created: []
  modified:
    - src/components/teacher/live-dashboard.tsx
    - src/components/bracket/bracket-detail.tsx
decisions:
  - id: "07-34-fallback"
    decision: "Use bracket.size (always present) instead of 0 or entrants.length as fallback for maxEntrants"
    reasoning: "bracket.size is always populated on the model; maxEntrants can be null; entrants array may not be fully loaded"
metrics:
  duration: "~0.8 min"
  completed: "2026-02-08"
---

# Phase 7 Plan 34: Fix Teacher Page 64-Entrant Quadrant Layout Summary

**One-liner:** Fix `?? 0` and `?? entrants.length` fallbacks to `?? bracket.size` for reliable 64-entrant QuadrantBracketLayout rendering on teacher pages.

## Performance

- Duration: ~0.8 min
- Tasks: 2/2 completed
- Deviations: None

## Accomplishments

1. Fixed live-dashboard.tsx 64+ detection from `(bracket.maxEntrants ?? 0)` to `(bracket.maxEntrants ?? bracket.size)` -- the `?? 0` fallback always evaluated to false for 64+ check when maxEntrants was null
2. Updated bracket-detail.tsx 64+ detection from `(bracket.maxEntrants ?? bracket.entrants.length)` to `(bracket.maxEntrants ?? bracket.size)` -- consistent fallback pattern, bracket.size is always present
3. Updated bracketSize prop in both files to use the same `bracket.size` fallback

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix 64+ detection fallback in live-dashboard.tsx | 126523b | live-dashboard.tsx |
| 2 | Fix 64+ detection fallback in bracket-detail.tsx | 3012a38 | bracket-detail.tsx |

## Files Modified

- `src/components/teacher/live-dashboard.tsx` -- 2 lines changed (conditional + prop)
- `src/components/bracket/bracket-detail.tsx` -- 2 lines changed (conditional + prop)

## Decisions Made

| ID | Decision | Reasoning |
|----|----------|-----------|
| 07-34-fallback | Use `bracket.size` as universal fallback for maxEntrants | bracket.size is always populated; maxEntrants can be null; entrants.length may not be loaded |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues / Risks

None. All teacher views now use consistent `bracket.maxEntrants ?? bracket.size` pattern, matching student views.

## Verification Results

- TypeScript compilation: PASS (no errors)
- No remaining `?? 0` patterns for maxEntrants in codebase
- Consistent `bracket.maxEntrants ?? bracket.size` pattern across all views (teacher live, teacher detail, student advanced, predictions, double-elim)

## Next Phase Readiness

- Gap closure plan 34 complete
- All 64-entrant bracket rendering is now consistent across teacher and student views
