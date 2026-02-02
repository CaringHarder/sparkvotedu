---
phase: 07-advanced-brackets
plan: 23
subsystem: predictive-brackets
tags: [predictive, activation, activities-api, student-visibility, broadcast]
completed: 2026-02-02
duration: ~1.4m
dependency_graph:
  requires: [07-11, 07-14, 07-16]
  provides: [predictive-bracket-student-visibility, auto-activation-on-predictions-open]
  affects: [07-24]
tech_stack:
  added: []
  patterns:
    - Auto-activate bracket on prediction lifecycle transition
    - OR-based query for backward-compatible activity inclusion
    - Activity broadcast on prediction status change
key_files:
  created: []
  modified:
    - src/lib/dal/prediction.ts
    - src/app/api/sessions/[sessionId]/activities/route.ts
decisions:
  - id: 07-23-01
    description: "Auto-activate predictive brackets to 'active' status when predictions opened (Option A from R3 verification)"
  - id: 07-23-02
    description: "OR condition in activities API includes predictionStatus:'predictions_open' as safety net for pre-fix brackets"
  - id: 07-23-03
    description: "broadcastActivityUpdate on session channel when predictions open for real-time student page refresh"
metrics:
  tasks_completed: 2
  tasks_total: 2
  deviations: 0
---

# Phase 7 Plan 23: Predictive Bracket Visibility (GAP-R3-03) Summary

Auto-activate predictive brackets when predictions opened, making them visible in student session activity list via dual-layer fix (DAL status + API query fallback).

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Auto-activate predictive brackets when predictions opened | 1fb1915 | prediction.ts: set status='active' on predictions_open, broadcast activity_update |
| 2 | Include predictive brackets in session activities API | c2e0df6 | activities/route.ts: OR condition for predictionStatus, added bracketType/predictionStatus fields |

## Changes Made

### Task 1: Auto-activate on Predictions Open

In `updatePredictionStatusDAL`, added `updateData.status = 'active'` when transitioning to `predictions_open`. This is the primary fix -- predictive brackets now become `active` the moment teachers open predictions, matching the activities API filter (`status: { in: ['active', 'completed'] }`).

Also added `broadcastActivityUpdate(bracket.sessionId)` call when predictions open, triggering the student session page's `useRealtimeActivities` hook to refetch and display the newly-visible bracket.

### Task 2: Activities API Safety Net

Added an OR condition to the bracket query: brackets are included if `status in ['active', 'completed']` OR `predictionStatus === 'predictions_open'`. This handles edge cases where brackets were opened before the auto-activate fix was deployed.

Added `bracketType` and `predictionStatus` to the select clause and response mapping, giving the student UI the information needed to detect predictive brackets and route to the prediction UI.

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **[07-23-01] Auto-activate on predictions_open (Option A):** Setting bracket status to `active` when predictions open is the cleanest fix. The `predictionStatus` field independently controls the prediction lifecycle, so both dimensions remain orthogonal.

2. **[07-23-02] OR fallback in activities API:** Safety measure for backward compatibility with any brackets opened before the fix. Minimal cost (one extra OR condition in the Prisma query), prevents invisible bracket edge cases.

3. **[07-23-03] Activity broadcast on predictions_open:** Uses existing `broadcastActivityUpdate` helper (already available in broadcast.ts). Non-blocking `.catch(console.error)` pattern matches all other broadcast calls.

## Verification

- `npx tsc --noEmit` passes with zero errors
- Predictive brackets auto-activate to `active` when predictions opened
- Activities API includes predictive brackets via both primary (status=active) and fallback (predictionStatus=predictions_open) paths
- Student bracket page handles `active + predictions_open` correctly (routes to PredictiveBracket component)
- Existing `draft + predictions_open` path in student page preserved as backward compatibility
- Non-predictive brackets completely unaffected (OR condition only adds, never removes)
- Prediction lifecycle transitions (predictions_open -> active -> completed) still work correctly

## Next Phase Readiness

GAP-R3-03 is resolved. Remaining R3 gaps:
- GAP-R3-01: DE live dashboard not DE-aware (07-21)
- GAP-R3-02: RR vote counts + round advancement (07-22)
- GAP-R3-04: Large bracket navigation UX redesign (07-24)
