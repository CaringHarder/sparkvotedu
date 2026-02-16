---
phase: 07-advanced-brackets
plan: 28
subsystem: bracket-ui
tags: [de-celebration, hydration-fix, round-robin, loading-state]
depends_on:
  requires: [07-25, 07-22, 07-26]
  provides: [de-celebration-race-fix, rr-nested-button-fix, batch-decide-loading]
  affects: [07-29, 07-30, 07-31]
tech-stack:
  added: []
  patterns: [sibling-button-layout, ref-double-check-pattern]
key-files:
  created: []
  modified:
    - src/components/teacher/live-dashboard.tsx
    - src/components/bracket/round-robin-matchups.tsx
decisions:
  - id: 07-28-01
    description: "Inner ref check inside setTimeout for fallback celebration prevents race with chained reveal path"
  - id: 07-28-02
    description: "Sibling button layout (flex div wrapping collapse button + batch decide button) eliminates nested button hydration error"
metrics:
  duration: ~2m
  completed: 2026-02-02
---

# Phase 7 Plan 28: Fix R5 Residual Issues (DE Celebration, Nested Button, Loading State) Summary

**One-liner:** Double-check ref inside fallback setTimeout prevents duplicate DE celebration; sibling flex layout eliminates nested button hydration error; batch decide gets disabled/loading state via isBatchDeciding prop pass-through.

## What Was Done

### Task 1: Fix DE duplicate celebration + pass isPending to RR matchups
- Added inner `hasShownRevealRef.current` check inside the fallback celebration `setTimeout` callback (line ~312)
- The outer effect condition checks the ref at effect evaluation time, but the setTimeout fires 2s later -- by then the chained celebration path may have already set the ref
- The inner check at T+2s sees `hasShownRevealRef.current === true` and skips the duplicate
- Added `isBatchDeciding={isPending}` prop to the `<RoundRobinMatchups>` JSX in the RR rendering section

### Task 2: Fix nested button + add loading state in RR matchups
- Added `isBatchDeciding?: boolean` to `RoundRobinMatchupsProps` interface
- Restructured round header from single wrapping `<button>` to a flex `<div>` with sibling elements:
  - Collapse/expand `<button>` with flex-1 (takes remaining space)
  - Complete badge `<span>` (conditional)
  - Batch decide `<button>` (conditional, no longer nested)
- Added `disabled={isBatchDeciding}` and text swap (`'Deciding...'` / `'Close All & Decide by Votes'`)
- Added `disabled:cursor-not-allowed disabled:opacity-50` for visual disabled feedback
- Removed `e.stopPropagation()` (no longer needed since buttons are siblings, not parent/child)

## Verification Results

1. `npx tsc --noEmit` -- passes with zero errors
2. No nested `<button>` elements in round-robin-matchups.tsx -- collapse button and batch decide are siblings in flex div
3. Fallback celebration effect has inner `hasShownRevealRef.current` check inside setTimeout at line 312
4. `isBatchDeciding={isPending}` passed from live-dashboard to RoundRobinMatchups at line 1019
5. Batch decide button has `disabled={isBatchDeciding}` and loading text swap

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8d227b0 | fix(07-28): fix DE duplicate celebration + pass isBatchDeciding to RR matchups |
| 2 | a9210fa | fix(07-28): fix nested button hydration error + add batch decide loading state |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

Plans 29-32 can proceed. These three R5 residual issues are resolved:
- DE teacher page fires exactly one celebration sequence
- RR matchup grid produces valid HTML (no nested buttons, no hydration errors)
- Batch decide button provides loading/disabled feedback during operation
