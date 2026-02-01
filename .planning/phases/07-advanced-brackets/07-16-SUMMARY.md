---
phase: 07-advanced-brackets
plan: 16
subsystem: bracket-creation-lifecycle
tags: [prisma, transaction-timeout, predictive-brackets, lifecycle-controls, bug-fix]
depends_on:
  requires: [07-01, 07-03, 07-06, 07-07, 07-08, 07-11]
  provides: [large-bracket-creation, predictive-lifecycle-fix, error-logging]
  affects: [07-UAT]
tech_stack:
  added: []
  patterns: [prisma-transaction-timeout-override, bracketType-conditional-rendering]
key_files:
  created: []
  modified:
    - src/lib/dal/bracket.ts
    - src/actions/bracket.ts
    - src/components/bracket/bracket-status.tsx
    - src/components/bracket/bracket-detail.tsx
decisions:
  - id: 07-16-timeout
    description: "30s transaction timeout for large bracket creation (not batching optimization)"
    rationale: "Minimal fix to unblock UAT; batching optimization deferred to future performance pass"
  - id: 07-16-activate-hide
    description: "Hide Activate button for predictive brackets, keep Complete and Delete"
    rationale: "Predictive lifecycle manages activation via Open/Close/Start flow; Complete is still valid for all types"
metrics:
  duration: ~2m
  completed: 2026-02-01
---

# Phase 7 Plan 16: Large Bracket Timeout + Predictive Lifecycle Fix Summary

**Transaction timeout override for 32/64 entrant brackets; bracketType-aware lifecycle controls**

## What Was Done

### Task 1: Fix large bracket creation timeout
- Added `{ timeout: 30000 }` to the `prisma.$transaction()` call in `createBracketDAL` (SE/predictive brackets)
- Added same 30s timeout to `createDoubleElimBracketDAL` (DE brackets with WB+LB+GF regions)
- Changed catch block in `createBracket` action from `catch {` to `catch (err) { console.error('createBracket failed:', err) }` for server-side debugging

### Task 2: Hide generic lifecycle buttons for predictive brackets
- Added optional `bracketType` prop to `LifecycleControlsProps` interface
- Gated the "Activate" button on `bracketType !== 'predictive'` so it only appears for SE, DE, and round-robin brackets
- Passed `bracket.bracketType` from `bracket-detail.tsx` to `BracketLifecycleControls`
- "Complete" and "Delete" buttons remain visible for all bracket types

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 30s timeout (not createMany batching) | Minimal-risk fix to unblock UAT test 16; batching is a future performance optimization |
| Hide only Activate for predictive | Complete is valid for all types; Delete is always needed; only Activate conflicts with prediction lifecycle |
| Optional bracketType prop | Backward compatible -- existing callers without bracketType see all buttons (no breaking change) |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` -- zero type errors (both tasks)
- `npx vitest run` -- 275/275 tests pass, zero regressions (both tasks)
- Manual verification deferred to UAT re-run

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 78cc21a | fix(07-16): add 30s transaction timeout for large bracket creation |
| 2 | f3a101a | fix(07-16): hide generic Activate button for predictive brackets |

## Next Phase Readiness

- UAT test 16 (32/64 bracket creation) should now pass with the timeout override
- UAT test 12 (predictive lifecycle competing buttons) is partially addressed -- the Activate button no longer competes with prediction lifecycle controls
- Remaining predictive lifecycle issues (student-side rendering, state API fields) require plan 15
